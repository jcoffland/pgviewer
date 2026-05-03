// Inline SVG data URIs for XC flight type icons. Each is 18x18 with a
// transparent background; rendering size is controlled by the consumer
// via CSS. Colors are the same as XContest's badges (orange / green /
// blue) but redrawn so they composite cleanly onto a dark UI.

export const FREE_ICON =
  'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2018%2018%22%3E%3Crect%20width%3D%2218%22%20height%3D%2218%22%20rx%3D%223%22%20fill%3D%22%23db7022%22%2F%3E%3Cpolyline%20points%3D%223%2C13%207%2C5%2011%2C12%2015%2C4%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.4%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3Ccircle%20cx%3D%227%22%20cy%3D%225%22%20r%3D%222.5%22%20fill%3D%22%23fff%22%2F%3E%3Ccircle%20cx%3D%2211%22%20cy%3D%2212%22%20r%3D%222.5%22%20fill%3D%22%23fff%22%2F%3E%3Ccircle%20cx%3D%223%22%20cy%3D%2213%22%20r%3D%223%22%20fill%3D%22%23fff%22%2F%3E%3Ccircle%20cx%3D%223%22%20cy%3D%2213%22%20r%3D%221.5%22%20fill%3D%22%23000%22%2F%3E%3Ccircle%20cx%3D%2215%22%20cy%3D%224%22%20r%3D%223%22%20fill%3D%22%23fff%22%2F%3E%3Ccircle%20cx%3D%2215%22%20cy%3D%224%22%20r%3D%221.5%22%20fill%3D%22%23000%22%2F%3E%3C%2Fsvg%3E'

export const TRIANGLE_ICON =
  'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2018%2018%22%3E%3Crect%20width%3D%2218%22%20height%3D%2218%22%20rx%3D%223%22%20fill%3D%22%2301ac25%22%2F%3E%3Cpolygon%20points%3D%223%2C9.5%2012%2C4.5%2014%2C11.5%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.4%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3Ccircle%20cx%3D%223%22%20cy%3D%229.5%22%20r%3D%222.5%22%20fill%3D%22%23fff%22%2F%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%224.5%22%20r%3D%222.5%22%20fill%3D%22%23fff%22%2F%3E%3Ccircle%20cx%3D%2214%22%20cy%3D%2211.5%22%20r%3D%223%22%20fill%3D%22%23fff%22%2F%3E%3Ccircle%20cx%3D%2214%22%20cy%3D%2211.5%22%20r%3D%221.5%22%20fill%3D%22%23000%22%2F%3E%3C%2Fsvg%3E'

export const FAI_ICON =
  'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2018%2018%22%3E%3Crect%20width%3D%2218%22%20height%3D%2218%22%20rx%3D%223%22%20fill%3D%22%230a94bc%22%2F%3E%3Cpolygon%20points%3D%229%2C4%203.8%2C13%2014.2%2C13%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.4%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3Ccircle%20cx%3D%229%22%20cy%3D%224%22%20r%3D%222.5%22%20fill%3D%22%23fff%22%2F%3E%3Ccircle%20cx%3D%223.8%22%20cy%3D%2213%22%20r%3D%222.5%22%20fill%3D%22%23fff%22%2F%3E%3Ccircle%20cx%3D%2214.2%22%20cy%3D%2213%22%20r%3D%223%22%20fill%3D%22%23fff%22%2F%3E%3Ccircle%20cx%3D%2214.2%22%20cy%3D%2213%22%20r%3D%221.5%22%20fill%3D%22%23000%22%2F%3E%3C%2Fsvg%3E'

export const TYPE_ICONS = {
  free:     FREE_ICON,
  triangle: TRIANGLE_ICON,
  fai:      FAI_ICON,
}
