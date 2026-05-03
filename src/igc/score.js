// XContest-style XC scoring for one IGC flight.
//
// Wraps igc-xc-score's solver (vendored under ./xc/). Re-parses the IGC
// text via igc-parser (the solver expects that shape). The solver is a
// generator yielding successively better candidate solutions; we drive
// the iterator manually so we capture the final value even when the
// solver completes without yielding (in which case it `return`s the
// optimum, which for-of would skip).
//
// Returns null when scoring isn't possible (e.g. parse failure, too few
// fixes, no closed solution).
import IGCParser  from 'igc-parser'
import {solver, scoringRules} from './xc/index.js'


// Maps the scoring rule's `code` to our local icon key.
const ICON_BY_CODE = {od: 'free', tri: 'triangle', fai: 'fai'}


const runSolver = async parsed => {
  const it = solver(parsed, scoringRules.XContest, {})
  let result = null
  let i = 0
  while (true) {
    const step = it.next()
    if (step.value !== undefined) result = step.value
    if (step.done) break
    if (++i % 50 == 0) await new Promise(res => setTimeout(res, 0))
  }
  return result
}


export const computeScore = async igcText => {
  const parsed = IGCParser.parse(igcText, {lenient: true})
  const result = await runSolver(parsed)
  if (!result || !result.scoreInfo) return null
  const rule = result.opt.scoring
  return {
    code:     rule.code,
    icon:     ICON_BY_CODE[rule.code] || 'free',
    name:     rule.name,
    distance: result.scoreInfo.distance,  // km
    score:    result.score,                // points
  }
}
