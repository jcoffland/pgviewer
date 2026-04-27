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

const MAX_BODY_BYTES = 2 * 1024 * 1024  // 2 MiB
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

    // Admin: list all stored objects as a simple HTML page.
    // Token passed in URL is convenient but leaks via history/logs/referrers
    // — fine for low-stakes admin use.
    if (request.method == 'GET' && url.pathname == '/list') {
      if (url.searchParams.get('token') != env.ADMIN_TOKEN)
        return new Response('forbidden', {status: 403})
      const list = await env.BUCKET.list()
      const appBase = (env.APP_URL || '').replace(/\/+$/, '')
      const rows = list.objects
        .sort((a, b) => b.uploaded - a.uploaded)
        .map(o => {
          const id   = o.key.replace(/\.bin$/, '')
          const href = appBase + '/#v1=' + id
          const ts   = o.uploaded.toISOString().replace('T', ' ').slice(0, 19)
          const kb   = (o.size / 1024).toFixed(1)
          return `<tr><td><a target="_blank" href="${href}">${ts}</a></td><td>${kb} KB</td></tr>`
        })
        .join('\n')
      const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>pgviewer storage</title>
<style>
  body {font-family: sans-serif; background: #1a1a1a; color: #ddd; padding: 20px}
  table {border-collapse: collapse}
  td {padding: 4px 12px 4px 0; font-family: monospace}
  a {color: #88c}
  .summary {color: #888; margin-bottom: 12px}
</style>
</head><body>
<div class="summary">${list.objects.length} object${list.objects.length == 1 ? '' : 's'}, newest first</div>
<table>${rows}</table>
</body></html>`
      return new Response(html, {headers: {'Content-Type': 'text/html'}})
    }

    const m = url.pathname.match(KEY_RE)
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
