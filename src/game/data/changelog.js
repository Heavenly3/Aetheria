/*
  Update notes shown in Settings and, once per device, in a "What's new" window after an update.
  Texts live in the locales under `changelog.entries.<id>.<section>`, one change per line.
  The newest entry goes first. An entry without a version is work that is already live on the
  website but not yet part of a numbered beta.
*/
export const SECTIONS = ['new', 'changed', 'fixed']

export const CHANGELOG = [
  { id: 'next', version: null, date: null, icon: 'quill-ink', sections: ['new'] },
  { id: 'b6', version: '1.0.0-beta.6', date: '2026-10-07', icon: 'anvil-impact', sections: ['new', 'changed', 'fixed'] },
  { id: 'b5', version: '1.0.0-beta.5', date: '2026-10-06', icon: 'crowned-skull', sections: ['new'] },
  { id: 'b4', version: '1.0.0-beta.4', date: '2026-10-05', icon: 'gears', sections: ['fixed'] },
  { id: 'b3', version: '1.0.0-beta.3', date: '2026-10-05', icon: 'open-book', sections: ['new'] },
  { id: 'b2', version: '1.0.0-beta.2', date: '2026-10-05', icon: 'gears', sections: ['fixed'] },
  { id: 'b1', version: '1.0.0-beta.1', date: '2026-10-05', icon: 'crown', sections: ['new'] },
]

// What the "What's new" window remembers having shown: the newest entry and how much it held, so
// news added to an entry that is still growing is shown again
export const newsKey = (lines = 0) => `${CHANGELOG[0].id}:${lines}`
