import React from 'react'
import { formatPrice } from '../utils/api'
import { SINGLE_SELECT_CATEGORIES } from '../utils/constants'
import { accessoriesForVehicle } from '../utils/accessoryScope'

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
  const categories = [...new Set(availableAccessories.map(a => a.category))]

  return (
    <div className="option-list">
      {categories.map(category => {
        const isSingleSelect = SINGLE_SELECT_CATEGORIES.includes(category)
        return (
          <div key={category} className="option-category">
            <h4 className="option-category-title">
              {category === 'verplicht' ? 'Standaard' : category.charAt(0).toUpperCase() + category.slice(1)}
              {isSingleSelect && <span className="option-category-hint"> — kies max. 1</span>}
            </h4>
            <div className="option-category-list">
              {availableAccessories
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
                      </div>
                      <div className="option-price">{formatPrice(acc.price)}</div>
                    </label>
                  )
                })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default AccessoriesSelector
