// Both static files (wireframes.html, api-spec.json) live alongside this file
// so they are included when the Edge Runtime serves from supabase/functions/.
// Keep them in sync with their originals using: mise run docs:sync
//
// Source of truth:  docs/media-tracker-wireframes.html
//                   docs/media-tracker-api-spec.json

import spec from './api-spec.json' with { type: 'json' }
import { html as wireframesHtml } from './wireframes.ts'

function redocPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Media Tracker API — Reference</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin: 0; padding: 0; }
    /* Supabase-ish accent colour */
    .menu-content { background: #1c1c1c !important; }
  </style>
</head>
<body>
  <div id="redoc"></div>
  <script src="https://cdn.jsdelivr.net/npm/redoc/bundles/redoc.standalone.js"></script>
  <script>
    Redoc.init(
      ${JSON.stringify(spec)},
      { hideDownloadButton: false, theme: { colors: { primary: { main: '#3ecf8e' } } } },
      document.getElementById('redoc')
    );
  </script>
</body>
</html>`
}

Deno.serve((req: Request): Response => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ message: 'Method not allowed.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(req.url)
  const [segment] = url.pathname
    .replace(/^(?:\/functions\/v1)?\/docs/, '')
    .split('/')
    .filter(Boolean)

  if (segment === 'wireframes') {
    return new Response(wireframesHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (segment === 'api.json') {
    return new Response(JSON.stringify(spec, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  if (segment === 'api') {
    return new Response(redocPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  return new Response(JSON.stringify({ message: 'Not found.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  })
})
