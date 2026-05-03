// Coloring options for the primary track. needsEle is set for modes that
// require pressure altitude data; UI hides those when the track lacks it.
export const COLORINGS = [
  {key: 'climb',       label: 'Climb',        needsEle: true,
   help: 'Color by climb rate: red is strong climb, blue is sink.'},
  {key: 'altitude',    label: 'Altitude',     needsEle: true,
   help: 'Color by altitude above sea level.'},
  {key: 'tec',         label: 'Energy',       needsEle: true,
   help: 'Color by total energy compensated climb (climb + speed change).'},
  {key: 'speed',       label: 'Ground speed',
   help: 'Color by ground speed.'},
  {key: 'time',        label: 'Time',
   help: 'Color by time, from start of track to end.'},
  {key: 'solid_color', label: 'Solid color',
   help: 'Single color for the whole track.'},
]
