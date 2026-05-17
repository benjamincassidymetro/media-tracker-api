# Media Tracker — Routing Specification

This document defines how incoming requests are routed to Edge Functions and resolves the specific path precedence conflict between `GET /users/search` and `GET /users/{id}`.

---

## The Conflict

The API has two routes that share the same path prefix:

```
GET /users/search    ← literal path segment "search"
GET /users/{id}      ← dynamic path parameter (UUID)
```

In most web frameworks, route matching is explicit and ordered. Supabase Edge Functions, however, are registered by function name, not by path pattern. A single catch-all function (e.g., `users`) receives all `/users/*` requests and must route internally. This means the Edge Function code itself must resolve the ambiguity.

---

## Solution: Explicit Segment Check Before UUID Parse

In the `/users` Edge Function, handle path segments in this order:

```typescript
// Pseudocode for the /users Edge Function router

const url = new URL(req.url);
const pathParts = url.pathname.replace('/functions/v1/', '').split('/');
// pathParts example: ['users', 'search'] or ['users', '550e8400-...', 'followers']

const [resource, segment, subResource] = pathParts; // resource = 'users'

if (segment === undefined) {
  // POST /users
  return handleCreateUser(req);
}

if (segment === 'me') {
  // GET /users/me or PUT /users/me
  return handleCurrentUser(req);
}

if (segment === 'search') {
  // GET /users/search
  return handleUserSearch(req, url.searchParams);
}

// Everything else: segment is a UUID
const userId = segment;
if (!isValidUUID(userId)) {
  return new Response(JSON.stringify({ message: 'Not found.' }), { status: 404 });
}

if (subResource === undefined) {
  // GET /users/{id}
  return handleGetUserById(req, userId);
}

if (subResource === 'followers') {
  // GET /users/{id}/followers
  return handleGetFollowers(req, userId);
}

if (subResource === 'following') {
  // GET /users/{id}/following, POST /users/{id}/following, DELETE /users/{id}/following
  return handleFollowing(req, userId);
}

if (subResource === 'activity') {
  // GET /users/{id}/activity
  return handleUserActivity(req, userId);
}

if (subResource === 'library') {
  // GET /users/{id}/library
  return handleUserLibrary(req, userId, url.searchParams);
}

return new Response(JSON.stringify({ message: 'Not found.' }), { status: 404 });
```

**The key rule:** Check for literal segment matches (`search`, `me`) before attempting UUID validation. This ensures `GET /users/search` is never mistakenly treated as `GET /users/{id}` with `id = "search"`.

---

## Full Route Table

Supabase Edge Functions are named by the first path segment. Each function handles all methods and sub-paths for that segment:

| Function Name | Handles |
|---|---|
| `users` | `POST /users`, `GET /users/me`, `PUT /users/me`, `GET /users/search`, `GET /users/{id}`, `GET /users/{id}/followers`, `GET /users/{id}/following`, `POST /users/{id}/following`, `DELETE /users/{id}/following`, `GET /users/{id}/activity`, `GET /users/{id}/library` |
| `tokens` | `POST /tokens` |
| `media` | `GET /media`, `GET /media/{id}` |
| `library` | `GET /library`, `POST /library`, `GET /library/{mediaId}`, `PUT /library/{mediaId}`, `DELETE /library/{mediaId}` |
| `reviews` | `GET /reviews`, `POST /reviews`, `PUT /reviews/{id}`, `DELETE /reviews/{id}` |
| `activity` | `GET /activity` |
| `goals` | `GET /goals`, `POST /goals` |
| `quotes` | `GET /quotes`, `POST /quotes`, `PUT /quotes/{id}`, `DELETE /quotes/{id}`, `POST /quotes/{id}/likes`, `DELETE /quotes/{id}/likes` |
| `priorities` | `GET /priorities`, `PUT /priorities` |

---

## The Same Pattern in `/media`

The `/media` function has a similar (simpler) issue: `GET /media` vs `GET /media/{id}`. The resolution is the same — check whether the second segment is present and is a valid integer:

```typescript
const [resource, segment] = pathParts;

if (segment === undefined) {
  // GET /media
  return handleMediaSearch(req, url.searchParams);
}

const mediaId = parseInt(segment, 10);
if (isNaN(mediaId)) {
  return new Response(JSON.stringify({ message: 'Not found.' }), { status: 404 });
}

// GET /media/{id}
return handleGetMediaById(req, mediaId);
```

---

## The `/quotes/{id}/likes` Sub-Resource

`POST /quotes/{id}/likes` and `DELETE /quotes/{id}/likes` require a three-segment path:

```typescript
const [resource, quoteId, subResource] = pathParts; // 'quotes', '42', 'likes'

if (subResource === 'likes') {
  if (req.method === 'POST') return handleLikeQuote(req, parseInt(quoteId));
  if (req.method === 'DELETE') return handleUnlikeQuote(req, parseInt(quoteId));
}
```

---

## UUID Validation Helper

```typescript
function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
```

Use this before any database query that takes a user ID from the URL. An invalid UUID passed to a PostgreSQL UUID column will cause a database error rather than a clean 404.

---

## HTTP Method Routing

Within each function, route on both path and HTTP method. Pattern:

```typescript
const method = req.method; // 'GET', 'POST', 'PUT', 'DELETE'

switch (`${method} ${routeKey}`) {
  case 'GET /users/me':   return handleGetCurrentUser(req);
  case 'PUT /users/me':   return handleUpdateCurrentUser(req);
  case 'GET /users/search': return handleSearchUsers(req, params);
  // ...
  default:
    return new Response(JSON.stringify({ message: 'Method not allowed.' }), { status: 405 });
}
```

---

## Shared Middleware

All Edge Functions (except `tokens` and `users` `POST`) require a valid bearer token. Extract this into a shared middleware module:

```typescript
// shared/auth.ts
export async function requireAuth(req: Request): Promise<{ userId: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Authentication required.');
  }
  const token = authHeader.slice(7);
  const payload = await verifyJWT(token); // throws if invalid/expired
  return { userId: payload.sub };
}
```

Call `requireAuth(req)` at the top of every route handler that requires authentication. If it throws, catch it and return a 401 response. This ensures students' 401 handling exercise (Week 4) is reliably triggered.
