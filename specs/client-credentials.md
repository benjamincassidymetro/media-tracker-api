# Media Tracker — Client Credentials

These are the credentials the Android app must send on every auth request (`POST /users` and `POST /tokens`). They identify the app as a trusted client, not an individual user.

---

## Values

| Field | Value |
|---|---|
| `clientId` | `ics342-android-v1` |
| `clientSecret` | `mt-android-s26-xK9pQ2` |

---

## Where to Use

Students hardcode both values as constants in `ApiConstants.kt`:

```kotlin
object ApiConstants {
    const val BASE_URL = "https://<project-id>.supabase.co/functions/v1/"
    const val CLIENT_ID = "ics342-android-v1"
    const val CLIENT_SECRET = "mt-android-s26-xK9pQ2"
}
```

The `AuthInterceptor` (Week 4) attaches `CLIENT_ID` as the `X-Client-ID` header on every request. `CLIENT_SECRET` is only sent in the body of auth requests — never in a header.

---

## What to Tell Students

Post both values in Discord at the start of Week 3 (the week students first wire up `POST /users` and `POST /tokens`). They are not sensitive in the way a production secret would be — they're shared with the whole class and the server validates them only to prevent completely unauthorized third-party registrations. In a real production context, client secrets would be stored more carefully (environment variables, secrets manager, etc.) and would never be in source code.

Tell students: "These are shared class credentials, not your personal credentials. Your personal login email and password are separate."

---

## Server Configuration

The `oauth_clients` table must contain one row before the API will accept any auth requests:

```sql
-- Run once during Supabase setup
-- Replace the hash with the bcrypt hash of 'mt-android-s26-xK9pQ2'
INSERT INTO oauth_clients (client_id, client_secret_hash, description)
VALUES (
  'ics342-android-v1',
  '$2b$12$REPLACE_WITH_ACTUAL_BCRYPT_HASH',
  'ICS342 Android client — Summer 2026'
);
```

To generate the bcrypt hash during setup:
```javascript
// In a Node.js setup script or Supabase Edge Function
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';
const hash = await bcrypt.hash('mt-android-s26-xK9pQ2', 12);
console.log(hash); // copy this into the INSERT above
```

---

## Rationale for This Design

**Why require a client secret at all?** It mirrors the OAuth2 confidential client pattern, which is what students will encounter on real projects. It gives an excuse to teach `ApiConstants.kt`, the interceptor pattern (Week 4), and why secrets don't belong in individual API call bodies. The secret is low-sensitivity here — treat it as a teaching prop, not a real security control.

**Why not use Supabase's built-in anon key?** The Supabase anon key is already included in network requests when using the Supabase client library. Since students are building their own HTTP client (Retrofit + OkHttp), they're not using the Supabase client library, so the anon key pattern doesn't apply. The custom `clientId`/`clientSecret` model is cleaner and more instructive for this context.
