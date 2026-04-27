// Pack/unpack a set of flights as a gzipped JSON blob.
// Schema: {flights: [{name: string, text: string}, ...]}
// gzip via the browser's CompressionStream / DecompressionStream — no lib.

const MIME = 'application/octet-stream'


// flights: [{name, text}]  →  Blob (gzipped JSON)
export const pack = async flights => {
  const json   = JSON.stringify({flights})
  const stream = new Blob([json]).stream().pipeThrough(
    new CompressionStream('gzip'))
  const buf    = await new Response(stream).arrayBuffer()
  return new Blob([buf], {type: MIME})
}


// Blob (gzipped JSON)  →  [{name, text}]
export const unpack = async blob => {
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'))
  const text   = await new Response(stream).text()
  const obj    = JSON.parse(text)
  if (!obj || !Array.isArray(obj.flights))
    throw new Error('share bundle missing flights array')
  return obj.flights
}
