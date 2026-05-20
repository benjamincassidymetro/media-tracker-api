import spec from './api-spec.json' with { type: 'json' }

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

  if (segment === 'api.json') {
    return new Response(JSON.stringify(spec, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  return new Response(JSON.stringify({ message: 'Not found.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  })
})
