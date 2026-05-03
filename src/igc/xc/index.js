// Vendored entry-point for igc-xc-score. The original published package
// pulls in the `collections` package which monkey-patches the global
// Map/Set constructors at import time, breaking Cesium. We use the source
// directly with a local heap-based priority queue instead.
export {default as solver}        from './solver.js'
export {default as scoringRules}  from './scoring-rules.js'
