// Storage backend. Talks to a Cloudflare Worker that mediates R2 access.
// Replaceable: swap the implementations in this file to migrate.
//
// The public surface is two functions: uploadBlob returns an opaque
// identifier that fetchById accepts. The id is short enough to embed
// in a URL fragment.

const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || ''


// Compute SHA-256 of a Blob, return as lowercase hex.
const sha256Hex = async blob => {
  const buf  = await blob.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, '0')).join('')
}


const objectUrl = id => STORAGE_URL.replace(/\/+$/, '') + '/' + id + '.bin'


// Upload a blob; return an opaque id that fetchById can use to retrieve
// it. Hashes the content, HEADs to check, PUTs only if new.
export const uploadBlob = async blob => {
  if (!STORAGE_URL) throw new Error(
    'storage not configured: set VITE_STORAGE_URL in .env.local')

  const id  = await sha256Hex(blob)
  const url = objectUrl(id)

  const head = await fetch(url, {method: 'HEAD', cache: 'no-store'})
  if (head.status == 200) return id
  if (head.status != 404) throw new Error('storage HEAD failed: HTTP ' + head.status)

  const put = await fetch(url, {method: 'PUT', body: blob})
  if (!put.ok) {
    const text = await put.text().catch(() => '')
    throw new Error('upload failed: HTTP ' + put.status + ' ' + text)
  }
  return id
}


// Fetch a blob previously stored via uploadBlob.
export const fetchById = async id => {
  if (!STORAGE_URL) throw new Error(
    'storage not configured: set VITE_STORAGE_URL in .env.local')

  const res = await fetch(objectUrl(id))
  if (!res.ok) {
    if (res.status == 404)
      throw new Error('the shared file is no longer available (it may have expired)')
    throw new Error('failed to load shared file: HTTP ' + res.status)
  }
  return await res.blob()
}

