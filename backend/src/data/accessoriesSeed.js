// One-time seed data for the `accessories` table (paint colors, upholstery, add-ons).
// After first boot, the database is the source of truth — edit accessories via the
// admin panel (or the /api/accessories endpoints), not this file.
//
// colorHex is a representative swatch, not an exact OEM paint code (Geely doesn't
// publish those publicly) — cross-checked against Geely's official color lineups
// (an official Peru "ficha técnica" PDF for the E5/EX5, and independent listings for
// the Starray EM-i) so the name and approximate shade are accurate, close enough to
// give a customer a fair idea of the color, while pixel-perfect matching would need
// the actual paint sample.
export const STANDARD_ACCESSORIES = [
  // Geely E5 - Paint colors (verified against Geely's official E5/EX5 lineup: Carbon
  // Black, Frost Grey, Moonlight Silver, Snowy White, Turquoise Green). The row id
  // 'e5-paint-moss' is Snowy White for historical reasons; the real Moss Green (PRO+ /
  // MAX+ only) is in GEELY_E5_LATER_ACCESSORIES below. Snowy White is the E5's standard
  // colour (€0 on every trim, prijslijst juli 2026); the others are €650.
  { id: 'e5-paint-turquoise', name: 'Metallic: Turquoise Green', price: 650, category: 'exterior', vehicleModels: ['Geely E5'], colorHex: '#5E9284' },
  { id: 'e5-paint-black', name: 'Metallic: Carbon Black', price: 650, category: 'exterior', vehicleModels: ['Geely E5'], colorHex: '#1B1B1D' },
  { id: 'e5-paint-grey', name: 'Metallic: Frost Grey', price: 650, category: 'exterior', vehicleModels: ['Geely E5'], colorHex: '#9CA3A8' },
  { id: 'e5-paint-silver', name: 'Metallic: Moonlight Silver', price: 650, category: 'exterior', vehicleModels: ['Geely E5'], colorHex: '#CDD0D2' },
  { id: 'e5-paint-moss', name: 'Standaardkleur: Snowy White', price: 0, category: 'exterior', vehicleModels: ['Geely E5'], colorHex: '#F5F5F2' },
  // Geely E5 - Upholstery
  { id: 'e5-upholstery-ivory', name: 'Bekleding: Ivory White TEP-leder', price: 500, category: 'interior', vehicleModels: ['Geely E5'] },

  // Starray EM-i - Paint colors (verified: Glacier Blue, Polar Black, Volcanic Grey,
  // Cloudveil Silver, Jungle Green all confirmed as genuine Geely Starray EM-i colors)
  { id: 'emi-paint-glacier', name: 'Metallic: Glacier Blue', price: 650, category: 'exterior', vehicleModels: ['Starray EM-i'], colorHex: '#7098BE' },
  { id: 'emi-paint-polar', name: 'Metallic: Polar Black', price: 650, category: 'exterior', vehicleModels: ['Starray EM-i'], colorHex: '#18181A' },
  { id: 'emi-paint-volcanic', name: 'Metallic: Volcanic Grey', price: 650, category: 'exterior', vehicleModels: ['Starray EM-i'], colorHex: '#4B4C4E' },
  { id: 'emi-paint-cloudveil', name: 'Metallic: Cloudveil Silver', price: 650, category: 'exterior', vehicleModels: ['Starray EM-i'], colorHex: '#C9CBCD' },
  { id: 'emi-paint-jungle', name: 'Metallic: Jungle Green', price: 650, category: 'exterior', vehicleModels: ['Starray EM-i'], colorHex: '#2F4B3C' },
  // Starray EM-i - Upholstery
  { id: 'emi-upholstery-amber', name: 'Bekleding: Amber Brown TEP-leder', price: 500, category: 'interior', vehicleModels: ['Starray EM-i'] }
  // Towing hook ("Trekhaak") is deliberately NOT listed here — like the mandatory
  // Delivery Pack, it's seeded exclusively via seedTowingHookIfMissing() in
  // database/init.js, which runs on every boot (fresh or existing). Listing an id in both
  // places races seedAccessoriesIfEmpty against it on a brand-new database — both would
  // try to insert the same id and the second one crashes on a UNIQUE constraint violation.
];

