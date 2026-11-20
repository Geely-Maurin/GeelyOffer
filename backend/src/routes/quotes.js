import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { allAsync, getAsync, runAsync } from '../database/init.js';
import { calculatePricing, validatePricingInputs } from '../utils/pricing.js';
import { requireAuth, isManagerRole, blockPendingPasswordChange } from '../middleware/auth.js';
import { loadQuoteForPdf, generateQuotePdfBuffer } from './pdf.js';
import { sendQuoteEmail } from '../utils/email.js';
import { logAudit } from '../utils/auditLog.js';
import { PDF, resolveLang } from '../i18n/translate.js';
import { formatQuoteNumber } from '../utils/quoteNumber.js';

// Next 0-based offer number — assigned once, at creation, from the current max. Not
// wrapped in a transaction: at this app's scale (a handful of reps, SQLite has a single
// writer anyway) two quotes created in the exact same instant colliding on a number is a
// cosmetic risk, not a correctness one, and not worth the added complexity of a dedicated
// counter table for.
async function nextSequenceNumber() {
  const row = await getAsync('SELECT COALESCE(MAX(sequenceNumber), -1) + 1 AS next FROM quotes');
  return row.next;
}

// A showroomaanbieding lives ~2 hours, then vanishes — from the list and from the
// database, so it never lingers in exports, reports, or as a stale PDF link. There's no
// scheduler in this app (same "keep it simple" reasoning as nextSequenceNumber above), so
// instead this runs opportunistically at the top of the read paths that would otherwise
// surface an expired one (the list, the CSV export, the reports queries). SQLite stores
// createdAt as a UTC 'YYYY-MM-DD HH:MM:SS' string, which datetime() compares correctly.
export async function purgeExpiredShowroomQuotes() {
  await runAsync(
    `DELETE FROM quote_items WHERE quoteId IN (
       SELECT id FROM quotes WHERE isShowroom = 1 AND datetime(createdAt) <= datetime('now', '-2 hours')
     )`
  );
  await runAsync(
    `DELETE FROM quotes WHERE isShowroom = 1 AND datetime(createdAt) <= datetime('now', '-2 hours')`
  );
}

const QUOTE_LANGUAGES = ['nl', 'fr'];

const router = express.Router();
router.use(requireAuth, blockPendingPasswordChange);

const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'declined'];
const OPEN_STATUSES = ['draft', 'sent'];
// How long a (non-showroom) offer stays valid — sets its expiresAt / "Geldig tot" date.
const QUOTE_VALIDITY_DAYS = 7;
const QUOTE_VALIDITY_MS = QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
const EXPIRY_WARNING_DAYS = 2;
// A 'sent' quote the customer hasn't responded to in this many days surfaces as
// needing a follow-up call — mirrors EXPIRY_WARNING_DAYS's role for the expiry filter.
const FOLLOWUP_REMINDER_DAYS = 5;
// Any rep can see every quote (a colleague's included, for cover during absence — see the
// unscoped list query below), but mutating one — editing or deleting — is limited to
// whoever created it or a manager, so a rep can't rewrite or remove a colleague's quote.
// Shared by PUT and DELETE below so the rule can't drift between the two.
function canModifyQuote(quote, user) {
  return quote.createdBy === user.id || isManagerRole(user.role);
}

// tradeInYear/tradeInMileage were previously stored completely unvalidated — a non-numeric
// tradeInMileage (a typo, or a hand-crafted request) would sail through as-is and only
// surface once it hit `Number(quote.tradeInMileage).toLocaleString()` on the printed PDF,
// rendering the literal text "NaN km" on a customer-facing document. Both are optional
// (a rep may genuinely not know the year or exact mileage yet), so only checked when present.
const CURRENT_YEAR = new Date().getFullYear();
function validateTradeInDetails(tradeInYear, tradeInMileage) {
  if (tradeInYear !== undefined && tradeInYear !== null && tradeInYear !== '') {
    const year = Number(tradeInYear);
    if (!Number.isInteger(year) || year < 1900 || year > CURRENT_YEAR + 1) {
      return `tradeInYear must be a whole number between 1900 and ${CURRENT_YEAR + 1}`;
    }
  }
  if (tradeInMileage !== undefined && tradeInMileage !== null && tradeInMileage !== '') {
    if (!Number.isFinite(Number(tradeInMileage)) || Number(tradeInMileage) < 0) {
      return 'tradeInMileage must be a non-negative number';
    }
  }
  return null;
}

// The branch a quote gets attributed to is always the creating user's own assigned
// branch — never something the client can pass in — so a rep can't misattribute a sale
// to a different branch than the one they actually work from.
async function resolveActorBranch(user) {
  if (!user.branchId) return { branchId: null, branchName: null, branchAddress: null };
  const branch = await getAsync('SELECT * FROM branches WHERE id = ?', [user.branchId]);
  if (!branch) return { branchId: null, branchName: null, branchAddress: null };
  return { branchId: branch.id, branchName: branch.name, branchAddress: branch.address };
}

// Normalizes a Belgian VAT number to a single canonical "BE" + 10-digit form regardless
// of how the rep typed it (with dots, spaces, a "BE" prefix or not) — so the same company
// always renders identically on every quote/PDF/CSV export instead of drifting per rep.
// Anything that isn't a recognizable Belgian VAT number is stored trimmed, as-is, rather
// than rejected outright (a rep may legitimately be quoting a foreign business).
function normalizeVatNumber(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/^BE/i, '').replace(/[^0-9]/g, '');
  if (/^[01]\d{9}$/.test(digits)) return `BE${digits}`;
  return String(raw).trim() || null;
}

