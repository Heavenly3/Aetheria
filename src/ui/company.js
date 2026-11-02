import { t } from '../i18n/index.js'
import { G } from '../game/engine.js'

// A companion's name: rolled for the ones hired, fixed for the ones met along the way
export const mercName = m => (!m ? '' : m.unique ? t(`company.uniques.${m.unique}.name`) : m.name)
// The same, from the id kept in a note of the fight
export const mercNameOf = id => mercName(G.companyMember(id))
