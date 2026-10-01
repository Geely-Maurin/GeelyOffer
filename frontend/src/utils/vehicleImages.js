import e5Default from '../assets/vehicles/geely-e5.jpg'
import starrayDefault from '../assets/vehicles/starray-emi.jpg'
import geelyE2 from '../assets/vehicles/geely-e2.jpg'

import e5FrostGreyFront from '../assets/vehicles/colors/e5-frost-grey-front.jpg'
import e5CarbonBlackFront from '../assets/vehicles/colors/e5-carbon-black-front.jpg'
import e5MoonlightSilverFront from '../assets/vehicles/colors/e5-moonlight-silver-front.jpg'
import e5SnowyWhiteFront from '../assets/vehicles/colors/e5-snowy-white-front.jpg'
import e5TurquoiseGreenFront from '../assets/vehicles/colors/e5-turquoise-green-front.jpg'
import e5Rear from '../assets/vehicles/colors/e5-rear.jpg'

import starrayCloudveilSilverFront from '../assets/vehicles/colors/starray-cloudveil-silver-front.jpg'
import starrayJungleGreenFront from '../assets/vehicles/colors/starray-jungle-green-front.jpg'
import starrayGlacierBlueFront from '../assets/vehicles/colors/starray-glacier-blue-front.jpg'
import starrayVolcanicGreyFront from '../assets/vehicles/colors/starray-volcanic-grey-front.jpg'
import starrayPolarBlackFront from '../assets/vehicles/colors/starray-polar-black-front.jpg'
import starrayRear from '../assets/vehicles/colors/starray-rear.jpg'

import e2MoonWhiteSide from '../assets/vehicles/colors/e2-moon-white-side.jpg'
import e2NebulaBeigeSide from '../assets/vehicles/colors/e2-nebula-beige-side.jpg'
import e2AuroraGreenSide from '../assets/vehicles/colors/e2-aurora-green-side.jpg'
import e2NovaPinkSide from '../assets/vehicles/colors/e2-nova-pink-side.jpg'
import e2CometGreySide from '../assets/vehicles/colors/e2-comet-grey-side.jpg'
import e2StarSilverSide from '../assets/vehicles/colors/e2-star-silver-side.jpg'

import e5InteriorDarkBlue from '../assets/vehicles/interior/e5-interior-dark-blue.jpg'
import e5InteriorIvoryWhite from '../assets/vehicles/interior/e5-interior-ivory-white.jpg'
import starrayInteriorSapphireBlue from '../assets/vehicles/interior/starray-interior-sapphire-blue.jpg'
import starrayInteriorAmberBrown from '../assets/vehicles/interior/starray-interior-amber-brown.jpg'
import e2InteriorHorizonGrey from '../assets/vehicles/interior/e2-interior-horizon-grey.jpg'
import e2InteriorSkylineWhite from '../assets/vehicles/interior/e2-interior-skyline-white.jpg'

// Default (uncolored) photo per model — shown before a paint color is picked, and for a
// color with no photo of its own.
export const VEHICLE_IMAGES = {
  'Geely E5': e5Default,
  'Starray EM-i': starrayDefault,
  'Geely E2': geelyE2,
}

// Real photos per exterior color, keyed by the exact accessory name used in
// accessoriesSeed.js. E5 / Starray: front 3/4 photos from Geely's Belgian site
// (geelyauto.be), which only publishes a front photo per color (see VEHICLE_REAR_IMAGES
// below). E2: side views from Geely's official EX2 360° studio set (geely.com.au, "inspire"
// spec — black roof, as sold in Belgium); the side angle is the one geelyauto.be uses
// itself, and the front/rear angles carry an Australian "GEELY EX2" plate. A color with no
// entry here just falls back to the model's default photo above.
export const VEHICLE_COLOR_FRONT_IMAGES = {
  'Metallic: Frost Grey': e5FrostGreyFront,
  'Metallic: Carbon Black': e5CarbonBlackFront,
  'Metallic: Moonlight Silver': e5MoonlightSilverFront,
  'Metallic: Snowy White': e5SnowyWhiteFront,
  'Metallic: Turquoise Green': e5TurquoiseGreenFront,
  'Metallic: Cloudveil Silver': starrayCloudveilSilverFront,
  'Metallic: Jungle Green': starrayJungleGreenFront,
  'Metallic: Glacier Blue': starrayGlacierBlueFront,
  'Metallic: Volcanic Grey': starrayVolcanicGreyFront,
  'Metallic: Polar Black': starrayPolarBlackFront,
  'Standaardlak: Nebula Beige': e2NebulaBeigeSide,
  'Standaardlak: Aurora Green': e2AuroraGreenSide,
  'Metallic: Nova Pink': e2NovaPinkSide,
  'Metallic: Comet Grey': e2CometGreySide,
  'Metallic: Star Silver': e2StarSilverSide,
}

// Photo for the free "Standaardkleur: Wit" colour, per model. That colour is one shared row
// for every model, so it can't be keyed by name in VEHICLE_COLOR_FRONT_IMAGES above. Only
// the E2 has one (Moon White); the E5 / Starray keep showing their default photo.
export const STANDARD_PAINT_NAME = 'Standaardkleur: Wit'
export const VEHICLE_STANDARD_COLOR_IMAGES = {
  'Geely E2': e2MoonWhiteSide,
}

// One rear 3/4 photo per model — Geely doesn't publish a rear photo per color (only the
// front photo above changes with the selected color), so this is a fixed reference for
// the car's overall shape rather than a color match for whatever the customer picked.
export const VEHICLE_REAR_IMAGES = {
  'Geely E5': e5Rear,
  'Starray EM-i': starrayRear,
}

// Interior photo of each model's standard upholstery (E5: Dark Blue TEP-leder, Starray
// EM-i: Sapphire Blue, E2: Horizon Grey — standard on every trim per the July 2026 price
// lists). Shown whenever no optional upholstery is selected.
export const VEHICLE_INTERIOR_IMAGES = {
  'Geely E5': e5InteriorDarkBlue,
  'Starray EM-i': starrayInteriorSapphireBlue,
  'Geely E2': e2InteriorHorizonGrey,
}

// Interior photos for the optional upholsteries (MAX+-only on the E5/Starray, ULTRA-only
// on the E2), keyed by the exact accessory name used in accessoriesSeed.js — same idea as
// VEHICLE_COLOR_FRONT_IMAGES above.
export const VEHICLE_UPHOLSTERY_IMAGES = {
  'Bekleding: Ivory White TEP-leder': e5InteriorIvoryWhite,
  'Bekleding: Amber Brown TEP-leder': starrayInteriorAmberBrown,
  'Bekleding: Skyline White TEP-leder': e2InteriorSkylineWhite,
}
