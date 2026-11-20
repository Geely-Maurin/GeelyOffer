import React, { useState } from 'react'
import { formatPrice } from '../utils/api'
import { SINGLE_SELECT_CATEGORIES } from '../utils/constants'
import { accessoriesForVehicle, standardPaintFor } from '../utils/accessoryScope'

// The catalog category the "Accessoires" section is built from (towing hook, charging
// cables). A salesperson's own accessories are added to this section too.
const ACCESSORY_CATEGORY = 'techniek'

const CATEGORY_TITLES = { verplicht: 'Standaard', [ACCESSORY_CATEGORY]: 'Accessoires' }
const categoryTitle = (category) => CATEGORY_TITLES[category] || category.charAt(0).toUpperCase() + category.slice(1)

// A salesperson's own accessory: a free-text name and price (incl. BTW). It is not in the
// catalog, so it is sent to the server with custom: true and priced as entered — like the
// towing hook it is a "true accessory" that the discount does not apply to.
export function makeCustomAccessory(name, price) {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    custom: true,
    name,
    price,
    quantity: 1,
    category: ACCESSORY_CATEGORY,
    discountable: false,
  }
}

function CustomAccessoryForm({ onAdd }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const parsedPrice = Number(String(price).replace(',', '.'))
  const valid = name.trim() !== '' && price !== '' && Number.isFinite(parsedPrice) && parsedPrice >= 0
  const add = () => {
    if (!valid) return
    onAdd(makeCustomAccessory(name.trim(), Math.round(parsedPrice * 100) / 100))
    setName('')
    setPrice('')
  }
  return (
    <div className="custom-accessory-form">
      <input
        type="text"
        placeholder="Eigen accessoire (bv. Dakdragers)"
        value={name}
        maxLength={120}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
      />
      <input
        type="text"
        inputMode="decimal"
        placeholder="Prijs incl. btw (€)"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
      />
      <button type="button" className="btn btn-outline" onClick={add} disabled={!valid}>Toevoegen</button>
    </div>
  )
}

function AccessoriesSelector({ accessories, selectedAccessories, onSelectAccessory, vehicle }) {
  // Show only the options scoped to this exact trim — by whole-model name or by trim id
  // (see accessoryAppliesToVehicle / AdminAccessories.jsx's "Beschikbaar voor").
  const applicableAccessories = accessoriesForVehicle(accessories, vehicle)
  // Collapse accessories that share a name and both apply here (e.g. a "Delivery
  // Pack" that has drifted to also being "all models" alongside the model-specific one),
  // preferring the more specifically scoped row — otherwise it renders as two identical
  // rows and gets counted twice.
  const scopeCount = a => (a.vehicleModels?.length || 0) + (a.vehicleTrims?.length || 0)
  const availableAccessories = []
  for (const acc of applicableAccessories) {
    const i = availableAccessories.findIndex(a => a.name === acc.name && a.category === acc.category)
    if (i === -1) availableAccessories.push(acc)
    else if (scopeCount(acc) && !scopeCount(availableAccessories[i])) availableAccessories[i] = acc
  }
  // The salesperson's own accessories are listed with the catalog ones of their section.
  const customAccessories = selectedAccessories.filter(a => a.custom)
  // The model's free standard colour is always listed first among the colours.
  const standardPaintId = standardPaintFor(accessories, vehicle)?.id
  const shownAccessories = [...availableAccessories, ...customAccessories]
    .sort((a, b) => (b.id === standardPaintId) - (a.id === standardPaintId))
  // The Accessoires section always shows, so there is always a place to add your own.
  const categories = [...new Set([...availableAccessories.map(a => a.category), ACCESSORY_CATEGORY])]

  return (
    <div className="option-list">
      {categories.map(category => {
        const isSingleSelect = SINGLE_SELECT_CATEGORIES.includes(category)
        return (
          <div key={category} className="option-category">
            <h4 className="option-category-title">
              {categoryTitle(category)}
              {isSingleSelect && <span className="option-category-hint"> — kies max. 1</span>}
            </h4>
            <div className="option-category-list">
              {shownAccessories
                .filter(acc => acc.category === category)
                .map(acc => {
                  // A "mandatory" accessory (the delivery pack) is ticked by default when an
                  // offer starts, but the salesperson can untick it like any other option.
                  const selected = selectedAccessories.some(a => a.id === acc.id)

                  return (
                    <label
                      key={acc.id}
                      className={`option-item ${selected ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onSelectAccessory(acc)}
                      />
                      {acc.colorHex && (
                        <span className="option-color-swatch" style={{ backgroundColor: acc.colorHex }} title={acc.colorHex} />
                      )}
                      <div className="option-copy">
                        <div className="option-title">{acc.name}</div>
                        {acc.mandatory && <div className="option-mandatory-note">Standaard inbegrepen</div>}
                        {acc.custom && <div className="option-mandatory-note">Eigen accessoire</div>}
                      </div>
                      <div className="option-price">{formatPrice(acc.price)}</div>
                    </label>
                  )
                })}
              {category === ACCESSORY_CATEGORY && <CustomAccessoryForm onAdd={onSelectAccessory} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default AccessoriesSelector
