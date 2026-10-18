/* =========================================================
   SETTINGS — choices that need more than an on/off switch
   ========================================================= */

// Text size: the whole interface is scaled by `zoom`
export const TEXT_SIZES = [
  { id: 'small', zoom: 0.9 },
  { id: 'normal', zoom: 1 },
  { id: 'large', zoom: 1.12 },
  { id: 'xlarge', zoom: 1.25 },
]
export const zoomFor = id => TEXT_SIZES.find(s => s.id === id)?.zoom || 1

// Pop-up messages: all of them, only the important ones (no level-ups, masteries or plain notes), or only warnings
export const TOAST_LEVELS = ['all', 'important', 'none']
