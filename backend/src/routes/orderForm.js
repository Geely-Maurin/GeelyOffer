import express from 'express';
import PDFDocument from 'pdfkit';
import { getAsync, allAsync } from '../database/init.js';
import { formatPrice } from '../utils/pricing.js';
import { requireAuth, blockPendingPasswordChange } from '../middleware/auth.js';
import { formatQuoteNumber } from '../utils/quoteNumber.js';
import { loadQuoteForPdf, registerFonts, resolveExteriorImagePath, LOGO_PATH, LOGO_ASPECT, SELLER_COMPANY } from './pdf.js';
import { BLOCKING_APPROVAL_STATUSES } from './quotes.js';
import { ORDER_FORM_TEXT_NL, STANDARD_UPHOLSTERY } from '../data/orderFormText.js';
import { ORDER_FORM_TEXT_FR } from '../data/orderFormText.fr.js';
import { LOCALE, resolveLang, translateAccessoryName, translateFuel, powerUnit, DELIVERY_PACK_NAME, deliveryPackContents } from '../i18n/translate.js';

// The bestelbon: the dealership's paper order form (contract) for a quote the customer
// has said yes to — same branch letterhead, model/options/totals/trade-in blocks and full
// legal text as the paper templates, drawn in the offer PDF's visual style. All wording
// lives in data/orderFormText.js (Dutch) and data/orderFormText.fr.js (French); the
// quote's language picks one, as for the offer. The seller (name + VAT number) is
// SELLER_COMPANY, shared with the offer PDF.
const ORDER_FORM_TEXT = { nl: ORDER_FORM_TEXT_NL, fr: ORDER_FORM_TEXT_FR };

// A4, unlike the offer's US Letter: this one is printed and signed on paper in Belgium.
const PAGE_LEFT = 40;
const PAGE_RIGHT = 555;
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_LEFT;
const CONTENT_TOP = 108;
const CONTENT_BOTTOM = 790;
const FOOTER_Y = 808;

const NAVY = '#1F4E78';
const INK = '#0F0F0F';
const BODY = '#333';
const MUTED = '#666';
const SOFT = '#999';
const PANEL = '#F6F7F9';
const PANEL_BORDER = '#E5E7EB';
const RULE = '#DADFE5';
const BLANK_LINE = '#9AA3AD';

const PAINT_PREFIXES = ['Metallic:', 'Standaardlak:', 'Standaardkleur:'];
const UPHOLSTERY_PREFIX = 'Bekleding:';

const router = express.Router();

// ------------------------------------------------------------------ drawing primitives
//
// Every line of text is placed with lineBreak: false and no width, so pdfkit never wraps
// or paginates on its own — wrapText() below decides the line breaks and the Flow decides
// the page breaks, which keeps every y position on these pages known exactly.

// Inter's kerning tucks a full stop right under a neighbouring 1 or 7, so article numbers
// like "7.1., 7.2." would read as "71., 72.". Words with a digit next to a full stop or
// comma are therefore set without kerning. Only those: turning kerning off disables
// pdfkit's per-word layout cache, which made the whole document take seconds. pdfkit
// lays a line out word by word anyway (never kerning across a space), so splitting a line
// into runs at spaces draws exactly the same text at exactly the same width.
const UNKERNED_WORD = /\d[.,]|[.,]\d/;
const NO_KERNING = { kern: false };

function wordRuns(text) {
  const runs = [];
  text.split(' ').forEach((word) => {
    const unkerned = UNKERNED_WORD.test(word);
    const last = runs[runs.length - 1];
    if (last && last.unkerned === unkerned) last.text += ` ${word}`;
    else runs.push({ text: word, unkerned });
  });
  return runs;
}

function runWidth(doc, run, spacing) {
  return doc.widthOfString(run.text, { characterSpacing: spacing, features: run.unkerned ? NO_KERNING : undefined });
}

function textWidth(doc, text, { font = 'Inter', size = 9, spacing = 0 } = {}) {
  doc.font(font).fontSize(size);
  if (!UNKERNED_WORD.test(text)) return doc.widthOfString(text, { characterSpacing: spacing });
  const gap = doc.widthOfString(' ') + spacing * 2;
  return wordRuns(text).reduce((sum, run, i) => sum + (i > 0 ? gap : 0) + runWidth(doc, run, spacing), 0);
}

// Draws one line of text at (x, y) and returns its width.
function put(doc, text, x, y, { font = 'Inter', size = 9, color = INK, spacing = 0 } = {}) {
  doc.font(font).fontSize(size).fillColor(color);
  if (!UNKERNED_WORD.test(text)) {
    doc.text(text, x, y, { lineBreak: false, characterSpacing: spacing });
    return doc.widthOfString(text, { characterSpacing: spacing });
  }
  const gap = doc.widthOfString(' ') + spacing * 2;
  let cursor = x;
  wordRuns(text).forEach((run, i) => {
    if (i > 0) cursor += gap;
    doc.text(run.text, cursor, y, { lineBreak: false, characterSpacing: spacing, features: run.unkerned ? NO_KERNING : undefined });
    cursor += runWidth(doc, run, spacing);
  });
  return cursor - x;
}

function putRight(doc, text, rightX, y, style = {}) {
  put(doc, text, rightX - textWidth(doc, text, style), y, style);
}

// Largest size (down to 6.5pt) at which a single line still fits — for customer data of
// unknown length (a long e-mail address) in a fixed-width cell.
function fitSize(doc, text, maxWidth, { font = 'Inter', size = 9, spacing = 0 } = {}) {
  let fitted = size;
  while (fitted > 6.5 && textWidth(doc, text, { font, size: fitted, spacing }) > maxWidth) fitted -= 0.25;
  return fitted;
}

// Dotted fill-in line ("…………" on the paper form), drawn at y.
function blankLine(doc, x, y, width) {
  if (width <= 0) return;
  doc.save().lineWidth(0.7).dash(1, { space: 2 }).moveTo(x, y).lineTo(x + width, y).stroke(BLANK_LINE).restore();
}

function tickBox(doc, x, y, size = 8) {
  doc.save().lineWidth(0.8).rect(x, y, size, size).stroke(INK).restore();
}

function tickCircle(doc, cx, cy, r = 3.3) {
  doc.save().lineWidth(0.8).circle(cx, cy, r).stroke(INK).restore();
}