// Resolve client-submitted accessory lines against the authoritative accessories
// table by id — a quote's price must never be derived from a client-supplied price,
// name, or line total, or any authenticated user could quote a customer whatever
// price they liked (e.g. a real accessory relabeled or repriced at submission time).
// Only `quantity` is trusted from the client, and even that is clamped to a sane
// positive integer.
// Mirrors frontend/src/utils/constants.js SINGLE_SELECT_CATEGORIES — a car can only have
// one paint color and one interior/upholstery, so this is checked here too rather than
// trusting the UI alone to enforce it (the UI can have bugs, and this endpoint can be
// called directly).
const SINGLE_SELECT_CATEGORIES = ['exterior', 'interior'];

// An accessory is scoped to a vehicle (trim) in two independent ways: by whole-model name
// (`vehicleModels`) and by exact trim id (`vehicleTrims`). It applies when it has neither
// list set (universal), OR the vehicle's model name is in `vehicleModels`, OR the
// vehicle's id is in `vehicleTrims`. Keying off the accessory's own lists rather than a
// name match on the submitted line is what makes the delivery-pack duplication bug
// impossible even if something upstream misbehaves. `accessory` here is a raw DB row
// (vehicleModels / vehicleTrims are JSON strings); `vehicle` is `{ id, name }`.
// Mirrors accessoryAppliesToVehicle() in frontend/src/utils/accessoryScope.js.
function accessoryAppliesToVehicle(accessory, vehicle) {
  if (!vehicle) return false;
  const models = JSON.parse(accessory.vehicleModels || '[]');
  const trims = JSON.parse(accessory.vehicleTrims || '[]');
  if (models.length === 0 && trims.length === 0) return true;
  return models.includes(vehicle.name) || trims.includes(vehicle.id);
}

async function resolveAccessories(items, vehicle) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const resolved = [];
  for (const item of items) {
    // A salesperson's own accessory (not in the catalog): name and price come from the
    // request, as entered in the quote builder. It sits in the Accessoires ('techniek')
    // section and, like the towing hook, the discount does not apply to it unless the
    // saved line already said so.
    if (item && item.custom === true) {
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const price = Number(item.price);
      if (!name || name.length > 120) {
        const error = new Error('Een eigen accessoire heeft een naam nodig (max. 120 tekens)');
        error.status = 400;
        throw error;
      }
      if (!Number.isFinite(price) || price < 0 || price > 1000000) {
        const error = new Error(`Ongeldige prijs voor eigen accessoire "${name}"`);
        error.status = 400;
        throw error;
      }
      const quantity = Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 100 ? item.quantity : 1;
      // A saved colour or upholstery whose catalog row was since switched off comes back
      // as a custom line too; it keeps its category so it still counts as the quote's
      // colour (no second, default colour is added) and stays single-select.
      const category = CUSTOM_LINE_CATEGORIES.includes(item.category) ? item.category : 'techniek';
      resolved.push({ id: null, custom: true, name, price: Math.round(price * 100) / 100, quantity, category, discountable: item.discountable === true });
      continue;
    }
    if (!item || typeof item.id !== 'string') {
      const error = new Error('Elke optie moet een geldig id hebben');
      error.status = 400;
      throw error;
    }
    const accessory = await getAsync('SELECT * FROM accessories WHERE id = ? AND active = 1', [item.id]);
    if (!accessory) {
      const error = new Error(`Optie niet gevonden of niet meer actief: ${item.id}`);
      error.status = 400;
      throw error;
    }
    // Only reject when the vehicle is known — a PUT that can't resolve the quote's vehicle
    // (deleted trim) still needs to keep whatever was already on it.
    if (vehicle && !accessoryAppliesToVehicle(accessory, vehicle)) {
      const error = new Error(`Optie "${accessory.name}" is niet beschikbaar voor dit voertuig`);
      error.status = 400;
      throw error;
    }
    // Capped rather than just clamped to a positive integer — the quote builder never
    // sends more than 1 per line itself (there's no per-accessory quantity input in the
    // UI), so this is purely a backstop against a hand-crafted request ballooning the
    // total with an absurd quantity on an otherwise-valid accessory id.
    const MAX_ACCESSORY_QUANTITY = 100;
    const quantity = Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= MAX_ACCESSORY_QUANTITY
      ? item.quantity
      : 1;
    resolved.push({ id: accessory.id, name: accessory.name, price: accessory.price, quantity, category: accessory.category, discountable: !!accessory.discountable });
  }

  // Two lines with the same name on one quote are merged by the boot-time clean-up
  // (dedupeDoubledQuoteItems in database/init.js) and the edit form matches lines to the
  // catalog by name, so a custom line may not share its name with another line or with
  // an active catalog option.
  const customLines = resolved.filter((line) => line.custom);
  if (customLines.length > 0) {
    const catalogNames = new Set((await allAsync('SELECT name FROM accessories WHERE active = 1')).map((row) => row.name.toLowerCase()));
    const seen = new Set();
    for (const line of resolved) {
      const key = line.name.toLowerCase();
      if (seen.has(key) || (line.custom && line.category === 'techniek' && catalogNames.has(key))) {
        const error = new Error(`"${line.name}" staat al op de offerte of in de optielijst — kies een andere naam`);
        error.status = 400;
        throw error;
      }
      seen.add(key);
    }
  }
  return resolved.map(({ custom, ...line }) => line);
}

