// Storage worker for PG Viewer.
//
// Routes:
//   HEAD /<hash>.bin   →  200 if object exists, 404 otherwise
//   PUT  /<hash>.bin   →  store body at <hash>.bin (no-op if exists)
//   GET  /<hash>.bin   →  fetch object
//
// Bindings (set in wrangler.toml or dashboard):
//   BUCKET             R2 bucket
//   ALLOWED_ORIGINS    comma-separated list of origins, e.g.
//                      "https://pg.example.com,http://localhost:5173"

const MAX_BODY_BYTES = 50 * 1024 * 1024  // 50 MB
const KEY_RE         = /^\/([a-f0-9]{64})\.bin$/


const corsHeaders = origin => ({
  'Access-Control-Allow-Origin':  origin,
  'Access-Control-Allow-Methods': 'GET, HEAD, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age':       '86400',
  'Vary':                         'Origin',
})


const allowed = (origin, env) => {
  if (!origin) return null
  const list = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim())
  return list.includes(origin) ? origin : null
}


const json = (obj, status, origin) => new Response(JSON.stringify(obj), {
  status,
  headers: {'Content-Type': 'application/json', ...corsHeaders(origin)},
})


export default {
  async fetch(request, env) {
    const origin    = request.headers.get('Origin')
    const allowOrig = allowed(origin, env)

    // Preflight
    if (request.method == 'OPTIONS') {
      if (!allowOrig) return new Response(null, {status: 403})
      return new Response(null, {status: 204, headers: corsHeaders(allowOrig)})
    }

    if (origin && !allowOrig)
      return json({error: 'origin not allowed'}, 403, '*')

    const url = new URL(request.url)
    const m   = url.pathname.match(KEY_RE)
    if (!m) return json({error: 'bad path'}, 400, allowOrig)
    const key = m[1] + '.bin'

    if (request.method == 'HEAD') {
      const obj = await env.BUCKET.head(key)
      return new Response(null, {
        status: obj ? 200 : 404,
        headers: {
          'Cache-Control': 'no-store',
          ...corsHeaders(allowOrig),
        },
      })
    }

    if (request.method == 'GET') {
      const obj = await env.BUCKET.get(key)
      if (!obj) return json({error: 'not found'}, 404, allowOrig)
      return new Response(obj.body, {
        headers: {
          'Content-Type':  'application/octet-stream',
          'Cache-Control': 'public, max-age=86400',
          ...corsHeaders(allowOrig),
        },
      })
    }

    if (request.method == 'PUT') {
      const len = +request.headers.get('Content-Length')
      if (MAX_BODY_BYTES < len) return json({error: 'too large'}, 413, allowOrig)
      const existing = await env.BUCKET.head(key)
      if (existing) return json({ok: true, existed: true}, 200, allowOrig)
      await env.BUCKET.put(key, request.body)
      return json({ok: true, existed: false}, 201, allowOrig)
    }

    return json({error: 'method not allowed'}, 405, allowOrig)
  },
}
