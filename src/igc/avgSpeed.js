// Trailing-window time-weighted average ground speed at each tracklog
// index. Returns an array of length track.coords.length where entries
// for the first `window` seconds are null (insufficient history).
//
// Each entry uses the segments [j, i) where j is the smallest segment
// index such that the segment's start time is >= t[i] - window. Speed
// is weighted by segment duration so that uneven sampling rates produce
// the right average.

export const trailingAvgSpeeds = (track, window) => {
  const t = track.t
  const n = t.length
  const out = new Array(n).fill(null)
  if (n < 2) return out

  // Precompute cumulative sum of (speed_i * dt_i) and cumulative dt over
  // segment index i in [0, n-1). Both are length n with leading 0 so
  // sum over [j, i) is cum[i] - cum[j].
  const cumSV = new Float64Array(n)
  const cumT  = new Float64Array(n)
  for (let i = 0; i < n - 1; i++) {
    const dt = t[i + 1] - t[i]
    cumSV[i + 1] = cumSV[i] + track.speed[i] * dt
    cumT[i + 1]  = cumT[i]  + dt
  }

  const t0 = t[0]
  let lo = 0  // smallest j with t[j] >= t[i] - window
  for (let i = 0; i < n; i++) {
    if (t[i] - t0 < window) continue
    const target = t[i] - window
    while (t[lo] < target) lo++
    const dt = cumT[i] - cumT[lo]
    out[i] = dt == 0 ? 0 : (cumSV[i] - cumSV[lo]) / dt
  }
  return out
}