// Categories a custom line may keep: the Accessoires section, or the colour/upholstery
// slot for a saved option whose catalog row was since switched off.
const CUSTOM_LINE_CATEGORIES = ['techniek', 'exterior', 'interior'];

// Checks the single-select categories (e.g. one paint colour) on the submitted options.
// "Mandatory" accessories (the Delivery Pack) are no longer forced in here: the quote
// builder ticks them by default, but a salesperson may untick them, so what the client
// sends is what gets billed.
function checkSingleSelect(merged) {

  for (const category of SINGLE_SELECT_CATEGORIES) {
    const picked = merged.filter((a) => a.category === category);
    if (picked.length > 1) {
      const error = new Error(`Er kan maar één optie uit de categorie "${category}" gekozen worden (gekozen: ${picked.map((p) => p.name).join(', ')})`);
      error.status = 400;
      throw error;
    }
  }

  return merged;
}

// The free standard paint colour ('Standaardkleur: Wit', €0, seeded in database/init.js)
// stands in whenever a quote has no exterior colour of its own — a customer who doesn't
// upgrade to a paid metallic still gets a colour line on the quote and PDF, and the
// stock-match in QuoteBuilder has an id to key off. It can't be a `mandatory` accessory:
// 'exterior' is single-select, so checkSingleSelect above would reject any quote
// that also carries a paid colour. So it's applied here as a fallback only — never when
// an exterior colour is already present. Mirrors QuoteBuilder/QuoteEditor, which
// pre-select it in the live preview.
const STANDARD_PAINT_ACCESSORY_ID = 'paint-standard-white';

// Models whose free standard colour is one of their own paint rows instead of the shared
// "Standaardkleur: Wit" — the E5's is Snowy White (€0, prijslijst juli 2026), the Starray
// EM-i's Alpine White, the E2's Moon White. The fallback
// below picks that row when it's active, else the shared white. Mirrors
// MODEL_STANDARD_PAINT_IDS in frontend/src/utils/constants.js.
const MODEL_STANDARD_PAINT_IDS = {
  'Geely E5': 'e5-paint-moss',
  'Starray EM-i': 'emi-paint-alpine',
  'Geely E2': 'e2-paint-moon-white',
};

async function applyDefaultPaintColor(resolvedAccessories, vehicle) {
  if (resolvedAccessories.some((a) => a.category === 'exterior')) return resolvedAccessories;
  const candidates = [vehicle && MODEL_STANDARD_PAINT_IDS[vehicle.name], STANDARD_PAINT_ACCESSORY_ID].filter(Boolean);
  let row = null;
  for (const id of candidates) {
    const found = await getAsync('SELECT * FROM accessories WHERE id = ? AND active = 1', [id]);
    if (found && (!vehicle || accessoryAppliesToVehicle(found, vehicle))) { row = found; break; }
  }
  if (!row) return resolvedAccessories;
  return [
    ...resolvedAccessories,
    { id: row.id, name: row.name, price: row.price, quantity: 1, category: row.category, discountable: !!row.discountable },
  ];
}