function panel(doc, x, y, width, height, { fill = PANEL, stroke = PANEL_BORDER, radius = 8 } = {}) {
  doc.save().lineWidth(1).roundedRect(x, y, width, height, radius).fillAndStroke(fill, stroke).restore();
}

function kicker(doc, text, x, y, { color = NAVY, size = 9 } = {}) {
  put(doc, text.toUpperCase(), x, y, { font: 'Inter-Bold', size, color, spacing: 1 });
}

// Greedy word wrap. A single word wider than the line is kept whole (it just runs long)
// rather than being split mid-word. "15 %", "§ 1" and the French spaced punctuation
// ("contact :", « … ») are never split across two lines. A line is as wide as its words
// plus its spaces (pdfkit never kerns across a space), so each word is measured once
// instead of re-measuring every candidate line.
function wrapText(doc, text, width, { font = 'Inter', size = 8 } = {}) {
  const words = String(text)
    .replace(/ ([%:;!?»])/g, ' $1')
    .replace(/([§«]) /g, '$1 ')
    // A circle-one choice ("ja – neen", "oui – non") stays on one line.
    .replace(/(^|\s)(\S{1,4}) – (\S{1,5})(?=\s|$)/g, '$1$2 – $3')
    .split(/[ \t\n]+/)
    .filter(Boolean);
  const space = textWidth(doc, ' ', { font, size });
  const lines = [];
  let line = '';
  let lineWidth = 0;
  for (const word of words) {
    const wordWidth = textWidth(doc, word, { font, size });
    if (!line) {
      line = word;
      lineWidth = wordWidth;
    } else if (lineWidth + space + wordWidth <= width) {
      line = `${line} ${word}`;
      lineWidth += space + wordWidth;
    } else {
      lines.push(line);
      line = word;
      lineWidth = wordWidth;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ------------------------------------------------------------------ page flow

function drawPageHeader(doc, title, subtitle) {
  const logoWidth = 70;
  doc.image(LOGO_PATH, PAGE_RIGHT - logoWidth, 40, { width: logoWidth });
  put(doc, title, PAGE_LEFT, 40, { font: 'Inter-Bold', size: 18, color: NAVY });
  put(doc, subtitle, PAGE_LEFT, 66, { size: 10, color: MUTED });
  doc.save().lineWidth(1).moveTo(PAGE_LEFT, 88).lineTo(PAGE_RIGHT, 88).stroke(NAVY).restore();
}

// Tracks where the next block goes: which page, which column, how far down. Blocks call
// ensure(height) before drawing something that must not be split, and the flow moves to
// the next column / a fresh page (with the continuation header) when it doesn't fit.
function createFlow(doc, { title, subtitle }) {
  return {
    title,
    subtitle,
    columns: 1,
    column: 0,
    gap: 22,
    y: CONTENT_TOP,
    get width() { return (CONTENT_WIDTH - (this.columns - 1) * this.gap) / this.columns; },
    get x() { return PAGE_LEFT + this.column * (this.width + this.gap); },
    get atTop() { return this.y <= CONTENT_TOP; },
    newPage({ title: nextTitle, columns } = {}) {
      if (nextTitle) this.title = nextTitle;
      if (columns) this.columns = columns;
      doc.addPage();
      drawPageHeader(doc, this.title, this.subtitle);
      this.column = 0;
      this.y = CONTENT_TOP;
    },
    nextColumn() {
      if (this.column < this.columns - 1) {
        this.column += 1;
        this.y = CONTENT_TOP;
      } else {
        this.newPage();
      }
    },
    // A block taller than a whole column can't be helped by moving it — it's drawn where
    // it is instead of looping. None of this document's blocks come close to that.
    ensure(height) {
      if (this.y + height > CONTENT_BOTTOM && !this.atTop) this.nextColumn();
    },
  };
}

// ------------------------------------------------------------------ running text

function bodyStyle(size) {
  return { size, leading: size * 1.38, after: size * 0.6 };
}

function drawMarker(doc, marker, x, y, style) {
  if (marker.kind === 'number') {
    put(doc, marker.label, x, y, { font: style.font, size: style.size, color: style.color });
  } else if (marker.kind === 'bullet') {
    doc.save().circle(x + 2.5, y + style.size * 0.62, 1.5).fill(NAVY).restore();
  } else if (marker.kind === 'ring') {
    doc.save().lineWidth(0.8).circle(x + 3, y + style.size * 0.62, 2.4).stroke(NAVY).restore();
  }
}

function paragraph(doc, flow, text, {
  size = 8, font = 'Inter', color = BODY, marker = null, after, align = 'left',
} = {}) {
  const { leading, after: defaultAfter } = bodyStyle(size);
  const markerWidth = marker ? (marker.kind === 'number' ? 14 : 12) : 0;
  const lines = wrapText(doc, text, flow.width - markerWidth, { font, size });
  // No single orphaned first line at the foot of a column, and a short lead-in ending in
  // ":" stays with the start of the list or text it introduces.
  const introducesNext = /:$/.test(text.trim()) && lines.length <= 3;
  flow.ensure(introducesNext ? (lines.length + 2) * leading : Math.min(lines.length, 2) * leading);
  lines.forEach((line, i) => {
    flow.ensure(leading);
    const x = flow.x + markerWidth;
    if (i === 0 && marker) drawMarker(doc, marker, flow.x, flow.y, { font, size, color });
    if (align === 'center') {
      put(doc, line, flow.x + (flow.width - textWidth(doc, line, { font, size })) / 2, flow.y, { font, size, color });
    } else {
      put(doc, line, x, flow.y, { font, size, color });
    }
    flow.y += leading;
  });
  flow.y += after ?? defaultAfter;
}

function heading(doc, flow, text, { size, before, after, keepWith }) {
  const leading = size * 1.3;
  const lines = wrapText(doc, text, flow.width, { font: 'Inter-Bold', size });
  if (!flow.atTop) flow.y += before;
  flow.ensure(lines.length * leading + after + keepWith);
  lines.forEach((line) => {
    put(doc, line, flow.x, flow.y, { font: 'Inter-Bold', size, color: NAVY });
    flow.y += leading;
  });
  flow.y += after;
}

// Bordered box kept whole on one page (the two framed notices on the paper form).
function framedText(doc, flow, paragraphs, size) {
  const { leading } = bodyStyle(size);
  const padding = 12;
  const paragraphGap = size * 0.8;
  const wrapped = paragraphs.map((text) => wrapText(doc, text, flow.width - padding * 2, { size }));
  const height = padding * 2 + wrapped.reduce((sum, lines) => sum + lines.length * leading, 0)
    + paragraphGap * (wrapped.length - 1) - (leading - size * 1.2);
  if (!flow.atTop) flow.y += 4;
  flow.ensure(height);
  panel(doc, flow.x, flow.y, flow.width, height);
  let y = flow.y + padding;
  wrapped.forEach((lines, i) => {
    lines.forEach((line) => {
      put(doc, line, flow.x + padding, y, { size, color: BODY });
      y += leading;
    });
    if (i < wrapped.length - 1) y += paragraphGap;
  });
  flow.y += height + 12;
}

// Lays out one line of text pieces and fill-in blanks ("Aldus opgemaakt te ……… op ………"),
// sharing the leftover width between the blanks by their weights.
function fillInLine(doc, x, y, width, parts, { size = 8.5, font = 'Inter', color = INK } = {}) {
  const gap = 5;
  const texts = parts.filter((part) => typeof part === 'string');
  const blanks = parts.filter((part) => typeof part !== 'string');
  const used = texts.reduce((sum, text) => sum + textWidth(doc, text, { font, size }), 0) + gap * (parts.length - 1);
  const free = Math.max(0, width - used);
  const totalWeight = blanks.reduce((sum, blank) => sum + blank.weight, 0) || 1;
  let cursor = x;
  parts.forEach((part) => {
    if (typeof part === 'string') {
      cursor += put(doc, part, cursor, y, { font, size, color });
    } else {
      const blankWidth = free * (part.weight / totalWeight);
      blankLine(doc, cursor, y + size + 1, blankWidth);
      cursor += blankWidth;
    }
    cursor += gap;
  });
}

const fill = (weight = 1) => ({ weight });

// ------------------------------------------------------------------ quote → document data

function classifyItems(items, categoryByName) {
  let color = null;
  let upholstery = null;
  let deliveryPack = null;
  const options = [];
  for (const item of items) {
    const category = categoryByName.get(item.itemName);
    if (!color && (category === 'exterior' || PAINT_PREFIXES.some((prefix) => item.itemName.startsWith(prefix)))) {
      color = item;
    } else if (!upholstery && (category === 'interior' || item.itemName.startsWith(UPHOLSTERY_PREFIX))) {
      upholstery = item;
    } else if (!deliveryPack && item.itemName === DELIVERY_PACK_NAME) {
      deliveryPack = item;
    } else {
      options.push(item);
    }
  }
  return { color, upholstery, deliveryPack, options };
}

function itemLabel(item, lang) {
  const name = translateAccessoryName(item.itemName, lang);
  return item.quantity > 1 ? `${item.quantity} × ${name}` : name;
}

function modelLines(vehicle, t, lang) {
  const known = t.modelLines[vehicle.name];
  const trimKey = known && Object.keys(known.trims).find((key) => key.toLowerCase() === String(vehicle.model).trim().toLowerCase());
  if (known && trimKey) return [known.title, known.drivetrain, known.trims[trimKey]];
  // A model/trim added later in Beheer → Voertuigen: build the same three lines from its data.
  let specs = {};
  try { specs = JSON.parse(vehicle.specifications || '{}'); } catch { /* keep empty */ }
  const title = (/^geely\b/i.test(vehicle.name) ? vehicle.name : `Geely ${vehicle.name}`).toUpperCase();
  const drivetrain = vehicle.fuel === 'Elektrisch' ? t.labels.fullyElectric : translateFuel(vehicle.fuel, lang);
  const figures = [specs.battery, vehicle.power ? `${vehicle.power} ${powerUnit(lang)}` : null].filter(Boolean).join(' - ');
  return [title, drivetrain, figures];
}

// "Ovenstraat 15, 8800 Roeselare" → ["Ovenstraat 15", "8800 Roeselare"], as on the letterhead.
function splitAddress(address) {
  if (!address) return [];
  const comma = address.lastIndexOf(',');
  if (comma === -1) return [address.trim()];
  return [address.slice(0, comma).trim(), address.slice(comma + 1).trim()].filter(Boolean);
}

// The branch's current details where it still exists, else what the quote snapshotted.
function sellerDetails(quote, branch) {
  const branchName = branch?.name || quote.branchName || '';
  const address = branch?.address || quote.branchAddress || '';
  return {
    letterhead: [branchName.toUpperCase(), SELLER_COMPANY.name].filter(Boolean).join(' '),
    name: [branchName, SELLER_COMPANY.name].filter(Boolean).join(' '),
    address,
    addressLines: splitAddress(address),
    phone: branch?.phone || '',
    email: branch?.email || '',
  };
}

// ------------------------------------------------------------------ pages 1–2

function drawCoverHeader(doc, { kickerText, title, subtitle }) {
  const coverLogoWidth = 110;
  doc.image(LOGO_PATH, PAGE_LEFT, 40, { width: coverLogoWidth });
  putRight(doc, kickerText, PAGE_RIGHT, 40 + (coverLogoWidth * LOGO_ASPECT - 9) / 2, { size: 9, color: SOFT, spacing: 1 });
  doc.save().lineWidth(1).moveTo(PAGE_LEFT, 85).lineTo(PAGE_RIGHT, 85).stroke(NAVY).restore();
  put(doc, title, PAGE_LEFT, 102, { font: 'Inter-Bold', size: 22, color: NAVY });
  put(doc, subtitle, PAGE_LEFT, 132, { size: 10, color: MUTED });
  return 160;
}

// Card lines: { text, font, size, color, spacing, gap } — or { blank: true } for a value
// that's unknown (a line to write it on).
function cardLinesHeight(lines) {
  return lines.reduce((sum, line) => sum + (line.size || 9) * 1.55 + (line.gap || 0), 0);
}

function drawCardLines(doc, lines, x, y, width) {
  lines.forEach((line) => {
    const size = line.size || 9;
    if (line.blank) {
      blankLine(doc, x, y + size + 1, Math.min(width, 170));
    } else {
      const style = { font: line.font || 'Inter', size, color: line.color || INK, spacing: line.spacing || 0 };
      put(doc, line.text, x, y, { ...style, size: fitSize(doc, line.text, width, style) });
    }
    y += size * 1.55 + (line.gap || 0);
  });
}

function drawPartyCards(doc, flow, { seller, quote, t }) {
  const { labels } = t;
  const gap = 15;
  const cardWidth = (CONTENT_WIDTH - gap) / 2;
  const padding = 16;
  const innerWidth = cardWidth - padding * 2;

  const left = [
    { text: seller.letterhead, font: 'Inter-Bold', color: NAVY, spacing: 1, gap: 1 },
    { text: labels.website, size: 8, color: MUTED, gap: 8 },
    ...seller.addressLines.map((text) => ({ text })),
    seller.phone ? { text: `${labels.phonePrefix} ${seller.phone}` } : null,
    seller.email ? { text: `${labels.emailPrefix} ${seller.email}` } : null,
    { text: `${labels.vatPrefix} ${SELLER_COMPANY.vatNumber}` },
  ].filter(Boolean);

  const contactPhone = quote.createdByPhone || seller.phone;
  const right = [
    { text: labels.contactPerson.toUpperCase(), font: 'Inter-Bold', color: NAVY, spacing: 1, gap: 4 },
    quote.createdByName ? { text: quote.createdByName, font: 'Inter-SemiBold' } : { blank: true },
    quote.createdByEmail ? { text: quote.createdByEmail } : null,
    contactPhone ? { text: contactPhone } : null,
    { text: labels.sellerAlias, size: 8, color: MUTED },
  ].filter(Boolean);
  // The "(Hierna 'de verkoper')" line sits at the bottom of the card, under a little air.
  right[right.length - 2].gap = 8;

  const height = padding * 2 + Math.max(cardLinesHeight(left), cardLinesHeight(right)) - 6;
  flow.ensure(height);
  panel(doc, PAGE_LEFT, flow.y, cardWidth, height, { radius: 6 });
  panel(doc, PAGE_LEFT + cardWidth + gap, flow.y, cardWidth, height, { radius: 6 });
  drawCardLines(doc, left, PAGE_LEFT + padding, flow.y + padding, innerWidth);
  drawCardLines(doc, right, PAGE_LEFT + cardWidth + gap + padding, flow.y + padding, innerWidth);
  flow.y += height + 16;
}

function drawCustomerCard(doc, flow, { quote, t }) {
  const { labels } = t;
  const padding = 16;
  const rowHeight = 18;
  const labelX = PAGE_LEFT + padding;
  const valueX = PAGE_LEFT + 160;
  const valueWidth = PAGE_RIGHT - padding - valueX;
  const isCompany = quote.customerType === 'bedrijf';

  const rows = [
    [labels.customerName, quote.customerName],
    isCompany ? [labels.customerCompany, quote.customerCompany] : null,
    [labels.customerStreet, quote.customerStreet],
    [labels.customerCity, [quote.customerPostalCode, quote.customerCity].filter(Boolean).join(' ')],
    [labels.customerContact, [quote.customerEmail, quote.customerPhone].filter(Boolean).join('   ·   ')],
    [labels.customerVat, isCompany ? quote.customerVatNumber : ''],
  ].filter(Boolean);

  const height = padding + 22 + rows.length * rowHeight + padding - 6;
  flow.ensure(height);
  panel(doc, PAGE_LEFT, flow.y, CONTENT_WIDTH, height, { radius: 6 });
  kicker(doc, labels.customer, labelX, flow.y + padding);

  let y = flow.y + padding + 22;
  rows.forEach(([label, value]) => {
    put(doc, label, labelX, y + 1.5, { font: 'Inter-Bold', size: 7, color: MUTED, spacing: 0.6 });
    if (value) {
      const style = { font: label === labels.customerName ? 'Inter-SemiBold' : 'Inter', size: 9.5, color: INK };
      put(doc, value, valueX, y, { ...style, size: fitSize(doc, value, valueWidth, style) });
    } else {
      blankLine(doc, valueX, y + 11, valueWidth);
    }
    y += rowHeight;
  });
  flow.y += height + 16;
}

function drawModelCard(doc, flow, { vehicle, items, t, lang }) {
  const padding = 16;
  const height = 100;
  const [title, drivetrain, figures] = modelLines(vehicle, t, lang);
  flow.ensure(height);
  const top = flow.y;
  panel(doc, PAGE_LEFT, top, CONTENT_WIDTH, height, { radius: 6 });
  kicker(doc, t.labels.model, PAGE_LEFT + padding, top + padding);
  put(doc, title, PAGE_LEFT + padding, top + 38, { font: 'Inter-Bold', size: 15, color: INK });
  put(doc, drivetrain, PAGE_LEFT + padding, top + 61, { size: 9, color: BODY });
  if (figures) put(doc, figures, PAGE_LEFT + padding, top + 76, { size: 9, color: BODY });

  // Photo in the ordered colour (same choice as the offer's cover), right-aligned.
  const imagePath = resolveExteriorImagePath(vehicle, items);
  if (imagePath) {
    const image = doc.openImage(imagePath);
    const maxHeight = height - 20;
    const maxWidth = 200;
    let drawHeight = maxHeight;
    let drawWidth = maxHeight * (image.width / image.height);
    if (drawWidth > maxWidth) {
      drawWidth = maxWidth;
      drawHeight = maxWidth / (image.width / image.height);
    }
    doc.image(imagePath, PAGE_RIGHT - 12 - drawWidth, top + (height - drawHeight) / 2, { width: drawWidth, height: drawHeight });
  }
  flow.y += height + 16;
}

function drawOptionsTable(doc, flow, { quote, vehicle, classified, t, lang }) {
  const { labels } = t;
  const { color, upholstery, deliveryPack, options } = classified;
  const standardUpholstery = STANDARD_UPHOLSTERY[vehicle.name] && translateAccessoryName(STANDARD_UPHOLSTERY[vehicle.name], lang);
  const rows = [
    { label: labels.version, text: vehicle.model, price: quote.basePrice },
    { label: labels.color, text: color ? itemLabel(color, lang) : '', price: color ? color.totalPrice : null },
    upholstery
      ? { label: labels.interior, text: itemLabel(upholstery, lang), price: upholstery.totalPrice }
      : { label: labels.interior, text: standardUpholstery ? `${standardUpholstery} ${labels.standardInteriorSuffix}` : '', price: standardUpholstery ? 0 : null },
    deliveryPack ? { label: labels.deliveryPack, text: '', note: deliveryPackContents(vehicle, lang), price: deliveryPack.totalPrice } : null,
    ...options.map((item, i) => ({ label: labels.option(i + 1), text: itemLabel(item, lang), price: item.totalPrice })),
  ].filter(Boolean);

  const barHeight = 24;
  const labelX = PAGE_LEFT + 12;
  const textX = PAGE_LEFT + 150;
  const textWidthMax = PAGE_RIGHT - 110 - textX;
  const priceRight = PAGE_RIGHT - 12;
  const measured = rows.map((row) => {
    const lines = row.text ? wrapText(doc, row.text, textWidthMax, { size: 9 }) : [];
    // A row's note (the Delivery Pack contents) is set small and grey under its text.
    const noteLines = row.note ? wrapText(doc, row.note, textWidthMax, { size: 7 }) : [];
    return { ...row, lines, noteLines, height: Math.max(22, lines.length * 12 + noteLines.length * 9 + 10) };
  });

  const drawBar = () => {
    doc.save().rect(PAGE_LEFT, flow.y, CONTENT_WIDTH, barHeight).fill(NAVY).restore();
    kicker(doc, labels.options, labelX, flow.y + 8, { color: '#FFF', size: 8.5 });
    flow.y += barHeight;
  };

  flow.ensure(barHeight + measured[0].height);
  drawBar();
  measured.forEach((row, index) => {
    if (flow.y + row.height > CONTENT_BOTTOM) {
      flow.newPage();
      drawBar();
    }
    if (index % 2 === 1) doc.save().rect(PAGE_LEFT, flow.y, CONTENT_WIDTH, row.height).fill('#F9FAFB').restore();
    put(doc, row.label, labelX, flow.y + 6, { font: 'Inter-SemiBold', size: 9, color: INK });
    row.lines.forEach((line, i) => put(doc, line, textX, flow.y + 6 + i * 12, { size: 9, color: BODY }));
    const noteTop = flow.y + 7.5 + row.lines.length * 12;
    row.noteLines.forEach((line, i) => put(doc, line, textX, noteTop + i * 9, { size: 7, color: MUTED }));
    if (row.price !== null && row.price !== undefined) {
      putRight(doc, formatPrice(row.price), priceRight, flow.y + 6, { size: 9, color: INK });
    }
    flow.y += row.height;
  });
  doc.save().lineWidth(1).moveTo(PAGE_LEFT, flow.y).lineTo(PAGE_RIGHT, flow.y).stroke('#CCC').restore();
  flow.y += 5;
  put(doc, labels.pricesInclVat, PAGE_LEFT, flow.y, { size: 6.5, color: SOFT, spacing: 0.4 });
  flow.y += 22;
}

function drawTotalsCard(doc, flow, { quote, t }) {
  const { labels } = t;
  const padding = 16;
  const height = 150;
  flow.ensure(height);
  const top = flow.y;
  const innerLeft = PAGE_LEFT + padding;
  const innerRight = PAGE_RIGHT - padding;
  panel(doc, PAGE_LEFT, top, CONTENT_WIDTH, height);
  kicker(doc, labels.totals, innerLeft, top + padding);

  let y = top + 42;
  put(doc, labels.totalCar, innerLeft, y, { font: 'Inter-Bold', size: 10, color: INK });
  putRight(doc, formatPrice(quote.basePrice + quote.accessories), innerRight, y, { font: 'Inter-Bold', size: 10, color: INK });
  y += 22;
  put(doc, labels.discount, innerLeft, y, { size: 10, color: BODY });
  putRight(doc, `- ${formatPrice(quote.discountAmount || 0)}`, innerRight, y, { size: 10, color: BODY });
  y += 20;

  // The paper form's black "NETTO TOTAAL" bar, in the offer's navy.
  const bandHeight = 30;
  doc.save().roundedRect(innerLeft - 6, y, innerRight - innerLeft + 12, bandHeight, 5).fill(NAVY).restore();
  put(doc, labels.netTotal, innerLeft + 4, y + 9, { font: 'Inter-Bold', size: 11, color: '#FFF', spacing: 0.5 });
  putRight(doc, formatPrice(quote.totalPrice), innerRight - 4, y + 7.5, { font: 'Inter-Bold', size: 13, color: '#FFF' });
  y += bandHeight + 10;

  put(doc, labels.vatAmount, innerLeft, y, { size: 9, color: MUTED });
  putRight(doc, formatPrice(quote.vatAmount), innerRight, y, { size: 9, color: MUTED });
  flow.y += height + 16;
}

function drawTradeInCard(doc, flow, { quote, t, lang }) {
  const { labels } = t;
  const hasTradeIn = !!quote.tradeInEnabled;
  const value = (v) => (hasTradeIn && v !== null && v !== undefined && v !== '' ? String(v) : '');
  const mileage = hasTradeIn && quote.tradeInMileage ? `${Number(quote.tradeInMileage).toLocaleString(LOCALE[lang])} km` : '';
  const amount = hasTradeIn && quote.tradeInValue > 0 ? formatPrice(quote.tradeInValue) : '';

  const padding = 16;
  const cols = { l1: PAGE_LEFT + padding, v1: PAGE_LEFT + 140, l2: PAGE_LEFT + 290, v2: PAGE_LEFT + 375 };
  const right = PAGE_RIGHT - padding;
  // Each row: [label, value, label, value] — a missing second pair means the first value
  // spans the rest of the row.
  const vehicleRows = [
    [labels.tradeInMake, value(quote.tradeInMake), labels.tradeInModel, value(quote.tradeInModel)],
    [labels.tradeInFirstRegistration, '', labels.tradeInEngine, ''],
    [labels.tradeInMileage, mileage, labels.tradeInColor, ''],
    [labels.tradeInVin, ''],
  ];
  const amountRows = [
    [labels.tradeInAmountInclVat, amount],
    [labels.tradeInAmountExclVat, '', labels.tradeInVatAmount, ''],
  ];
  const rowHeight = 24;
  const amountRowHeight = 30;
  const height = padding + 24 + vehicleRows.length * rowHeight + 8 + amountRows.length * amountRowHeight + padding - 10;
  flow.ensure(height);
  const top = flow.y;
  panel(doc, PAGE_LEFT, top, CONTENT_WIDTH, height);
  kicker(doc, labels.tradeIn, cols.l1, top + padding);

  const drawRow = (row, y, rowH, bold) => {
    const [label1, value1, label2, value2] = row;
    const labelStyle = { font: bold ? 'Inter-Bold' : 'Inter', size: 8, color: bold ? INK : MUTED };
    // Narrow enough that "BEDRAG OVERNAME incl btw" breaks after OVERNAME, as on paper.
    const label1Lines = wrapText(doc, label1, 92, labelStyle);
    const textY = y + (rowH - label1Lines.length * 10) / 2 - 1;
    label1Lines.forEach((line, i) => put(doc, line, cols.l1, textY + i * 10, labelStyle));
    const value1End = label2 ? cols.l2 - 12 : right;
    if (value1) put(doc, value1, cols.v1, y + rowH / 2 - 6, { font: 'Inter-SemiBold', size: 9.5, color: INK });
    else blankLine(doc, cols.v1, y + rowH / 2 + 5, value1End - cols.v1);
    if (label2) {
      put(doc, label2, cols.l2, y + rowH / 2 - 5, labelStyle);
      if (value2) put(doc, value2, cols.v2, y + rowH / 2 - 6, { font: 'Inter-SemiBold', size: 9.5, color: INK });
      else blankLine(doc, cols.v2, y + rowH / 2 + 5, right - cols.v2);
    }
  };

  let y = top + padding + 20;
  vehicleRows.forEach((row) => { drawRow(row, y, rowHeight, false); y += rowHeight; });
  y += 4;
  doc.save().lineWidth(1).moveTo(cols.l1, y).lineTo(right, y).stroke(RULE).restore();
  y += 4;
  amountRows.forEach((row) => { drawRow(row, y, amountRowHeight, true); y += amountRowHeight; });
  flow.y += height + 20;
}

function drawDeliveryLines(doc, flow, { t }) {
  const labelStyle = { font: 'Inter-Bold', size: 7.5, color: MUTED, spacing: 0.6 };
  const fieldLabels = [t.labels.expectedDelivery, t.labels.deliveryPlace];
  // Blanks start after the longest label (the French one is the wider of the two).
  const blankX = PAGE_LEFT + Math.max(215, ...fieldLabels.map((label) => textWidth(doc, label, labelStyle) + 16));
  flow.ensure(60);
  fieldLabels.forEach((label) => {
    put(doc, label, PAGE_LEFT, flow.y, labelStyle);
    blankLine(doc, blankX, flow.y + 9, PAGE_RIGHT - blankX);
    flow.y += 28;
  });
}

// ------------------------------------------------------------------ pages 3+ special blocks

function drawFinancing(doc, flow, { size, t }) {
  const { leading } = bodyStyle(size);
  const colGap = 24;
  const colWidth = (flow.width - colGap) / 2;
  const lineGap = 6; // room to circle "ja" or "neen"
  const columns = [t.financing.left, t.financing.right].map((lines) => lines.map((text) => wrapText(doc, text, colWidth, { size })));
  const columnHeight = (wrapped) => wrapped.reduce((sum, lines) => sum + lines.length * leading + lineGap, 0) + leading + lineGap;
  const height = Math.max(...columns.map(columnHeight));
  flow.ensure(height);
  columns.forEach((wrapped, c) => {
    const x = flow.x + c * (colWidth + colGap);
    let y = flow.y;
    wrapped.forEach((lines) => {
      lines.forEach((line) => { put(doc, line, x, y, { size, color: BODY }); y += leading; });
      y += lineGap;
    });
    fillInLine(doc, x, y, colWidth, [t.financing.remark, fill()], { size, color: BODY });
  });
  flow.y += height + 4;
}

function drawUsage(doc, flow, { size, t }) {
  paragraph(doc, flow, t.usage.intro, { size, after: 3 });
  flow.ensure(16);
  let x = flow.x + 4;
  t.usage.choices.forEach((choice) => {
    tickCircle(doc, x + 3.3, flow.y + size * 0.62);
    x += 12 + put(doc, choice, x + 12, flow.y, { size, color: BODY }) + 28;
  });
  flow.y += 16;
  paragraph(doc, flow, t.usage.outro, { size });
}

function drawAnnexes(doc, flow, { size, t }) {
  // The list, the "Aldus opgemaakt te …" line and the signatures belong together.
  flow.ensure(200);
  if (!flow.atTop) flow.y += 6;
  paragraph(doc, flow, t.annexes.intro, { size, after: 4 });
  t.annexes.items.forEach((item) => paragraph(doc, flow, item, { size, font: 'Inter-SemiBold', color: INK, marker: { kind: 'ring' }, after: 3 }));
  flow.y += 3;
  paragraph(doc, flow, t.annexes.other, { size });
  flow.y += 8;
  const [made, on, copies] = t.annexes.madeUpAt;
  fillInLine(doc, flow.x, flow.y, flow.width, [made, fill(1.1), on, fill(1), copies], { size: size + 0.5, color: INK });
  flow.y += 26;
}

function drawSignatures(doc, flow, { quote, size, t }) {
  const gap = 15;
  const boxWidth = (flow.width - gap) / 2;
  const boxHeight = 92;
  const noteLines = wrapText(doc, t.signatures.buyerNote, boxWidth, { size: size - 0.5 });
  flow.ensure(boxHeight + 8 + noteLines.length * (size * 1.35));
  [[t.signatures.seller, quote.createdByName], [t.signatures.buyer, quote.customerName]].forEach(([label, name], i) => {
    const x = flow.x + i * (boxWidth + gap);
    panel(doc, x, flow.y, boxWidth, boxHeight, { fill: '#FFF' });
    kicker(doc, label, x + 14, flow.y + 12, { size: 8 });
    if (name) put(doc, name, x + 14, flow.y + boxHeight - 20, { size: 8, color: MUTED });
  });
  flow.y += boxHeight + 8;
  noteLines.forEach((line) => {
    put(doc, line, flow.x + boxWidth + gap, flow.y, { size: size - 0.5, color: MUTED });
    flow.y += (size - 0.5) * 1.38;
  });
  flow.y += 10;
}

function drawComplaintContacts(doc, flow, { seller, size, t }) {
  const { leading } = bodyStyle(size);
  const post = seller.address ? [seller.name, seller.address].filter(Boolean).join(', ') : '';
  const rows = [
    [t.complaintContacts.phone, seller.phone],
    [t.complaintContacts.email, seller.email],
    [t.complaintContacts.post, post],
  ];
  const labelWidth = Math.max(...rows.map(([label]) => textWidth(doc, label, { size }))) + 6;
  rows.forEach(([label, value]) => {
    const lines = value ? wrapText(doc, value, flow.width - labelWidth, { size }) : [''];
    flow.ensure(lines.length * (leading + 2));
    put(doc, label, flow.x, flow.y, { size, color: BODY });
    lines.forEach((line, i) => {
      if (line) put(doc, line, flow.x + labelWidth, flow.y + i * leading, { size, font: 'Inter-SemiBold', color: INK });
      else blankLine(doc, flow.x + labelWidth, flow.y + size + 1, flow.width - labelWidth);
    });
    flow.y += lines.length * leading + 3;
  });
  flow.y += 8;
}

function drawReadAndApproved(doc, flow, { size, t }) {
  const padding = 12;
  const style = { font: 'Inter-SemiBold', size, color: INK };
  const lines = wrapText(doc, t.readAndApproved.line, flow.width - padding * 2, style);
  const signatureSpace = 44;
  const height = padding + lines.length * size * 1.4 + 22 + 16 + signatureSpace + padding - 8;
  flow.ensure(height);
  panel(doc, flow.x, flow.y, flow.width, height, { fill: '#FFF' });
  let y = flow.y + padding;
  lines.forEach((line) => { put(doc, line, flow.x + padding, y, style); y += size * 1.4; });
  y += 6;
  fillInLine(doc, flow.x + padding, y, flow.width - padding * 2, [fill(), t.readAndApproved.date], style);
  y += 22;
  put(doc, t.readAndApproved.signature, flow.x + padding, y, style);
  flow.y += height + 10;
}

function drawPrivacyConsent(doc, flow, { size, t }) {
  const { leading } = bodyStyle(size);
  const style = { font: 'Inter-SemiBold', size, color: INK };
  const boxIndent = 16;
  const ack = wrapText(doc, t.privacyConsent.acknowledgement, flow.width, style);
  const marketing = wrapText(doc, t.privacyConsent.marketing, flow.width - boxIndent, style);
  const channelsIntro = wrapText(doc, t.privacyConsent.channelsIntro, flow.width, style);
  const insurance = wrapText(doc, t.privacyConsent.insurance, flow.width - boxIndent, style);
  const channelRow = 20;
  const signatureHeight = 64;
  const linesHeight = (lines) => lines.length * leading;
  const height = linesHeight(ack) + 10 + linesHeight(marketing) + 10 + linesHeight(channelsIntro) + 8
    + t.privacyConsent.channels.length * channelRow + 14 + linesHeight(insurance) + 18 + 24 + 14 + signatureHeight;

  if (!flow.atTop) flow.y += 14;
  flow.ensure(height);
  const drawLines = (lines, x) => {
    lines.forEach((line) => { put(doc, line, x, flow.y, style); flow.y += leading; });
  };

  drawLines(ack, flow.x);
  flow.y += 10;
  tickBox(doc, flow.x, flow.y + 0.5);
  drawLines(marketing, flow.x + boxIndent);
  flow.y += 10;
  drawLines(channelsIntro, flow.x);
  flow.y += 8;

  const tableWidth = 280;
  panel(doc, flow.x, flow.y, tableWidth, t.privacyConsent.channels.length * channelRow, { radius: 6 });
  t.privacyConsent.channels.forEach((channel, i) => {
    const y = flow.y + i * channelRow;
    if (i > 0) doc.save().lineWidth(1).moveTo(flow.x + 10, y).lineTo(flow.x + tableWidth - 10, y).stroke(RULE).restore();
    put(doc, channel, flow.x + 12, y + 6, style);
    const yesX = flow.x + 130;
    const yesWidth = put(doc, t.privacyConsent.yes, yesX, y + 6, style);
    tickBox(doc, yesX + yesWidth + 6, y + 6.5);
  });
  flow.y += t.privacyConsent.channels.length * channelRow + 14;

  tickBox(doc, flow.x, flow.y + 0.5);
  drawLines(insurance, flow.x + boxIndent);
  flow.y += 18;

  fillInLine(doc, flow.x, flow.y, 330, [t.privacyConsent.readAndApproved, fill(), t.privacyConsent.date], style);
  flow.y += 24;
  put(doc, t.privacyConsent.signature, flow.x, flow.y, style);
  flow.y += 14;
  panel(doc, flow.x, flow.y, 250, signatureHeight, { fill: '#FFF' });
  flow.y += signatureHeight + 10;
}

const HEADING_STYLES = {
  h1: (size) => ({ size: size + 3, before: 10, after: 5 }),
  h2: (size) => ({ size: size + 0.8, before: 5, after: 3 }),
};

function renderBlocks(doc, flow, blocks, { size, special, transform = (text) => text }) {
  const headingHeight = (block) => {
    const style = HEADING_STYLES[block.type](size);
    return wrapText(doc, block.text, flow.width, { font: 'Inter-Bold', size: style.size }).length * style.size * 1.3 + style.before + style.after;
  };
  blocks.forEach((block, index) => {
    switch (block.type) {
      case 'h1':
      case 'h2': {
        // A heading stays with the headings stacked under it ("6. Overeenstemming van het
        // Voertuig" / "De conventionele garantie" / "Basis Garantie") and the first lines
        // of the text that follows them.
        let keepWith = size * 2.8;
        for (let next = index + 1; blocks[next] && HEADING_STYLES[blocks[next].type]; next++) {
          keepWith += headingHeight(blocks[next]);
        }
        heading(doc, flow, block.text, { ...HEADING_STYLES[block.type](size), keepWith });
        break;
      }
      case 'p':
        paragraph(doc, flow, transform(block.text), { size });
        break;
      case 'numbered':
        block.items.forEach((item, i) => paragraph(doc, flow, transform(item), {
          size, marker: { kind: 'number', label: `${block.start + i}.` }, after: size * 0.3,
        }));
        flow.y += size * 0.4;
        break;
      case 'bullets':
        block.items.forEach((item) => paragraph(doc, flow, transform(item), { size, marker: { kind: 'bullet' }, after: size * 0.3 }));
        flow.y += size * 0.4;
        break;
      case 'box':
        framedText(doc, flow, block.paragraphs.map(transform), size);
        break;
      case 'centered':
        paragraph(doc, flow, block.text, { size, align: 'center' });
        break;
      default:
        if (!special[block.type]) throw new Error(`Unknown bestelbon block: ${block.type}`);
        special[block.type]();
    }
  });
}

// ------------------------------------------------------------------ document

function renderOrderForm(doc, { quote, vehicle, items, branch, catalog }) {
  registerFonts(doc);
  const lang = resolveLang(quote.language);
  const t = ORDER_FORM_TEXT[lang];
  const { labels } = t;
  const categoryByName = new Map();
  catalog.forEach((acc) => { if (!categoryByName.has(acc.name)) categoryByName.set(acc.name, acc.category); });
  const classified = classifyItems(items, categoryByName);
  const seller = sellerDetails(quote, branch);
  const quoteNumber = formatQuoteNumber(quote);
  const vehicleLabel = `${vehicle.name} ${vehicle.model}`;
  const month = new Intl.DateTimeFormat(LOCALE[lang], { month: 'long', year: 'numeric' }).format(new Date()).toUpperCase();

  // ---- Pages 1–2: parties, model, options, totals, trade-in, delivery
  const coverSubtitle = `${vehicleLabel} · ${labels.quoteReference} ${quoteNumber}`;
  const flow = createFlow(doc, { title: labels.documentTitle, subtitle: `${coverSubtitle} · ${quote.customerName}` });
  flow.y = drawCoverHeader(doc, { kickerText: `${labels.kickerPrefix} · ${month}`, title: labels.documentTitle, subtitle: coverSubtitle });

  drawPartyCards(doc, flow, { seller, quote, t });
  drawCustomerCard(doc, flow, { quote, t });
  drawModelCard(doc, flow, { vehicle, items, t, lang });
  drawOptionsTable(doc, flow, { quote, vehicle, classified, t, lang });
  drawTotalsCard(doc, flow, { quote, t });
  drawTradeInCard(doc, flow, { quote, t, lang });
  drawDeliveryLines(doc, flow, { t });

  // ---- Garantie, financiering, gebruik, wettelijke vermeldingen, bijlagen, handtekeningen
  const termsSize = 8;
  flow.newPage();
  renderBlocks(doc, flow, t.warrantyAndTerms, {
    size: termsSize,
    special: {
      financing: () => drawFinancing(doc, flow, { size: termsSize, t }),
      usage: () => drawUsage(doc, flow, { size: termsSize, t }),
      annexes: () => drawAnnexes(doc, flow, { size: termsSize, t }),
      signatures: () => drawSignatures(doc, flow, { quote, size: termsSize, t }),
    },
  });

  // ---- Bijlage: Algemene voorwaarden (two columns, as on the paper form)
  const conditionsSize = 7.6;
  flow.newPage({ title: labels.generalConditionsTitle, columns: 2 });
  renderBlocks(doc, flow, t.generalConditions, {
    size: conditionsSize,
    special: {
      complaintContacts: () => drawComplaintContacts(doc, flow, { seller, size: conditionsSize, t }),
      readAndApproved: () => drawReadAndApproved(doc, flow, { size: conditionsSize, t }),
    },
  });

  // ---- Bijlage: Privacyverklaring + toestemmingen
  const privacySize = 8;
  const dealer = seller.address ? [seller.name, seller.address, seller.email].filter(Boolean).join(', ') : '';
  flow.newPage({ title: labels.privacyTitle, columns: 1 });
  renderBlocks(doc, flow, t.privacyStatement, {
    size: privacySize,
    special: {},
    transform: (text) => (dealer ? text.replace(t.dealerPlaceholder, dealer) : text),
  });
  drawPrivacyConsent(doc, flow, { size: privacySize, t });

  // ---- Footer on every page: initials line (as on the paper form) + page number.
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const labelWidth = put(doc, labels.footerInitials, PAGE_LEFT, FOOTER_Y, { size: 7.5, color: SOFT });
    blankLine(doc, PAGE_LEFT + labelWidth + 6, FOOTER_Y + 8.5, 80);
    putRight(doc, labels.pageOf(i + 1, range.count), PAGE_RIGHT, FOOTER_Y, { size: 8, color: '#AAA' });
  }

  doc.end();
}

export function generateOrderFormBuffer(data) {
  return new Promise((resolve, reject) => {
    // Bottom margin 0: nothing here relies on pdfkit's automatic page breaks (see put()),
    // and a non-zero margin would let it insert a blank page for footer text near the edge.
    const doc = new PDFDocument({ size: 'A4', bufferPages: true, margins: { top: 40, left: 40, right: 40, bottom: 0 } });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try {
      renderOrderForm(doc, data);
    } catch (err) {
      reject(err);
    }
  });
}

// ASCII-only, so the Content-Disposition header can't be rejected over an accented name.
function orderFormFilename(quote) {
  const safe = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9.-]+/g, '_').replace(/^_+|_+$/g, '');
  const prefix = resolveLang(quote.language) === 'fr' ? 'Bon_de_commande' : 'Bestelbon';
  return `${prefix}_Geely_${safe(formatQuoteNumber(quote))}_${safe(quote.customerName)}.pdf`;
}

router.get('/:quoteId', requireAuth, blockPendingPasswordChange, async (req, res) => {
  try {
    const { quote, vehicle, items } = await loadQuoteForPdf(req.params.quoteId);
    if (quote.isShowroom) {
      return res.status(400).json({ error: 'Een showroomaanbieding heeft geen klant — maak een offerte op naam van de klant om een bestelbon af te drukken' });
    }
    if (BLOCKING_APPROVAL_STATUSES.includes(quote.discountApprovalStatus)) {
      return res.status(400).json({ error: 'De korting op deze offerte moet eerst goedgekeurd worden door een sales manager voordat er een bestelbon afgedrukt kan worden' });
    }

    const branch = quote.branchId ? await getAsync('SELECT * FROM branches WHERE id = ?', [quote.branchId]) : null;
    const catalog = await allAsync('SELECT name, category FROM accessories');
    const buffer = await generateOrderFormBuffer({ quote, vehicle, items, branch, catalog });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${orderFormFilename(quote)}"`);
    res.send(buffer);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

export default router;
