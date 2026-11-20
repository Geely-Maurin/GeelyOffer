import React from 'react'
import { formatPrice, exclVat } from '../utils/api'

// Known specification keys, in display order — label lookup with a fallback to the
// raw key so an unrecognized future spec still shows up instead of silently vanishing.
const SPEC_LABELS = {
  battery: 'Batterij',
  range: 'Actieradius',
  evRange: 'Elektrische actieradius',
  totalRange: 'Totale actieradius',
  charger: 'Laden',
  wheels: 'Wielen',
}
const SPEC_KEY_ORDER = ['battery', 'range', 'evRange', 'totalRange', 'charger', 'wheels']

function parseSpecs(vehicle) {
  try {
    return JSON.parse(vehicle.specifications || '{}')
  } catch {
    return {}
  }
}

// Builds the spec rows shown on each uitvoering card — cheapest to priciest. Only rows
// that actually differ between variants are kept — trims of the same model often share
// power/torque/charging, and listing those as if they were differences would defeat the
// point of a "what's different" view. Price is handled separately (always shown, never
// filtered), since it must never be mistaken for an optional/omittable spec row.
function buildComparisonRows(variants) {
  const candidateRows = []

  if (variants.some((v) => v.power)) {
    candidateRows.push({ label: 'Vermogen', values: variants.map((v) => (v.power ? `${v.power} pk` : '—')) })
  }
  if (variants.some((v) => v.torque)) {
    candidateRows.push({ label: 'Koppel', values: variants.map((v) => (v.torque ? `${v.torque} Nm` : '—')) })
  }
  if (variants.some((v) => v.consumption)) {
    candidateRows.push({
      label: 'Verbruik',
      values: variants.map((v) => (v.consumption ? `${v.consumption} ${v.fuel === 'Elektrisch' ? 'kWh' : 'L'}/100km` : '—')),
    })
  }

  const specs = variants.map(parseSpecs)
  SPEC_KEY_ORDER.filter((key) => specs.some((s) => s[key])).forEach((key) => {
    candidateRows.push({ label: SPEC_LABELS[key], values: specs.map((s) => s[key] || '—') })
  })

  return candidateRows.filter((row) => new Set(row.values).size > 1)
}

// Same fallback chain as the PDF cover page (backend/src/routes/pdf.js) so the range
// shown here always matches what ends up on the actual offer.
function rangeValue(variant) {
  const specs = parseSpecs(variant)
  return specs.range || specs.totalRange || specs.evRange || null
}

// One card per uitvoering with its prices and the specs that differ between the trims,
// so they can be compared side by side while picking one.
function VariantSelector({ vehicles, selectedModel, selectedVariant, onSelect }) {
  // Trims of the selected model, cheapest first (PRO → PRO+ → MAX+, PRO → MAX → ULTRA) —
  // the API returns them alphabetically, which put MAX/MAX+ before PRO.
  const variants = vehicles
    .filter(v => v.name === selectedModel)
    .sort((a, b) => a.basePrice - b.basePrice)
  const rows = buildComparisonRows(variants)

  return (
    <div className="vehicles-grid">
      {variants.map((variant, i) => (
        <div
          key={variant.id}
          className={`vehicle-card variant-card ${selectedVariant?.id === variant.id ? 'selected' : ''}`}
          onClick={() => onSelect(variant)}
        >
          <div className="vehicle-info">
            <div className="vehicle-caption">Geely</div>
            <div className="vehicle-name">{variant.model}</div>
            <div className="variant-prices">
              <div className="compare-variant-price">
                <span className="compare-price-label">Basisprijs incl. BTW</span>
                <strong className="compare-price-value">{formatPrice(variant.basePrice)}</strong>
              </div>
              <div className="compare-variant-price compare-variant-price-excl">
                <span className="compare-price-label">Basisprijs excl. BTW</span>
                <strong className="compare-price-value">{formatPrice(exclVat(variant.basePrice))}</strong>
              </div>
            </div>
            {rows.length > 0 ? (
              <ul className="compare-variant-specs">
                {rows.map((row) => (
                  <li key={row.label}>
                    <span>{row.label}</span>
                    <strong>{row.values[i]}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              // A model with a single uitvoering has nothing to compare: show its key facts.
              <div className="vehicle-badges">
                <span className="vehicle-badge">{variant.fuel}</span>
                {rangeValue(variant) && <span className="vehicle-badge">Actieradius {rangeValue(variant)}</span>}
                {variant.power && <span className="vehicle-badge">{variant.power} pk</span>}
              </div>
            )}
            {variant.deliveryEstimate && (
              <div className="vehicle-delivery">Levertijd: {variant.deliveryEstimate}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default VariantSelector