// Geely E2 options, from the official "Geely E2 Prijslijst 2026 | België" (pages 4 and 6).
// Kept out of STANDARD_ACCESSORIES above because that list only seeds a totally empty
// table — the E2 arrived after most databases were already seeded, so these are inserted
// per id on every boot by seedGeelyE2AccessoriesIfMissing() in database/init.js instead.
//
// Paint: Moon White is the E2's free standard colour (€0), its own row shown instead of
// the shared "Standaardkleur: Wit" (see MODEL_STANDARD_PAINT_IDS in routes/quotes.js). Nebula Beige and Aurora Green
// are "Standaardlak" (solid, non-metallic) but still carry a surcharge per the price list
// (€350 and €650 incl. BTW); the other three are metallic at €650. All six colours are
// available on every trim. colorHex is a representative swatch taken from the brochure
// photos (see the note at the top of this file).
//
// Upholstery: Horizon Grey TEP-leder is standard on every trim (no row, same as the E5 /
// Starray standard upholstery); Skyline White TEP-leder (€500) is ULTRA-only, so it is
// scoped by trim id rather than by model.
// Geely E5 colours added after most databases were already seeded, inserted per id on
// every boot the same way as the E2 rows below. Moss Green: €650 incl. BTW on PRO+ and
// MAX+, not available on PRO (prijslijst juli 2026), so it is scoped by trim id.
export const GEELY_E5_LATER_ACCESSORIES = [
  { id: 'e5-paint-moss-green', name: 'Metallic: Moss Green', price: 650, category: 'exterior', vehicleModels: [], vehicleTrims: ['geely-e5-pro-plus', 'geely-e5-max-plus'], colorHex: '#2F5A3A' },
  // The Starray EM-i's free standard colour is Alpine White (€0), shown instead of the
  // shared "Standaardkleur: Wit" — see MODEL_STANDARD_PAINT_IDS in routes/quotes.js.
  { id: 'emi-paint-alpine', name: 'Standaardkleur: Alpine White', price: 0, category: 'exterior', vehicleModels: ['Starray EM-i'], vehicleTrims: [], colorHex: '#F2F3F1' },
];

// Club Serenity maintenance plans, from "Prijzen Club Serenity Geely BE 2027" (klanten-
// tarieven incl. BTW, 01/01/2027). One plan covers 2–5 maintenance services; the service
// interval differs per model (Starray EM-i every 1 year / 15.000 km, E2 and E5 every
// 1 year / 20.000 km). Category 'onderhoud' is single-select (one plan per car) and the
// plans are fixed tariffs, so the vehicle discount does not apply (discountable = 0).
// Inserted per id on every boot by seedMaintenancePlansIfMissing() in database/init.js;
// prices are edited afterwards in Beheer → Opties.
const clubSerenityPlan = (key, models, intervalKm, services, price) => ({
  id: `club-serenity-${key}-${services}`,
  name: `Club Serenity: ${services} onderhoudsbeurten (1 jaar / ${intervalKm} km)`,
  price,
  category: 'onderhoud',
  vehicleModels: models,
  vehicleTrims: [],
});

export const CLUB_SERENITY_PLANS = [
  clubSerenityPlan('e2-e5', ['Geely E2', 'Geely E5'], '20.000', 2, 389),
  clubSerenityPlan('e2-e5', ['Geely E2', 'Geely E5'], '20.000', 3, 499),
  clubSerenityPlan('e2-e5', ['Geely E2', 'Geely E5'], '20.000', 4, 1149),
  clubSerenityPlan('e2-e5', ['Geely E2', 'Geely E5'], '20.000', 5, 1259),
  clubSerenityPlan('starray', ['Starray EM-i'], '15.000', 2, 909),
  clubSerenityPlan('starray', ['Starray EM-i'], '15.000', 3, 1399),
  clubSerenityPlan('starray', ['Starray EM-i'], '15.000', 4, 2019),
  clubSerenityPlan('starray', ['Starray EM-i'], '15.000', 5, 2389),
];

export const GEELY_E2_ACCESSORIES = [
  { id: 'e2-paint-moon-white', name: 'Standaardkleur: Moon White', price: 0, category: 'exterior', vehicleModels: ['Geely E2'], vehicleTrims: [], colorHex: '#F4F4F1' },
  { id: 'e2-paint-nebula-beige', name: 'Standaardlak: Nebula Beige', price: 350, category: 'exterior', vehicleModels: ['Geely E2'], vehicleTrims: [], colorHex: '#D6CFBE' },
  { id: 'e2-paint-aurora-green', name: 'Standaardlak: Aurora Green', price: 650, category: 'exterior', vehicleModels: ['Geely E2'], vehicleTrims: [], colorHex: '#B4C9A2' },
  { id: 'e2-paint-nova-pink', name: 'Metallic: Nova Pink', price: 650, category: 'exterior', vehicleModels: ['Geely E2'], vehicleTrims: [], colorHex: '#D7B7BD' },
  { id: 'e2-paint-comet-grey', name: 'Metallic: Comet Grey', price: 650, category: 'exterior', vehicleModels: ['Geely E2'], vehicleTrims: [], colorHex: '#6F706E' },
  { id: 'e2-paint-star-silver', name: 'Metallic: Star Silver', price: 650, category: 'exterior', vehicleModels: ['Geely E2'], vehicleTrims: [], colorHex: '#B9C0C8' },
  { id: 'e2-upholstery-skyline-white', name: 'Bekleding: Skyline White TEP-leder', price: 500, category: 'interior', vehicleModels: [], vehicleTrims: ['geely-e2-ultra'] },
];
