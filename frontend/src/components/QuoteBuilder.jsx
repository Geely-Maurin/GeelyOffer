import React, { useState, useEffect, useRef } from 'react'
import { api, formatPrice } from '../utils/api'
import {
  DISCOUNT_TYPES, DISCOUNT_TYPE_LABELS,
  SINGLE_SELECT_CATEGORIES,
} from '../utils/constants'
import { accessoryAppliesToVehicle, standardPaintFor } from '../utils/accessoryScope'
import { missingCustomerFields } from '../utils/customerInfo'
import { useAuth } from '../context/AuthContext'
import VehicleSelector from './VehicleSelector'
import VariantSelector from './VariantSelector'
import AccessoriesSelector from './AccessoriesSelector'
import PricingSummary from './PricingSummary'
import CustomerForm from './CustomerForm'
import TradeInForm from './TradeInForm'
import MissingCustomerInfoModal from './MissingCustomerInfoModal'
import { VEHICLE_IMAGES, colorFrontImageFor, VEHICLE_STANDARD_COLOR_IMAGES, STANDARD_PAINT_NAME, VEHICLE_REAR_IMAGES, VEHICLE_INTERIOR_IMAGES, VEHICLE_UPHOLSTERY_IMAGES } from '../utils/vehicleImages'

function QuoteBuilder({ onQuoteCreated }) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  // Each step is a full new screen of content — jump back to the top so the customer
  // doesn't land mid-page (e.g. scrolled down while picking accessories) on the next step.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])
  const [vehicles, setVehicles] = useState([])
  const [accessories, setAccessories] = useState([])
  const [selectedModel, setSelectedModel] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [selectedAccessories, setSelectedAccessories] = useState([])
  // A new offer starts with a fixed-amount discount; the rep can switch to a percentage.
  const [discountType, setDiscountType] = useState('fixed')
  const [discountValue, setDiscountValue] = useState(0)
  const [pricing, setPricing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Required customer fields still empty when "Offerte aanmaken" was clicked; non-null
  // shows the pop-up listing them.
  const [missingFields, setMissingFields] = useState(null)
  const [customerInfo, setCustomerInfo] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerType: 'particulier',
    customerCompany: '',
    customerVatNumber: '',
    customerStreet: '',
    customerPostalCode: '',
    customerCity: '',
    notes: '',
    language: 'nl'
  })
  const [tradeIn, setTradeIn] = useState({
    tradeInEnabled: false,
    tradeInMake: '',
    tradeInModel: '',
    tradeInYear: '',
    tradeInMileage: '',
    tradeInValue: 0,
  })
  // "Showroomaanbieding" mode: a throwaway floor sheet with no customer step and no offer
  // number, auto-deleted server-side ~2h after creation. Switching mode restarts the flow.
  const [isShowroom, setIsShowroom] = useState(false)
  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedVariant) {
      calculatePricing()
    }
  }, [selectedVariant, selectedAccessories, discountType, discountValue])

  // "Mandatory" accessories (the delivery pack) are ticked by default: added whenever the
  // model or trim is picked, so every new offer starts with them. The salesperson can
  // untick them in step 3, and the backend bills exactly what is sent.
  useEffect(() => {
    if (!selectedModel || accessories.length === 0) return
    // Once a trim is picked we scope by it exactly; before that (step 1/2) we still match
    // whole-model mandatory fees against the model name.
    const previewVehicle = selectedVariant || { id: null, name: selectedModel }
    const applicable = accessories.filter((a) => a.mandatory && accessoryAppliesToVehicle(a, previewVehicle))
    // Collapse same-named mandatory fees (e.g. a "Delivery Pack" that ends up both
    // model-specific and "all models") to one, preferring the more specifically scoped row
    // instead of adding the fee twice.
    const scopeCount = (a) => (a.vehicleModels?.length || 0) + (a.vehicleTrims?.length || 0)
    const mandatory = []
    for (const a of applicable) {
      const dupeIndex = mandatory.findIndex((m) => m.name === a.name)
      if (dupeIndex === -1) mandatory.push(a)
      else if (scopeCount(a) && !scopeCount(mandatory[dupeIndex])) mandatory[dupeIndex] = a
    }
    if (mandatory.length === 0) return
    setSelectedAccessories((prev) => {
      const missing = mandatory.filter((m) => !prev.some((p) => p.id === m.id || p.name === m.name))
      return missing.length ? [...prev, ...missing] : prev
    })
  }, [selectedModel, selectedVariant, accessories])

  // Every quote carries an exterior-colour line: the free "Standaardkleur: Wit" (€0)
  // stands in whenever the customer doesn't upgrade to a paid metallic. Re-added here
  // whenever the exterior category is empty — a fresh model pick, or the rep clearing a
  // paid colour — while picking a paid colour swaps it out via the single-select branch
  // in the selector's onSelect handler below. The backend applies the same fallback on
  // save (applyDefaultPaintColor in routes/quotes.js); this just keeps the live preview
  // honest.
  // Switching trims can invalidate an option that was only offered on the previous one
  // (e.g. an interior colour available on MAX+ but not PRO) — drop those so the quote and
  // the save request stay consistent with the chosen trim.
  useEffect(() => {
    if (!selectedVariant) return
    setSelectedAccessories((prev) => {
      const kept = prev.filter((a) => accessoryAppliesToVehicle(a, selectedVariant))
      return kept.length === prev.length ? prev : kept
    })
  }, [selectedVariant])

  useEffect(() => {
    if (!selectedModel || accessories.length === 0) return
    const previewVehicle = selectedVariant || { id: null, name: selectedModel }
    const standardColor = standardPaintFor(accessories, previewVehicle)
    if (!standardColor) return
    setSelectedAccessories((prev) =>
      prev.some((a) => a.category === 'exterior') ? prev : [...prev, standardColor]
    )
  }, [selectedModel, selectedVariant, accessories, selectedAccessories])

  // Guards against a slower, stale calculatePricing() response overwriting a newer one —
  // e.g. rapid discount edits can fire two overlapping requests, and without this the one
  // that happens to resolve last (not the one actually matching the current form) wins.
  // Guards against a slower, stale response overwriting a newer one.
  const pricingRequestIdRef = useRef(0)

  const loadData = async () => {
    try {
      setLoading(true)
      const [vehiclesData, accessoriesData] = await Promise.all([
        api.getVehicles(),
        api.getAccessories()
      ])
      setVehicles(vehiclesData)
      setAccessories(accessoriesData)
    } catch (err) {
      setError('Failed to load data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const calculatePricing = async () => {
    if (!selectedVariant) return

    const requestId = ++pricingRequestIdRef.current
    try {
      const lineTotal = (acc) => acc.price * (acc.quantity || 1)
      const accessoriesTotal = selectedAccessories.reduce((sum, acc) => sum + lineTotal(acc), 0)
      const nonDiscountableAccessoriesTotal = selectedAccessories.filter((acc) => !acc.discountable).reduce((sum, acc) => sum + lineTotal(acc), 0)
      const pricingData = await api.calculatePricing(
        selectedVariant.basePrice,
        accessoriesTotal,
        discountType,
        discountValue,
        nonDiscountableAccessoriesTotal
      )
      if (requestId !== pricingRequestIdRef.current) return
      setPricing(pricingData)
    } catch (err) {
      if (requestId !== pricingRequestIdRef.current) return
      setError('Failed to calculate pricing: ' + err.message)
    }
  }

  const handleCreateQuote = async () => {
    const missing = missingCustomerFields(customerInfo)
    if (missing.length > 0) {
      setMissingFields(missing)
      setStep(4)
      return
    }

    try {
      setLoading(true)
      const quoteData = {
        ...customerInfo,
        ...tradeIn,
        selectedVehicleId: selectedVariant.id,
        configuration: {
          vehicleName: selectedVariant.name,
          vehicleModel: selectedVariant.model,
        },
        accessories: selectedAccessories,
        discountType,
        discountValue
      }

      await api.createQuote(quoteData)
      setError('')
      alert('Offerte succesvol aangemaakt!')
      onQuoteCreated()
    } catch (err) {
      setError('Failed to create quote: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateShowroom = async () => {
    try {
      setLoading(true)
      await api.createQuote({
        isShowroom: true,
        selectedVehicleId: selectedVariant.id,
        configuration: {
          vehicleName: selectedVariant.name,
          vehicleModel: selectedVariant.model,
        },
        accessories: selectedAccessories,
        discountType,
        discountValue,
      })
      setError('')
      alert('Showroomaanbieding aangemaakt. Ze verdwijnt automatisch na 2 uur.')
      onQuoteCreated()
    } catch (err) {
      setError('Kon showroomaanbieding niet aanmaken: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Switching between a normal quote and a showroom sheet restarts the flow — the two
  // diverge from step 1 (different step count, no customer step for showroom).
  const switchMode = (showroom) => {
    if (showroom === isShowroom) return
    setIsShowroom(showroom)
    setStep(1)
    setSelectedModel(null)
    setSelectedVariant(null)
    setSelectedAccessories([])
    setDiscountType('fixed')
    setDiscountValue(0)
    setPricing(null)
    setError('')
  }

  if (loading && vehicles.length === 0) {
    return <div className="loading"><div className="spinner" /></div>
  }

  // Live photo preview for the sidebar summary — swaps to the real photo of whichever
  // paint color the customer has picked (falling back to the model's default photo for
  // colors Geely hasn't photographed yet, or before any color is chosen). The rear photo
  // is fixed per model rather than per color — see VEHICLE_REAR_IMAGES in
  // utils/vehicleImages.js for why.
  const selectedColorAccessory = selectedAccessories.find((acc) => acc.category === 'exterior')
  const previewFrontImage = (selectedColorAccessory && colorFrontImageFor(selectedColorAccessory.name))
    || (selectedColorAccessory?.name === STANDARD_PAINT_NAME && selectedVariant && VEHICLE_STANDARD_COLOR_IMAGES[selectedVariant.name])
    || (selectedVariant && VEHICLE_IMAGES[selectedVariant.name])
  const previewRearImage = selectedVariant && VEHICLE_REAR_IMAGES[selectedVariant.name]
  // Interior photo follows the selected upholstery the same way, falling back to the
  // model's standard (dark) upholstery when none is picked.
  const selectedInteriorAccessory = selectedAccessories.find((acc) => acc.category === 'interior')
  const previewInteriorImage = (selectedInteriorAccessory && VEHICLE_UPHOLSTERY_IMAGES[selectedInteriorAccessory.name])
    || (selectedVariant && VEHICLE_INTERIOR_IMAGES[selectedVariant.name])

  const stepLabels = isShowroom
    ? ['Model', 'Uitvoering', 'Opties']
    : ['Model', 'Uitvoering', 'Opties', 'Klantgegevens']

  return (
    <div className="page-shell">
      {error && <div className="error">{error}</div>}
      {missingFields && (
        <MissingCustomerInfoModal
          missingFields={missingFields}
          message="De offerte kan nog niet aangemaakt worden."
          onClose={() => setMissingFields(null)}
        />
      )}

      <div className="card offer-type-card">
        <div className="section-kicker">Wat wil je maken?</div>
        <div className="offer-type-toggle" role="tablist" aria-label="Type offerte">
          <button
            type="button"
            role="tab"
            aria-selected={!isShowroom}
            className={`offer-type-option ${!isShowroom ? 'selected' : ''}`}
            onClick={() => switchMode(false)}
          >
            <span className="offer-type-title">Klantofferte</span>
            <span className="offer-type-desc">Volledige offerte met klantgegevens en offertenummer.</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isShowroom}
            className={`offer-type-option ${isShowroom ? 'selected' : ''}`}
            onClick={() => switchMode(true)}
          >
            <span className="offer-type-title">Showroomaanbieding</span>
            <span className="offer-type-desc">Prijskaart voor naast de wagen. Geen klantgegevens, geen offertenummer, verdwijnt na 2 uur.</span>
          </button>
        </div>
      </div>

      <div className={`stepper ${isShowroom ? 'stepper--3' : ''}`} aria-label="Quote steps">
        {stepLabels.map((label, index) => (
          <div key={label} className={`step-item ${step === index + 1 ? 'active' : ''}`}>
            <div className="step-number">{index + 1}</div>
            <div className="step-name">{label}</div>
          </div>
        ))}
      </div>

      <div className="builder-shell">
        <div className="builder-main">
          {step === 1 && (
            <div>
              <div className="card">
                <div className="section-kicker">Stap 1</div>
                <h2 className="section-title">Kies je model</h2>
                <VehicleSelector
                  vehicles={vehicles}
                  selectedModel={selectedModel}
                  onSelect={(model) => {
                    setSelectedModel(model)
                    setSelectedVariant(null)
                    setSelectedAccessories([])
                    setDiscountType('fixed')
                    setDiscountValue(0)
                    setPricing(null)
                  }}
                />
              </div>

              <div className="card">
                <div className="section-kicker">Navigatie</div>
                <div className="btn-group">
                  <button
                    className="btn btn-primary"
                    onClick={() => setStep(2)}
                    disabled={!selectedModel}
                  >
                    Ga verder →
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && selectedModel && (
            <div>
              <div className="card">
                <div className="section-kicker">Stap 2</div>
                <h2 className="section-title">Kies je uitvoering</h2>
                <VariantSelector
                  vehicles={vehicles}
                  selectedModel={selectedModel}
                  selectedVariant={selectedVariant}
                  onSelect={setSelectedVariant}
                />
              </div>

              <div className="card">
                <div className="section-kicker">Navigatie</div>
                <div className="btn-group">
                  <button className="btn btn-outline" onClick={() => setStep(1)}>
                    ← Terug naar model
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => setStep(3)}
                    disabled={!selectedVariant}
                  >
                    Ga verder →
                  </button>
                </div>
              </div>

              {selectedVariant && pricing && (
                <div className="card">
                  <div className="section-kicker">Basisprijs</div>
                  <PricingSummary pricing={pricing} />
                </div>
              )}
            </div>
          )}

          {step === 3 && selectedVariant && (
            <div>
              <div className="card">
                <div className="section-kicker">Stap 3</div>
                <h2 className="section-title">Opties en accessoires</h2>
                <AccessoriesSelector
                  accessories={accessories}
                  selectedAccessories={selectedAccessories}
                  vehicle={selectedVariant}
                  onSelectAccessory={(acc) => {
                    const alreadySelected = selectedAccessories.find(a => a.id === acc.id)
                    if (alreadySelected) {
                      setSelectedAccessories(selectedAccessories.filter(a => a.id !== acc.id))
                    } else if (SINGLE_SELECT_CATEGORIES.includes(acc.category)) {
                      // Only one option per single-select category (e.g. paint color) —
                      // picking a new one replaces whatever was selected in that category.
                      setSelectedAccessories([...selectedAccessories.filter(a => a.category !== acc.category), acc])
                    } else {
                      setSelectedAccessories([...selectedAccessories, acc])
                    }
                  }}
                />
              </div>

              <div className="card">
                <div className="section-kicker">Korting</div>
                <div className="form-row">
                  <div className="form-group" style={{ maxWidth: '220px' }}>
                    <label>Type korting</label>
                    <select value={discountType} onChange={(e) => { setDiscountType(e.target.value); setDiscountValue(0) }}>
                      {DISCOUNT_TYPES.map((t) => (
                        <option key={t} value={t}>{DISCOUNT_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ maxWidth: '220px' }}>
                    <label>{discountType === 'fixed' ? 'Korting (€)' : 'Korting (%)'}</label>
                    <input
                      type="number"
                      min="0"
                      max={discountType === 'percentage' ? 100 : pricing?.subtotalBeforeDiscount}
                      step={discountType === 'percentage' ? 0.5 : 1}
                      value={discountValue}
                      onChange={(e) => {
                        const raw = parseFloat(e.target.value) || 0
                        // A fixed discount above the pre-discount total is never meaningful
                        // (the backend already caps the actual deduction there — see
                        // calculatePricing — but letting the rep type/see a nonsensical
                        // number here first makes PricingSummary show two disagreeing
                        // figures for the same discount).
                        setDiscountValue(
                          discountType === 'percentage'
                            ? Math.min(100, Math.max(0, raw))
                            : Math.max(0, pricing?.subtotalBeforeDiscount !== undefined ? Math.min(raw, pricing.subtotalBeforeDiscount) : raw)
                        )
                      }}
                    />
                  </div>
                </div>
              </div>

              {pricing && (
                <div className="card">
                  <div className="section-kicker">Samenvatting</div>
                  <PricingSummary pricing={pricing} />
                </div>
              )}

              <div className="card">
                <div className="section-kicker">Navigatie</div>
                <div className="btn-group">
                  <button className="btn btn-outline" onClick={() => setStep(2)}>
                    ← Terug naar uitvoering
                  </button>
                  {isShowroom ? (
                    <button
                      className="btn btn-success"
                      onClick={handleCreateShowroom}
                      disabled={loading || !selectedVariant || !pricing}
                    >
                      {loading ? 'Aanmaken...' : 'Showroomaanbieding aanmaken'}
                    </button>
                  ) : (
                    <button className="btn btn-primary" onClick={() => setStep(4)} disabled={!selectedVariant || !pricing}>
                      Ga verder →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 4 && selectedVariant && (
            <div>
              <div className="card">
                <div className="section-kicker">Stap 4</div>
                <h2 className="section-title">Klantgegevens</h2>
                <CustomerForm
                  customerInfo={customerInfo}
                  onChange={setCustomerInfo}
                />
              </div>

              <div className="card">
                <div className="section-kicker">Optioneel</div>
                <h2 className="section-title">Inruilwagen</h2>
                <TradeInForm tradeIn={tradeIn} onChange={setTradeIn} />
              </div>

              {pricing && (
                <div className="card">
                  <div className="section-kicker">Offerte</div>
                  <h3 className="section-title">Overzicht</h3>
                  <div style={{ marginBottom: '18px' }}>
                    <p><strong>Model:</strong> {selectedVariant.name} {selectedVariant.model}</p>
                    {selectedAccessories.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <strong>Geselecteerde opties:</strong>
                        <ul style={{ margin: '10px 0 0 18px' }}>
                          {selectedAccessories.map(acc => (
                            <li key={acc.id}>{acc.name} — {formatPrice(acc.price)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <PricingSummary pricing={pricing} tradeInValue={tradeIn.tradeInEnabled ? tradeIn.tradeInValue : 0} />
                </div>
              )}

              <div className="card">
                <div className="section-kicker">Navigatie</div>
                <div className="btn-group">
                  <button className="btn btn-outline" onClick={() => setStep(3)}>
                    ← Terug naar opties
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={handleCreateQuote}
                    disabled={loading}
                  >
                    {loading ? 'Aanmaken...' : 'Offerte aanmaken'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {pricing && selectedVariant && (
          <aside className="builder-side">
            {pricing && selectedVariant && (
              <div className="card summary-card">
                <div className="section-kicker">Actuele offerte</div>
                <h3 className="section-title" style={{ marginBottom: '12px' }}>{selectedVariant.name}</h3>
                {previewFrontImage && (
                  <div className="vehicle-color-preview">
                    <div className="vehicle-color-preview-image">
                      <img src={previewFrontImage} alt={`${selectedVariant.name}${selectedColorAccessory ? ` — ${selectedColorAccessory.name.replace(/^[^:]+:\s*/, '')}` : ''}`} />
                    </div>
                    {previewRearImage && (
                      <div className="vehicle-color-preview-image vehicle-color-preview-secondary">
                        <img src={previewRearImage} alt={`${selectedVariant.name} — achteraanzicht`} />
                        <span className="vehicle-color-preview-caption">Referentiebeeld — kleur op deze hoek kan afwijken van uw keuze</span>
                      </div>
                    )}
                    {previewInteriorImage && (
                      <div className="vehicle-color-preview-image vehicle-color-preview-secondary">
                        <img src={previewInteriorImage} alt={`${selectedVariant.name} — interieur`} />
                      </div>
                    )}
                  </div>
                )}
                <div className="summary-row">
                  <span>Uitvoering</span>
                  <strong>{selectedVariant.model}</strong>
                </div>
                <div className="summary-row">
                  <span>Basisprijs</span>
                  <strong>{formatPrice(selectedVariant.basePrice)}</strong>
                </div>
                {selectedAccessories.length > 0 && (
                  <div className="summary-row">
                    <span>Opties</span>
                    <strong>{formatPrice(selectedAccessories.reduce((sum, acc) => sum + acc.price, 0))}</strong>
                  </div>
                )}
                {discountValue > 0 && (
                  <div className="summary-row">
                    <span>Korting</span>
                    <strong>{discountType === 'fixed' ? formatPrice(discountValue) : `${discountValue}%`}</strong>
                  </div>
                )}
                <div className="summary-total">
                  <span>Totaal incl. BTW</span>
                  <span>{formatPrice(pricing.total)}</span>
                </div>
                <div className="summary-total-note">
                  <span>Totaal excl. BTW</span>
                  <span>{formatPrice(pricing.subtotal)}</span>
                </div>
              </div>
            )}

          </aside>
        )}
      </div>
    </div>
  )
}

export default QuoteBuilder
