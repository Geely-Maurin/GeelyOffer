import React, { useState } from 'react'
import { formatPrice } from '../utils/api'
import { SINGLE_SELECT_CATEGORIES } from '../utils/constants'
import { accessoriesForVehicle, standardPaintFor } from '../utils/accessoryScope'

// The catalog category the "Accessoires" section is built from (towing hook, charging
// cables). A salesperson's own accessories are added to this section too.
const ACCESSORY_CATEGORY = 'techniek'

const CATEGORY_TITLES = { verplicht: 'Standaard', [ACCESSORY_CATEGORY]: 'Accessoires', onderhoud: 'Onderhoudscontract (Club Serenity)' }
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

function CustomAccessoryForm({ onAdd, takenNames }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const parsedPrice = Number(String(price).replace(',', '.'))
  // A name already on the offer or in the option list is refused (the server does too):
  // same-named lines would be merged into one.
  const nameTaken = takenNames.has(name.trim().toLowerCase())
  const valid = name.trim() !== '' && !nameTaken && price !== '' && Number.isFinite(parsedPrice) && parsedPrice >= 0
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
      {nameTaken && <div className="option-mandatory-note" style={{ gridColumn: '1 / -1' }}>Deze naam staat al in de lijst — kies die optie of een andere naam.</div>}
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
  // Colours are listed from cheapest to most expensive, the model's free standard colour
  // always first; other sections keep their catalog order.
  const standardPaintId = standardPaintFor(accessories, vehicle)?.id
  const byColourOrder = (a, b) => (b.id === standardPaintId) - (a.id === standardPaintId)
    || a.price - b.price
    || a.name.localeCompare(b.name)
  const shownAccessories = [...availableAccessories, ...customAccessories]
  const inCategory = (category) => {
    const list = shownAccessories.filter(acc => acc.category === category)
    return category === 'exterior' ? list.sort(byColourOrder) : list
  }
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
              {inCategory(category)
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
                      <div className="option-copy">
                        <div className="option-title">{acc.name}</div>
                        {acc.mandatory && <div className="option-mandatory-note">Standaard inbegrepen</div>}
                        {acc.custom && <div className="option-mandatory-note">Eigen accessoire</div>}
                      </div>
                      <div className="option-price">{formatPrice(acc.price)}</div>
                    </label>
                  )
                })}
              {category === ACCESSORY_CATEGORY && (
                <CustomAccessoryForm
                  onAdd={onSelectAccessory}
                  takenNames={new Set([...accessories, ...selectedAccessories].map(a => a.name.toLowerCase()))}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default AccessoriesSelector
