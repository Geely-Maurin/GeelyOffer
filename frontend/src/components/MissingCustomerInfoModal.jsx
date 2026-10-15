import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Pop-up shown when a rep tries to create or save an offer while required customer details
// are still empty: it names exactly which ones, instead of a greyed-out button that gives
// no clue why it won't work. Closing it puts the cursor in the first missing field.
// Rendered into <body> so it also sits on top when opened from inside the QuoteEditor modal.
function MissingCustomerInfoModal({ missingFields, message, onClose }) {
  const close = () => {
    onClose()
    const input = document.getElementById(missingFields[0]?.inputId)
    if (input) {
      input.scrollIntoView({ block: 'center' })
      input.focus({ preventScroll: true })
    }
  }
  const closeRef = useRef(close)
  closeRef.current = close

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // stopPropagation on both: React bubbles portal events up the component tree, and the
  // QuoteEditor's own overlay would otherwise read this click as "close the editor".
  return createPortal(
    <div className="modal-overlay" onClick={(e) => { e.stopPropagation(); close() }}>
      <div
        className="modal-card"
        style={{ maxWidth: '440px', marginTop: '10vh' }}
        role="alertdialog"
        aria-labelledby="missing-customer-info-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="missing-customer-info-title" className="section-title" style={{ marginBottom: 0 }}>
            Klantgegevens onvolledig
          </h2>
        </div>
        <p style={{ marginBottom: 0 }}>{message} Vul eerst deze gegevens in:</p>
        <ul className="missing-fields-list">
          {missingFields.map((field) => <li key={field.key}>{field.label}</li>)}
        </ul>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={close} autoFocus>
            Gegevens aanvullen
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default MissingCustomerInfoModal
