# Media Tracker — Token Expiry Configuration

This document records the decided token lifetimes and explains the reasoning, especially around the pedagogical goal of ensuring students actually encounter (and handle) token expiry during the course.

---

## Configured Values

| Token | Lifetime | Reasoning |
|---|---|---|
| Access token | **30 minutes** | Short enough to expire during a 3-hour class session |
| Refresh token | **7 days** | Long enough to survive between weekly classes; short enough to feel realistic |

---

## Why 30 Minutes for Access Tokens

The goal is to ensure every student hits a real token expiry at least once during Week 4 (the interceptor and token refresh week) — ideally during class, where you can help them debug it.

A 30-minute access token almost guarantees this: a student who logs in at 6:00pm and works through Work Session 1 without touching the app will hit a 401 by 6:30pm during Work Session 2. That's the exact moment they're supposed to be implementing the auth interceptor and token refresh flow, so the failure is well-timed.

Alternatives considered:
- **60 minutes** — likely too long. A focused 3-hour session might not trigger expiry until the very end, when there's less time to debug.
- **15 minutes** — risk of expiring during Regroup presentations and interrupting demos. 30 minutes is a better balance.
- **1 hour** (Supabase default for JWTs) — explicitly too long for pedagogical purposes.

---

## Why 7 Days for Refresh Tokens

Students work on the app at home between weekly classes. A 7-day refresh token means a student who completes their homework the evening after class will still have a valid session when they return to the app the following week. Their app won't unexpectedly boot them to the login screen mid-homework session.

If the refresh token were shorter (e.g., 1 day), students who set the project aside for a few days would return to a broken auth state and blame the app rather than understanding the design. The goal of refresh token education is to teach the recovery flow, not to create friction.

---

## JWT Payload

The access token JWT issued by the Edge Function should contain:

```json
{
  "sub": "<user-uuid>",
  "email": "user@example.com",
  "role": "authenticated",
  "iat": 1716000000,
  "exp": 1716001800
}
```

`exp = iat + 1800` (30 minutes in seconds).

---

## Supabase Configuration Note

If using Supabase's built-in JWT issuance, the JWT expiry is set in the Supabase dashboard under **Authentication → Settings → JWT Expiry**. The default is 3600 (1 hour). Change it to **1800** (30 minutes).

However, since this API uses custom Edge Functions (not Supabase Auth's built-in session management), the JWT is issued and signed manually inside the `POST /tokens` Edge Function. The expiry is set in the JWT payload at issuance time, not via the dashboard setting. Ensure the Edge Function uses:

```typescript
const expiresIn = 30 * 60; // 30 minutes in seconds
const payload = {
  sub: user.id,
  email: user.email,
  role: 'authenticated',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + expiresIn,
};
```

Refresh tokens expire at `now() + 7 days`:
```typescript
const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
```

---

## Teaching Note for Week 4

When introducing token refresh in the Regroup, tell students the token lifetime explicitly:

> "Access tokens in our API expire after 30 minutes. I made this short on purpose — you'll hit a 401 during class tonight if you log in and then go to your pod room. That's the experience I want you to debug. A real production app might use 1-hour or 24-hour tokens, but the pattern for handling expiry is the same regardless of the lifetime."

This frames the expiry as intentional and pedagogically motivated, not a bug in the API.
