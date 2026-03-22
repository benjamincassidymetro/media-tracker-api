# Media Tracker API — Edge Function

Single Supabase Edge Function that implements the full Media Tracker REST API.

## Structure

```
supabase/functions/api/
├── index.ts          # Main router (Deno.serve entry point)
├── deno.json         # Import map
└── lib/
    ├── supabase.ts   # Client factory + auth helpers
    ├── auth.ts       # POST /auth/signup|login|refresh
    ├── media.ts      # GET /media, GET /media/:id, GET|PUT /users/me, GET /users/:id
    ├── library.ts    # GET|POST /library, PUT|DELETE /library/:mediaId
    ├── reviews.ts    # GET|POST /reviews, PUT|DELETE /reviews/:mediaId
    ├── social.ts     # GET /activity, GET /followers, POST|DELETE /followers/:userId
    ├── goals.ts      # GET|POST /goals
    ├── quotes.ts     # GET|POST /quotes, PUT|DELETE /quotes/:id, POST|DELETE /quotes/:id/like
    └── priorities.ts # GET|PUT /priorities
```

## Deploy

```bash
# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Set secrets (only needed once)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Deploy function
supabase functions deploy api --no-verify-jwt
```

> `SUPABASE_URL` and `SUPABASE_ANON_KEY` are automatically injected by the Supabase runtime.

## Environment Variables

| Variable | Source | Description |
|---|---|---|
| `SUPABASE_URL` | Auto-injected | Project URL |
| `SUPABASE_ANON_KEY` | Auto-injected | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Service role key (for profile creation after signup) |

## Base URL

```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/api
```

## API Discovery Endpoint

A built-in API description is available at:

```
GET https://YOUR_PROJECT_REF.supabase.co/functions/v1/api/docs
```

It returns a JSON object with route details and examples.

## Testing with curl

### Authentication

```bash
BASE=https://YOUR_PROJECT_REF.supabase.co/functions/v1/api

# Sign up
curl -X POST $BASE/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","username":"testuser","displayName":"Test User"}'

# Login — save the accessToken from the response
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.accessToken')

# Refresh token
curl -X POST $BASE/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

### Media

```bash
# Search — query, type, genre, limit, offset are all optional
curl "$BASE/media?query=harry&type=book&limit=5"

# Filter by genre
curl "$BASE/media?genre=Fantasy&limit=10&offset=20"

# Get details
curl "$BASE/media/1"
```

### User Profile

```bash
# Get own profile
curl -H "Authorization: Bearer $TOKEN" $BASE/users/me

# Update own profile
curl -X PUT -H "Authorization: Bearer $TOKEN" $BASE/users/me \
  -H "Content-Type: application/json" \
  -d '{"displayName":"New Name","bio":"Hello world"}'

# Get another user's profile
curl "$BASE/users/USER_UUID"
```

### Library

```bash
# Get library (optional ?status=want_to|reading|finished)
curl -H "Authorization: Bearer $TOKEN" "$BASE/library?status=reading"

# Add to library
curl -X POST -H "Authorization: Bearer $TOKEN" $BASE/library \
  -H "Content-Type: application/json" \
  -d '{"mediaId":1,"status":"want_to"}'

# Update status
curl -X PUT -H "Authorization: Bearer $TOKEN" $BASE/library/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"reading"}'

# Remove from library
curl -X DELETE -H "Authorization: Bearer $TOKEN" $BASE/library/1
```

### Reviews

```bash
# List reviews for a media item
curl "$BASE/reviews?mediaId=1"

# Create review (one per user per media)
curl -X POST -H "Authorization: Bearer $TOKEN" $BASE/reviews \
  -H "Content-Type: application/json" \
  -d '{"mediaId":1,"rating":5,"reviewText":"Amazing book!"}'

# Update review
curl -X PUT -H "Authorization: Bearer $TOKEN" $BASE/reviews/1 \
  -H "Content-Type: application/json" \
  -d '{"rating":4,"reviewText":"Updated review"}'

# Delete review
curl -X DELETE -H "Authorization: Bearer $TOKEN" $BASE/reviews/1
```

### Social

```bash
# Activity feed (own + followed users)
curl -H "Authorization: Bearer $TOKEN" "$BASE/activity?limit=10"

# Get own followers
curl -H "Authorization: Bearer $TOKEN" "$BASE/followers?type=followers"

# Get who you follow
curl -H "Authorization: Bearer $TOKEN" "$BASE/followers?type=following"

# Follow a user
curl -X POST -H "Authorization: Bearer $TOKEN" $BASE/followers/USER_UUID

# Unfollow a user
curl -X DELETE -H "Authorization: Bearer $TOKEN" $BASE/followers/USER_UUID
```

### Goals

```bash
# Get goals (optional ?year=2026)
curl -H "Authorization: Bearer $TOKEN" "$BASE/goals?year=2026"

# Create goal
curl -X POST -H "Authorization: Bearer $TOKEN" $BASE/goals \
  -H "Content-Type: application/json" \
  -d '{"year":2026,"targetCount":24,"mediaType":"book"}'
```

### Quotes

```bash
# Get public quotes (sorted by likes)
curl "$BASE/quotes?public=true&limit=10"

# Get my own quotes
curl -H "Authorization: Bearer $TOKEN" "$BASE/quotes"

# Create quote
curl -X POST -H "Authorization: Bearer $TOKEN" $BASE/quotes \
  -H "Content-Type: application/json" \
  -d '{"mediaId":1,"quoteText":"It was the best of times...","pageNumber":1,"isPublic":true}'

# Update quote
curl -X PUT -H "Authorization: Bearer $TOKEN" $BASE/quotes/1 \
  -H "Content-Type: application/json" \
  -d '{"isPublic":false}'

# Like a quote
curl -X POST -H "Authorization: Bearer $TOKEN" $BASE/quotes/1/like

# Unlike a quote
curl -X DELETE -H "Authorization: Bearer $TOKEN" $BASE/quotes/1/like

# Delete quote
curl -X DELETE -H "Authorization: Bearer $TOKEN" $BASE/quotes/1
```

### Priorities

```bash
# Get want-to priority list (ordered by order_index)
curl -H "Authorization: Bearer $TOKEN" $BASE/priorities

# Upsert a priority (media must already be in library with want_to status)
curl -X PUT -H "Authorization: Bearer $TOKEN" $BASE/priorities \
  -H "Content-Type: application/json" \
  -d '{"mediaId":1,"priority":1,"orderIndex":0,"estimatedTimeHours":8,"notes":"Start this weekend"}'
```

## Error Responses

All errors return JSON:

```json
{ "error": "Description of the error" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / missing fields |
| 401 | Missing or invalid auth token |
| 404 | Resource not found |
| 405 | Method not allowed |
| 409 | Conflict (duplicate review, already following, etc.) |
| 500 | Internal server error |

## Notes

- Reviews are **unique per user per media** — `POST /reviews` returns 409 if one already exists.
- Media search uses `ILIKE` across `title`, `author`, and `director` fields.
- Quote `like_count` is maintained by a database trigger; no separate RPC call is needed.
- Goal achievement milestones (25%, 50%, 75%, 100%) are unlocked by a database trigger when a library item is marked `finished`.
- The `/priorities` PUT does an upsert — it creates or updates the priority for the given `mediaId`.
