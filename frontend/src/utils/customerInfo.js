// Naam, e-mail, telefoon en volledig adres are always required; a "bedrijf" customer
// additionally needs a company name and VAT number — so the offer always carries
// everything needed to actually contact and (for a company) invoice the customer.
// Listed in the order CustomerForm shows them; `label` matches the form's own label and
// `inputId` is that input's id, so the pop-up can name the field and jump to it.
const REQUIRED_FIELDS = [
  { key: 'customerName', label: 'Volledige naam', inputId: 'name' },
  { key: 'customerEmail', label: 'E-mail', inputId: 'email' },
  { key: 'customerPhone', label: 'Telefoon', inputId: 'phone' },
  { key: 'customerVatNumber', label: 'BTW-nummer', inputId: 'vat', companyOnly: true },
  { key: 'customerCompany', label: 'Bedrijfsnaam', inputId: 'company', companyOnly: true },
  { key: 'customerStreet', label: 'Straat + nr', inputId: 'street' },
  { key: 'customerPostalCode', label: 'Postcode', inputId: 'postalCode' },
  { key: 'customerCity', label: 'Gemeente', inputId: 'city' },
]

// The required customer fields that are still empty (or only spaces), in form order.
export function missingCustomerFields(info) {
  const isBedrijf = info.customerType === 'bedrijf'
  return REQUIRED_FIELDS.filter((field) =>
    (!field.companyOnly || isBedrijf) && !String(info[field.key] ?? '').trim()
  )
}
