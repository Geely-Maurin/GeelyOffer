export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'declined']

export const STATUS_LABELS = {
  draft: 'Concept',
  sent: 'Verzonden',
  accepted: 'Geaccepteerd',
  declined: 'Geweigerd',
}

// Inventory units use a different status vocabulary than quotes above — shared between
// AdminAuditLog.jsx and AdminPrivacy.jsx so the two can't drift apart (e.g. a status
// renamed in one place silently going stale in the other).
export const INVENTORY_STATUSES = ['in_stock', 'incoming', 'reserved', 'sold']

export const INVENTORY_STATUS_LABELS = {
  in_stock: 'Op voorraad',
  incoming: 'Onderweg',
  reserved: 'Gereserveerd',
  sold: 'Verkocht',
}

export const ROLES = ['admin', 'sales_manager', 'sales']

export const ROLE_LABELS = {
  admin: 'Beheerder',
  sales_manager: 'Sales Manager',
  sales: 'Verkoper',
}

// 'fixed' first: the discount type dropdown lists 'Vast bedrag' before 'Percentage'.
export const DISCOUNT_TYPES = ['fixed', 'percentage']

export const DISCOUNT_TYPE_LABELS = {
  percentage: 'Percentage (%)',
  fixed: 'Vast bedrag (€)',
}

// A car can only have one paint color, and only one interior/upholstery, at a time —
// categories listed here are rendered as mutually exclusive in AccessoriesSelector
// (picking one automatically clears any other selection in the same category), instead of
// independent checkboxes. 'interior' is included even though every model currently has
// only one interior option (so it's never actually been ambiguous yet) — once a model gets
// a second one, this is what keeps a customer from ending up with two interiors selected,
// which would make the quote ambiguous.
export const SINGLE_SELECT_CATEGORIES = ['exterior', 'interior']

// The free €0 standard paint colour ("Standaardkleur: Wit") seeded in
// backend/src/database/init.js (seedStandardPaintColorIfMissing) and applicable to every
// model. QuoteBuilder and QuoteEditor pre-select it whenever a quote has no exterior
// colour, so every quote carries a colour line; picking a paid metallic replaces it. The backend applies the same fallback on save
// (applyDefaultPaintColor in routes/quotes.js), so it stays authoritative there too.
export const STANDARD_PAINT_ACCESSORY_ID = 'paint-standard-white'

// Models whose free standard colour is one of their own paint rows instead of the shared
// "Standaardkleur: Wit" — the E5's is Snowy White (€0, prijslijst juli 2026), the Starray
// EM-i's Alpine White, the E2's Moon White. While that
// row is in the catalog, the shared row is hidden for the model so the picker never shows
// two free whites, and the default-colour fallback picks the model's own row (see
// standardPaintFor in utils/accessoryScope.js). Mirrors MODEL_STANDARD_PAINT_IDS in
// backend/src/routes/quotes.js.
export const MODEL_STANDARD_PAINT_IDS = {
  'Geely E5': 'e5-paint-moss',
  'Starray EM-i': 'emi-paint-alpine',
  'Geely E2': 'e2-paint-moon-white',
}

// Language the customer-facing PDF and e-mail are generated in — see
// backend/src/i18n/translate.js. The app UI itself stays Dutch regardless of this choice.
export const QUOTE_LANGUAGES = ['nl', 'fr']

export const QUOTE_LANGUAGE_LABELS = {
  nl: 'Nederlands',
  fr: 'Français',
}
