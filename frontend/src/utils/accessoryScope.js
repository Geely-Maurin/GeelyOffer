import { STANDARD_PAINT_ACCESSORY_ID, MODEL_STANDARD_PAINT_IDS } from './constants'

// An accessory is scoped to a vehicle (trim) in two independent ways: by whole-model name
// (`vehicleModels`) and by exact trim id (`vehicleTrims`). It applies to a vehicle when it
// has neither list set (universal — "Alle modellen"), OR the vehicle's model name is in
// `vehicleModels`, OR the vehicle's exact id is in `vehicleTrims`.
//
// `vehicle` is a vehicle row with at least `{ id, name }`. During quote building the
// specific trim may not be chosen yet — passing `{ name }` alone still resolves
// whole-model scoping correctly; a trim-only accessory just won't match until the trim is
// picked, which is fine (we don't know which trim it is yet).
//
// Mirrors accessoryAppliesToVehicle() in backend/src/routes/quotes.js — keep the two in
// sync.
export function accessoryAppliesToVehicle(accessory, vehicle) {
  if (!vehicle) return false
  const models = accessory.vehicleModels || []
  const trims = accessory.vehicleTrims || []
  if (models.length === 0 && trims.length === 0) return true
  return models.includes(vehicle.name) || trims.includes(vehicle.id)
}

// The free colour a quote for this vehicle defaults to: the model's own standard colour
// (MODEL_STANDARD_PAINT_IDS) when that row is in the catalog, else the shared
// "Standaardkleur: Wit". Null when neither applies.
export function standardPaintFor(accessories, vehicle) {
  const applies = (id) => accessories.find((a) => a.id === id && a.active !== false && accessoryAppliesToVehicle(a, vehicle))
  const ownId = vehicle && MODEL_STANDARD_PAINT_IDS[vehicle.name]
  return (ownId && applies(ownId)) || applies(STANDARD_PAINT_ACCESSORY_ID) || null
}

// The options offered for this vehicle: everything scoped to it, minus the shared
// "Standaardkleur: Wit" when the model has its own free standard colour, so there are
// never two free whites. If that own row is missing or switched off, the shared white
// stays, so the model is never left without a free colour.
export function accessoriesForVehicle(accessories, vehicle) {
  const standard = standardPaintFor(accessories, vehicle)
  return accessories.filter((a) => accessoryAppliesToVehicle(a, vehicle)
    && (a.id !== STANDARD_PAINT_ACCESSORY_ID || standard?.id === STANDARD_PAINT_ACCESSORY_ID))
}
