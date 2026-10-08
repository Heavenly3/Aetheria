/*
  Switches for whole features. A disabled feature keeps its code and data, so it can come back later
  by flipping its switch; saves keep whatever the player already earned from it.
*/
export const FEATURES = {
  // Seasonal festivals (tokens, shop, bonuses). Turned off for now; festival rewards already owned stay.
  festivals: false,
  // Weather, seasons and the night change modifiers and monster strength (tests switch it off to stay predictable)
  weatherEffects: true,
}