function csvEscape(value) {
  let str = value === null || value === undefined ? '' : String(value);
  // Excel/Sheets/LibreOffice treat a cell starting with =, +, -, @, or a tab/CR as a
  // formula on open — a customer or company name is free text a colleague typed in,
  // so without this guard a crafted name becomes a formula (e.g. =HYPERLINK(...)) that
  // runs the moment whoever opens this export clicks into that cell.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Get all quotes (search, status filter, pagination)
router.get('/', async (req, res) => {
  try {
    await purgeExpiredShowroomQuotes();
    const { search, status, expiringSoon, needsFollowup } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];
    if (search) {
      conditions.push('(LOWER(customerName) LIKE ? OR LOWER(customerEmail) LIKE ? OR LOWER(customerCompany) LIKE ?)');
      const term = `%${search.toLowerCase()}%`;
      params.push(term, term, term);
    }
    if (status && QUOTE_STATUSES.includes(status)) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (expiringSoon === 'true') {
      // Only quotes still awaiting a decision can meaningfully "expire" — an
      // accepted/declined quote's expiresAt date is no longer operationally relevant.
      const cutoff = new Date(Date.now() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000).toISOString();
      conditions.push(`status IN (${OPEN_STATUSES.map(() => '?').join(', ')})`, 'expiresAt IS NOT NULL', 'expiresAt <= ?');
      params.push(...OPEN_STATUSES, cutoff);
    }
    if (needsFollowup === 'true') {
      // 'sent' and quiet ever since — a customer who already accepted/declined doesn't
      // need a nudge, and a quote that's still a draft was never waiting on them.
      const cutoff = new Date(Date.now() - FOLLOWUP_REMINDER_DAYS * 24 * 60 * 60 * 1000).toISOString();
      conditions.push("status = 'sent'", 'sentAt IS NOT NULL', 'sentAt <= ?');
      params.push(cutoff);
    }
    // Belt-and-suspenders alongside purgeExpiredShowroomQuotes() above: even if the purge
    // were skipped or raced, an expired showroom sheet must never show in the list.
    conditions.push("(isShowroom = 0 OR datetime(createdAt) > datetime('now', '-2 hours'))");
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const totalRow = await getAsync(`SELECT COUNT(*) AS count FROM quotes ${whereClause}`, params);
    const quotes = await allAsync(
      `SELECT * FROM quotes ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      quotes: quotes.map(q => ({ ...q, configuration: JSON.parse(q.configuration) })),
      total: totalRow.count,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalRow.count / limit)),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export all quotes as CSV
router.get('/export.csv', async (req, res) => {
  try {
    await purgeExpiredShowroomQuotes();
    // Showroom sheets are ephemeral floor material, not part of the offer record — the
    // CSV is a business export, so they're left out entirely regardless of age.
    const quotes = await allAsync('SELECT * FROM quotes WHERE isShowroom = 0 ORDER BY createdAt DESC');
    const header = ['Offertenummer', 'Klant', 'Type', 'E-mail', 'Telefoon', 'Adres', 'Bedrijf', 'BTW-nummer', 'Model', 'Status', 'Korting', 'Totaal excl. BTW', 'BTW', 'Totaal incl. BTW', 'Verkoper', 'Datum'];
    const lines = [header.map(csvEscape).join(',')];

    quotes.forEach((q) => {
      const configuration = JSON.parse(q.configuration || '{}');
      const discount = q.discountType === 'fixed'
        ? (q.discountEuro > 0 ? `€${q.discountEuro}` : '')
        : (q.discountPercentage > 0 ? `${q.discountPercentage}%` : '');
      const address = [q.customerStreet, [q.customerPostalCode, q.customerCity].filter(Boolean).join(' ')].filter(Boolean).join(', ');
      lines.push([
        formatQuoteNumber(q),
        q.customerName,
        q.customerType === 'bedrijf' ? 'Bedrijf' : 'Particulier',
        q.customerEmail,
        q.customerPhone,
        address,
        q.customerCompany,
        q.customerVatNumber,
        `${configuration.vehicleName || ''} ${configuration.vehicleModel || ''}`.trim(),
        q.status,
        discount,
        q.subtotal,
        q.vatAmount,
        q.totalPrice,
        q.createdByName,
        q.createdAt,
      ].map(csvEscape).join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="offertes-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('﻿' + lines.join('\n')); // BOM so Excel opens UTF-8 correctly
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Looks up past quotes for the same customer by email, phone, or VAT number, so a rep
// can recognize a repeat/existing customer while filling in the customer form instead of
// treating every quote as a first contact. Matches on ANY of the three identifiers (a
// customer might reuse the same email with a new phone, or vice versa). Phone numbers are
// compared with separators stripped and the country code collapsed to the leading "0"
// Belgians actually dial, since "+32 470 12 34 56", "0032470123456", and "0470123456" are
// all the same number typed differently.
function normalizePhone(value) {
  let digits = String(value || '').replace(/[\s.\-/]/g, '');
  if (digits.startsWith('+32')) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith('0032')) digits = `0${digits.slice(4)}`;
  return digits;
}
// Same normalization, applied to the stored column so both sides compare equal —
// strip separators first, then collapse whichever country-code form is present.
const PHONE_MATCH_SQL = `
  REPLACE(
    REPLACE(
      REPLACE(REPLACE(REPLACE(REPLACE(customerPhone, ' ', ''), '.', ''), '-', ''), '/', ''),
    '0032', '0'),
  '+32', '0') = ?
`;

router.get('/customer-history', async (req, res) => {
  try {
    const { email, phone, vatNumber, excludeId } = req.query;
    const normalizedEmail = email ? email.trim().toLowerCase() : '';
    const normalizedPhone = phone ? normalizePhone(phone) : '';
    const normalizedVat = vatNumber ? normalizeVatNumber(vatNumber) : '';

    if (!normalizedEmail && !normalizedPhone && !normalizedVat) {
      return res.json([]);
    }

    const conditions = [];
    const params = [];
    if (normalizedEmail) {
      conditions.push('LOWER(customerEmail) = ?');
      params.push(normalizedEmail);
    }
    if (normalizedPhone) {
      conditions.push(PHONE_MATCH_SQL);
      params.push(normalizedPhone);
    }
    if (normalizedVat) {
      conditions.push('customerVatNumber = ?');
      params.push(normalizedVat);
    }

    let whereClause = `(${conditions.join(' OR ')})`;
    if (excludeId) {
      whereClause += ' AND id != ?';
      params.push(excludeId);
    }

    const quotes = await allAsync(
      `SELECT id, customerName, configuration, status, totalPrice, createdAt FROM quotes WHERE ${whereClause} ORDER BY createdAt DESC LIMIT 20`,
      params
    );

    res.json(quotes.map((q) => {
      const configuration = JSON.parse(q.configuration || '{}');
      return {
        id: q.id,
        customerName: q.customerName,
        vehicleLabel: `${configuration.vehicleName || ''} ${configuration.vehicleModel || ''}`.trim(),
        status: q.status,
        totalPrice: q.totalPrice,
        createdAt: q.createdAt,
      };
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get quote by ID
router.get('/:id', async (req, res) => {
  try {
    const quote = await getAsync('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const items = await allAsync(
      'SELECT * FROM quote_items WHERE quoteId = ?',
      [req.params.id]
    );

    res.json({
      ...quote,
      configuration: JSON.parse(quote.configuration),
      items
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new quote
router.post('/', async (req, res) => {
  try {
    // A showroomaanbieding is a throwaway floor sheet: no customer, no trade-in, no offer
    // number, self-deletes after ~2h. Everything customer-related is forced to a neutral
    // placeholder here so the rest of this handler (and the schema's NOT NULL customerName)
    // needs no special-casing.
    const isShowroom = req.body.isShowroom === true;

    const {
      selectedVehicleId,
      configuration,
      discountType = 'percentage',
      discountValue = 0,
      accessories = [],
      notes,
      language = 'nl',
    } = req.body;

    const customerName = isShowroom ? 'Showroom' : req.body.customerName;
    const customerEmail = isShowroom ? undefined : req.body.customerEmail;
    const customerPhone = isShowroom ? undefined : req.body.customerPhone;
    const customerCompany = isShowroom ? undefined : req.body.customerCompany;
    const customerType = isShowroom ? 'particulier' : (req.body.customerType || 'particulier');
    const customerVatNumber = isShowroom ? undefined : req.body.customerVatNumber;
    const customerStreet = isShowroom ? undefined : req.body.customerStreet;
    const customerPostalCode = isShowroom ? undefined : req.body.customerPostalCode;
    const customerCity = isShowroom ? undefined : req.body.customerCity;
    const tradeInEnabled = isShowroom ? false : (req.body.tradeInEnabled ?? false);
    const { tradeInMake, tradeInModel, tradeInYear, tradeInMileage } = req.body;
    const tradeInValue = isShowroom ? 0 : (req.body.tradeInValue ?? 0);

    if (!customerName || !selectedVehicleId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!['particulier', 'bedrijf'].includes(customerType)) {
      return res.status(400).json({ error: 'customerType must be "particulier" or "bedrijf"' });
    }
    if (!QUOTE_LANGUAGES.includes(language)) {
      return res.status(400).json({ error: `language must be one of: ${QUOTE_LANGUAGES.join(', ')}` });
    }
    if (tradeInEnabled && (!Number.isFinite(tradeInValue) || tradeInValue < 0)) {
      return res.status(400).json({ error: 'tradeInValue must be a non-negative number' });
    }
    if (tradeInEnabled) {
      const tradeInDetailsError = validateTradeInDetails(tradeInYear, tradeInMileage);
      if (tradeInDetailsError) {
        return res.status(400).json({ error: tradeInDetailsError });
      }
    }

    const vehicle = await getAsync('SELECT * FROM vehicles WHERE id = ?', [selectedVehicleId]);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const id = uuidv4();
    const basePrice = vehicle.basePrice;

    const resolvedAccessories = await applyDefaultPaintColor(
      checkSingleSelect(await resolveAccessories(accessories, vehicle)),
      vehicle
    );
    const accessoriesTotal = resolvedAccessories.reduce((sum, acc) => sum + acc.price * acc.quantity, 0);
    const nonDiscountableAccessoriesTotal = resolvedAccessories
      .filter((acc) => !acc.discountable)
      .reduce((sum, acc) => sum + acc.price * acc.quantity, 0);

    const validationError = validatePricingInputs(basePrice, accessoriesTotal, discountType, discountValue);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Calculate pricing — non-discountable accessories (mandatory fees, or "true"
    // accessories like a towing hook) are priced in full but excluded from the discount
    // base, see calculatePricing's docs.
    const pricing = calculatePricing(basePrice, accessoriesTotal, discountType, discountValue, nonDiscountableAccessoriesTotal);
    const branch = await resolveActorBranch(req.user);
    // A showroomaanbieding gets no offer number (sequenceNumber NULL — formatQuoteNumber
    // shows "Showroom") and a short 2-hour lifetime instead of the usual QUOTE_VALIDITY_DAYS; the
    // purge sweep keys off createdAt, but expiresAt is set consistently anyway.
    const sequenceNumber = isShowroom ? null : await nextSequenceNumber();
    const expiresAt = new Date(Date.now() + (isShowroom ? 2 * 60 * 60 * 1000 : QUOTE_VALIDITY_MS)).toISOString();

    // Insert quote
    await runAsync(
      `INSERT INTO quotes (id, sequenceNumber, isShowroom, customerName, customerEmail, customerPhone, customerCompany, customerType, customerVatNumber, customerStreet, customerPostalCode, customerCity, selectedVehicleId, configuration, basePrice, accessories, discountType, discountPercentage, discountEuro, discountAmount, discountApprovalStatus, subtotal, vatAmount, totalPrice, notes, language, expiresAt, createdBy, createdByName, createdByEmail, createdByPhone, branchId, branchName, branchAddress, tradeInEnabled, tradeInMake, tradeInModel, tradeInYear, tradeInMileage, tradeInValue)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sequenceNumber,
        isShowroom ? 1 : 0,
        customerName,
        customerEmail || null,
        customerPhone || null,
        customerType === 'bedrijf' ? (customerCompany || null) : null,
        customerType,
        customerType === 'bedrijf' ? normalizeVatNumber(customerVatNumber) : null,
        customerStreet || null,
        customerPostalCode || null,
        customerCity || null,
        selectedVehicleId,
        JSON.stringify(configuration || {}),
        basePrice,
        accessoriesTotal,
        discountType,
        discountType === 'percentage' ? discountValue : 0,
        discountType === 'fixed' ? discountValue : 0,
        pricing.discountAmount,
        'not_required',
        pricing.subtotal,
        pricing.vat,
        pricing.total,
        notes || null,
        language,
        expiresAt,
        req.user.id,
        req.user.name,
        req.user.email,
        req.user.phone,
        branch.branchId,
        branch.branchName,
        branch.branchAddress,
        tradeInEnabled ? 1 : 0,
        tradeInEnabled ? (tradeInMake || null) : null,
        tradeInEnabled ? (tradeInModel || null) : null,
        tradeInEnabled ? (tradeInYear || null) : null,
        tradeInEnabled ? (tradeInMileage || null) : null,
        tradeInEnabled ? tradeInValue : 0,
      ]
    );

    // Add accessories as quote items
    for (const acc of resolvedAccessories) {
      const itemId = uuidv4();
      await runAsync(
        `INSERT INTO quote_items (id, quoteId, itemName, quantity, unitPrice, totalPrice, discountable)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [itemId, id, acc.name, acc.quantity, acc.price, acc.quantity * acc.price, acc.discountable ? 1 : 0]
      );
    }

    if (discountValue > 0) {
      await logAudit({
        entityType: 'quote',
        entityId: id,
        action: 'discount_applied',
        details: { discountType, discountValue },
        user: req.user,
      });
    }

    const quote = await getAsync('SELECT * FROM quotes WHERE id = ?', [id]);
    res.status(201).json({
      ...quote,
      configuration: JSON.parse(quote.configuration),
      items: resolvedAccessories
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Duplicate an existing quote (same vehicle/accessories/discount, blank customer fields, fresh draft)
router.post('/:id/duplicate', async (req, res) => {
  try {
    const source = await getAsync('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (!source) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    if (source.isShowroom) {
      return res.status(400).json({ error: 'Een showroomaanbieding kan niet gedupliceerd worden' });
    }
    const sourceItems = await allAsync('SELECT * FROM quote_items WHERE quoteId = ?', [req.params.id]);

    const id = uuidv4();
    // The copy is attributed to
    // whoever is actually making it, not wherever the original happened to be made.
    const branch = await resolveActorBranch(req.user);
    // A duplicate is a distinct new offer for tracking purposes — it gets its own fresh
    // number rather than inheriting the source's, same as it already gets a fresh id.
    const sequenceNumber = await nextSequenceNumber();

    await runAsync(
      `INSERT INTO quotes (id, sequenceNumber, customerName, customerEmail, customerPhone, customerCompany, customerType, customerVatNumber, customerStreet, customerPostalCode, customerCity, selectedVehicleId, configuration, basePrice, accessories, discountType, discountPercentage, discountEuro, discountAmount, discountApprovalStatus, subtotal, vatAmount, totalPrice, status, notes, language, expiresAt, createdBy, createdByName, createdByEmail, createdByPhone, branchId, branchName, branchAddress, tradeInEnabled, tradeInMake, tradeInModel, tradeInYear, tradeInMileage, tradeInValue)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, NULL, NULL, 0)`,
      [
        id,
        sequenceNumber,
        `${source.customerName} (kopie)`,
        null,
        null,
        null,
        'particulier',
        null,
        null,
        null,
        null,
        source.selectedVehicleId,
        source.configuration,
        source.basePrice,
        source.accessories,
        source.discountType,
        source.discountPercentage,
        source.discountEuro,
        source.discountAmount,
        'not_required',
        source.subtotal,
        source.vatAmount,
        source.totalPrice,
        source.notes,
        source.language || 'nl',
        new Date(Date.now() + QUOTE_VALIDITY_MS).toISOString(),
        req.user.id,
        req.user.name,
        req.user.email,
        req.user.phone,
        branch.branchId,
        branch.branchName,
        branch.branchAddress,
      ]
    );

    for (const item of sourceItems) {
      await runAsync(
        `INSERT INTO quote_items (id, quoteId, itemName, quantity, unitPrice, totalPrice, discountable) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), id, item.itemName, item.quantity, item.unitPrice, item.totalPrice, item.discountable]
      );
    }

    const quote = await getAsync('SELECT * FROM quotes WHERE id = ?', [id]);
    res.status(201).json({ ...quote, configuration: JSON.parse(quote.configuration) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// E-mail the quote PDF to the customer, marking the quote as sent
router.post('/:id/send-email', async (req, res) => {
  try {
    const { quote, vehicle, items } = await loadQuoteForPdf(req.params.id);
    if (quote.isShowroom) {
      return res.status(400).json({ error: 'Een showroomaanbieding kan niet gemaild worden' });
    }
    if (!quote.customerEmail) {
      return res.status(400).json({ error: 'Deze offerte heeft geen klant-e-mailadres' });
    }

    // Fresh acceptance token every send — same one-way-hashed scheme as the password
    // reset flow (routes/auth.js). A resend deliberately invalidates any earlier link.
    const acceptanceToken = crypto.randomBytes(32).toString('hex');
    const acceptanceTokenHash = crypto.createHash('sha256').update(acceptanceToken).digest('hex');
    const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?acceptQuote=${acceptanceToken}`;

    // A quote's expiresAt is fixed QUOTE_VALIDITY_DAYS out at creation and never otherwise renewed.
    // Sending it again after that window has already lapsed (e.g. a rep following up on
    // a stale "Vervolg nodig" quote) would otherwise hand the customer a link tied to that
    // same stale date — dead on arrival, or dead within hours. Re-quote it with a fresh
    // QUOTE_VALIDITY_DAYS window instead, so the emailed PDF, the "Geldig tot" date and the acceptance
    // link all agree and the link is actually usable for the period the customer is told.
    if (new Date(quote.expiresAt) <= new Date()) {
      quote.expiresAt = new Date(Date.now() + QUOTE_VALIDITY_MS).toISOString();
    }

    const pdfBuffer = await generateQuotePdfBuffer({ quote, vehicle, items });
    await sendQuoteEmail({
      to: quote.customerEmail,
      customerName: quote.customerName,
      vehicleLabel: `${vehicle.name} ${vehicle.model}`,
      salespersonName: quote.createdByName,
      pdfBuffer,
      filename: `${PDF[resolveLang(quote.language)].filenamePrefix}${formatQuoteNumber(quote)}_${quote.customerName.replace(/\s+/g, '_')}.pdf`,
      acceptUrl,
      language: quote.language,
    });

    await runAsync(
      `UPDATE quotes SET status = 'sent', expiresAt = ?, acceptanceTokenHash = ?, acceptanceTokenExpires = ?, sentAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [quote.expiresAt, acceptanceTokenHash, quote.expiresAt, req.params.id]
    );
    const updated = await getAsync('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    res.json({ ...updated, configuration: JSON.parse(updated.configuration) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Update quote
router.put('/:id', async (req, res) => {
  try {
    const {
      discountType, discountValue, accessories,
      customerName, customerEmail, customerPhone, customerCompany,
      customerType, customerVatNumber, customerStreet, customerPostalCode, customerCity,
      tradeInEnabled, tradeInMake, tradeInModel, tradeInYear, tradeInMileage, tradeInValue,
      notes, status, language,
    } = req.body;
    const quoteId = req.params.id;

    const quote = await getAsync('SELECT * FROM quotes WHERE id = ?', [quoteId]);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    if (quote.isShowroom) {
      return res.status(400).json({ error: 'Een showroomaanbieding kan niet bewerkt worden — verwijder ze en maak een nieuwe' });
    }
    if (!canModifyQuote(quote, req.user)) {
      return res.status(403).json({ error: 'Je kan enkel je eigen offertes bewerken' });
    }
    // A customer who already accepted this quote signed off on a specific price and
    // configuration — nothing before this point stopped a rep from then silently changing
    // the discount, accessories, or customer info on that same "accepted" quote with no
    // trace distinguishing it from an ordinary draft edit. Managers can still correct a
    // genuine mistake after the fact; a plain rep now needs one to do it.
    if (quote.status === 'accepted' && !isManagerRole(req.user.role)) {
      return res.status(403).json({ error: 'Deze offerte is al geaccepteerd door de klant — enkel een sales manager of beheerder kan ze nog wijzigen' });
    }

    if (status !== undefined && !QUOTE_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${QUOTE_STATUSES.join(', ')}` });
    }
    if (customerType !== undefined && !['particulier', 'bedrijf'].includes(customerType)) {
      return res.status(400).json({ error: 'customerType must be "particulier" or "bedrijf"' });
    }
    if (language !== undefined && !QUOTE_LANGUAGES.includes(language)) {
      return res.status(400).json({ error: `language must be one of: ${QUOTE_LANGUAGES.join(', ')}` });
    }
    const resolvedCustomerType = customerType !== undefined ? customerType : quote.customerType;
    const resolvedTradeInEnabled = tradeInEnabled !== undefined ? tradeInEnabled : !!quote.tradeInEnabled;
    const resolvedTradeInValue = tradeInValue !== undefined ? tradeInValue : quote.tradeInValue;
    if (resolvedTradeInEnabled && (!Number.isFinite(resolvedTradeInValue) || resolvedTradeInValue < 0)) {
      return res.status(400).json({ error: 'tradeInValue must be a non-negative number' });
    }
    // Validates only what THIS request actually submits, not the value inherited from the
    // existing row — tradeInYear/tradeInMileage were unvalidated before this check existed,
    // so a quote saved before then could already have a bad value sitting in the DB. Falling
    // back to that inherited value here (like the rest of this handler does for other
    // fields) would mean an edit that never touches the trade-in at all — fixing a typo in
    // the customer's name, say — gets rejected by a field it never submitted.
    if (resolvedTradeInEnabled) {
      const tradeInDetailsError = validateTradeInDetails(tradeInYear, tradeInMileage);
      if (tradeInDetailsError) {
        return res.status(400).json({ error: tradeInDetailsError });
      }
    }

    const basePrice = quote.basePrice;
    // Needed on every save (not just when accessories are resubmitted) since pricing —
    // and specifically which portion of it is exempt from the discount — is recalculated
    // unconditionally below, even for edits that only touch the discount or customer info.
    const vehicle = await getAsync('SELECT id, name FROM vehicles WHERE id = ?', [quote.selectedVehicleId]);

    let resolvedAccessories = null;
    if (accessories) {
      resolvedAccessories = await applyDefaultPaintColor(
        checkSingleSelect(await resolveAccessories(accessories, vehicle)),
        vehicle
      );
    }
    const accessoriesTotal = resolvedAccessories
      ? resolvedAccessories.reduce((sum, acc) => sum + acc.price * acc.quantity, 0)
      : quote.accessories;
    // If accessories weren't resubmitted, the discountable flag of each existing line has
    // to come from what was actually snapshotted onto quote_items when it was added — not
    // re-derived from the current catalog, which might have since changed or removed that
    // item entirely.
    const nonDiscountableAccessoriesTotal = resolvedAccessories
      ? resolvedAccessories.filter((acc) => !acc.discountable).reduce((sum, acc) => sum + acc.price * acc.quantity, 0)
      : (await getAsync(
          'SELECT COALESCE(SUM(unitPrice * quantity), 0) AS total FROM quote_items WHERE quoteId = ? AND discountable = 0',
          [quoteId]
        )).total;
    const resolvedDiscountType = discountType !== undefined ? discountType : quote.discountType;
    const resolvedDiscountValue = discountValue !== undefined
      ? discountValue
      : (resolvedDiscountType === 'fixed' ? quote.discountEuro : quote.discountPercentage);

    const validationError = validatePricingInputs(basePrice, accessoriesTotal, resolvedDiscountType, resolvedDiscountValue);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Non-discountable accessories (mandatory fees, or "true" accessories like a towing
    // hook) are priced in full but excluded from the discount base, see calculatePricing's
    // docs.
    const pricing = calculatePricing(basePrice, accessoriesTotal, resolvedDiscountType, resolvedDiscountValue, nonDiscountableAccessoriesTotal);

    const previousDiscountValue = quote.discountType === 'fixed' ? quote.discountEuro : quote.discountPercentage;
    const discountChanged = resolvedDiscountType !== quote.discountType || resolvedDiscountValue !== previousDiscountValue;
    const finalStatus = status || quote.status;

    // Only stamp sentAt on an actual draft->sent transition here — an edit that leaves an
    // already-sent quote as 'sent' (e.g. a typo fix) must not reset the follow-up clock.
    // send-email (above) always stamps it fresh since that's an explicit new send.
    const sentAt = finalStatus === 'sent' && quote.status !== 'sent' ? new Date().toISOString() : quote.sentAt;

    await runAsync(
      `UPDATE quotes SET discountType = ?, discountPercentage = ?, discountEuro = ?, discountAmount = ?, discountApprovalStatus = ?, accessories = ?, subtotal = ?, vatAmount = ?, totalPrice = ?, customerName = ?, customerEmail = ?, customerPhone = ?, customerCompany = ?, customerType = ?, customerVatNumber = ?, customerStreet = ?, customerPostalCode = ?, customerCity = ?, tradeInEnabled = ?, tradeInMake = ?, tradeInModel = ?, tradeInYear = ?, tradeInMileage = ?, tradeInValue = ?, notes = ?, language = ?, status = ?, sentAt = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        resolvedDiscountType,
        resolvedDiscountType === 'percentage' ? resolvedDiscountValue : 0,
        resolvedDiscountType === 'fixed' ? resolvedDiscountValue : 0,
        pricing.discountAmount,
        'not_required',
        accessoriesTotal,
        pricing.subtotal,
        pricing.vat,
        pricing.total,
        customerName || quote.customerName,
        customerEmail !== undefined ? customerEmail : quote.customerEmail,
        customerPhone !== undefined ? customerPhone : quote.customerPhone,
        // Company name/VAT number only make sense for 'bedrijf' — switching a quote back
        // to 'particulier' clears them rather than leaving stale company data attached.
        resolvedCustomerType === 'bedrijf' ? (customerCompany !== undefined ? customerCompany : quote.customerCompany) : null,
        resolvedCustomerType,
        resolvedCustomerType === 'bedrijf'
          ? (customerVatNumber !== undefined ? normalizeVatNumber(customerVatNumber) : quote.customerVatNumber)
          : null,
        customerStreet !== undefined ? customerStreet : quote.customerStreet,
        customerPostalCode !== undefined ? customerPostalCode : quote.customerPostalCode,
        customerCity !== undefined ? customerCity : quote.customerCity,
        resolvedTradeInEnabled ? 1 : 0,
        resolvedTradeInEnabled ? (tradeInMake !== undefined ? tradeInMake : quote.tradeInMake) : null,
        resolvedTradeInEnabled ? (tradeInModel !== undefined ? tradeInModel : quote.tradeInModel) : null,
        resolvedTradeInEnabled ? (tradeInYear !== undefined ? tradeInYear : quote.tradeInYear) : null,
        resolvedTradeInEnabled ? (tradeInMileage !== undefined ? tradeInMileage : quote.tradeInMileage) : null,
        resolvedTradeInEnabled ? resolvedTradeInValue : 0,
        notes !== undefined ? notes : quote.notes,
        language !== undefined ? language : quote.language,
        finalStatus,
        sentAt,
        quoteId,
      ]
    );

    // Update quote items if accessories provided
    if (resolvedAccessories) {
      await runAsync('DELETE FROM quote_items WHERE quoteId = ?', [quoteId]);
      for (const acc of resolvedAccessories) {
        const itemId = uuidv4();
        await runAsync(
          `INSERT INTO quote_items (id, quoteId, itemName, quantity, unitPrice, totalPrice, discountable)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [itemId, quoteId, acc.name, acc.quantity, acc.price, acc.quantity * acc.price, acc.discountable ? 1 : 0]
        );
      }
    }

    if (discountChanged) {
      await logAudit({
        entityType: 'quote',
        entityId: quoteId,
        action: 'discount_changed',
        details: {
          from: { type: quote.discountType, value: previousDiscountValue },
          to: { type: resolvedDiscountType, value: resolvedDiscountValue },
        },
        user: req.user,
      });
    }
    if (status !== undefined && status !== quote.status) {
      await logAudit({
        entityType: 'quote',
        entityId: quoteId,
        action: 'status_changed',
        details: { from: quote.status, to: status },
        user: req.user,
      });
    }

    const updatedQuote = await getAsync('SELECT * FROM quotes WHERE id = ?', [quoteId]);
    const updatedItems = await allAsync('SELECT * FROM quote_items WHERE quoteId = ?', [quoteId]);
    res.json({
      ...updatedQuote,
      configuration: JSON.parse(updatedQuote.configuration),
      items: updatedItems,
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Delete a quote
router.delete('/:id', async (req, res) => {
  try {
    const quote = await getAsync('SELECT id, createdBy FROM quotes WHERE id = ?', [req.params.id]);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    if (!canModifyQuote(quote, req.user)) {
      return res.status(403).json({ error: 'Je kan enkel je eigen offertes verwijderen' });
    }

    await runAsync('DELETE FROM quote_items WHERE quoteId = ?', [req.params.id]);
    await runAsync('DELETE FROM quotes WHERE id = ?', [req.params.id]);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
