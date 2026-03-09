# Media Tracker - API Specification (Pre-Seeded Database)
## Direct Supabase REST API - No Edge Functions Needed

**Version:** 3.0  
**Last Updated:** 2026-02-10  
**Base URL:** `https://yourproject.supabase.co`  
**Approach:** Direct database queries via Supabase REST API  
**Authentication:** JWT Bearer Token

---

## Overview

With a pre-seeded database, students query the Supabase REST API directly. No Edge Functions needed!

**Benefits:**
- Simpler architecture
- Faster responses (no proxy layer)
- Students learn SQL-based query patterns
- Unlimited queries (no API rate limits)

---

## Authentication

All endpoints use Supabase's built-in auth:

### POST `/auth/v1/signup`

Register new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "created_at": "2025-02-10T10:00:00Z"
  }
}
```

---

### POST `/auth/v1/token?grant_type=password`

Login existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** Same as signup

---

### POST `/auth/v1/token?grant_type=refresh_token`

Refresh expired token.

**Request:**
```json
{
  "refresh_token": "your-refresh-token"
}
```

---

## Media Search & Browse

All media queries go to `/rest/v1/media` with query parameters.

### GET `/rest/v1/media`

Search and filter media (books/movies).

**Headers:**
```
apikey: your-supabase-anon-key
Authorization: Bearer {jwt-token}  (optional for public data)
```

**Query Examples:**

#### Search by title (fuzzy match)
```
GET /rest/v1/media?title=ilike.*harry*&select=*&limit=20
```

#### Filter by type
```
GET /rest/v1/media?media_type=eq.book&select=*&limit=20
```

#### Search + filter + sort
```
GET /rest/v1/media?title=ilike.*lord*&media_type=eq.book&order=average_rating.desc&limit=20
```

#### Pagination
```
GET /rest/v1/media?media_type=eq.movie&order=title.asc&limit=20&offset=40
```

#### Filter by genre
```
GET /rest/v1/media?genres=cs.{Fantasy}&media_type=eq.book&limit=20
```
Note: `cs` = "contains" operator for arrays

#### Filter by year range
```
GET /rest/v1/media?published_year=gte.2020&published_year=lte.2024&limit=20
```

#### Get total count
```
GET /rest/v1/media?media_type=eq.book&select=count
```
Returns: `[{"count": 300}]`

---

### GET `/rest/v1/media?id=eq.{id}`

Get specific media item by ID.

**Example:**
```
GET /rest/v1/media?id=eq.123&select=*
```

**Response:**
```json
[
  {
    "id": 123,
    "media_type": "book",
    "title": "Harry Potter and the Philosopher's Stone",
    "author": "J.K. Rowling",
    "director": null,
    "cover_url": "https://books.google.com/...",
    "description": "Harry Potter has never been...",
    "published_year": 1997,
    "page_count": 223,
    "runtime_minutes": null,
    "genres": ["Fantasy", "Young Adult"],
    "isbn": "9780439708180",
    "language": "en",
    "average_rating": 4.7,
    "rating_count": 1234,
    "review_count": 89,
    "seeded_at": "2025-02-01T00:00:00Z",
    "created_at": "2025-02-01T00:00:00Z",
    "updated_at": "2025-02-10T15:30:00Z"
  }
]
```

---

## User Library

### GET `/rest/v1/user_media`

Get user's library items.

**Query Examples:**

#### Get all library items
```
GET /rest/v1/user_media?user_id=eq.{uuid}&select=*,media(*)
```

#### Filter by status
```
GET /rest/v1/user_media?user_id=eq.{uuid}&status=eq.want_to&select=*,media(*)
```

#### With pagination
```
GET /rest/v1/user_media?user_id=eq.{uuid}&status=eq.finished&order=finished_at.desc&limit=20&offset=0&select=*,media(*)
```

**Response:**
```json
[
  {
    "id": 789,
    "user_id": "uuid-here",
    "media_id": 123,
    "status": "finished",
    "added_at": "2025-02-05T10:00:00Z",
    "started_at": "2025-02-05T11:00:00Z",
    "finished_at": "2025-02-08T14:00:00Z",
    "updated_at": "2025-02-08T14:00:00Z",
    "media": {
      "id": 123,
      "media_type": "book",
      "title": "The Hobbit",
      "author": "J.R.R. Tolkien",
      "cover_url": "https://...",
      "published_year": 1937
    }
  }
]
```

Note: `select=*,media(*)` fetches the related media record via foreign key join.

---

### POST `/rest/v1/user_media`

Add media to library.

**Headers:**
```
apikey: your-supabase-anon-key
Authorization: Bearer {jwt-token}
Content-Type: application/json
Prefer: return=representation
```

**Request:**
```json
{
  "user_id": "uuid-here",
  "media_id": 123,
  "status": "want_to"
}
```

**Response (201 Created):**
```json
{
  "id": 789,
  "user_id": "uuid-here",
  "media_id": 123,
  "status": "want_to",
  "added_at": "2025-02-10T16:00:00Z",
  "started_at": null,
  "finished_at": null,
  "updated_at": "2025-02-10T16:00:00Z"
}
```

---

### PATCH `/rest/v1/user_media?id=eq.{id}`

Update library item status.

**Request:**
```json
{
  "status": "finished",
  "finished_at": "2025-02-10T16:30:00Z"
}
```

**Response (200 OK):**
```json
{
  "id": 789,
  "user_id": "uuid-here",
  "media_id": 123,
  "status": "finished",
  "added_at": "2025-02-05T10:00:00Z",
  "started_at": "2025-02-05T11:00:00Z",
  "finished_at": "2025-02-10T16:30:00Z",
  "updated_at": "2025-02-10T16:30:00Z"
}
```

---

### DELETE `/rest/v1/user_media?id=eq.{id}`

Remove from library.

**Response (204 No Content)**

---

## Reviews

### GET `/rest/v1/reviews`

Get reviews for a media item.

**Query Examples:**

#### Get all reviews for a book
```
GET /rest/v1/reviews?media_id=eq.123&select=*,users(username,avatar_url)&order=created_at.desc
```

#### Get user's reviews
```
GET /rest/v1/reviews?user_id=eq.{uuid}&select=*,media(title,cover_url)
```

**Response:**
```json
[
  {
    "id": 456,
    "user_id": "uuid-alice",
    "media_id": 123,
    "rating": 5,
    "review_text": "Amazing book! Couldn't put it down.",
    "created_at": "2025-02-08T10:00:00Z",
    "updated_at": "2025-02-08T10:00:00Z",
    "users": {
      "username": "alice_reads",
      "avatar_url": "https://..."
    }
  }
]
```

---

### POST `/rest/v1/reviews`

Create a review.

**Request:**
```json
{
  "user_id": "uuid-here",
  "media_id": 123,
  "rating": 5,
  "review_text": "Amazing book! Couldn't put it down."
}
```

**Response (201 Created):**
```json
{
  "id": 456,
  "user_id": "uuid-here",
  "media_id": 123,
  "rating": 5,
  "review_text": "Amazing book! Couldn't put it down.",
  "created_at": "2025-02-10T17:00:00Z",
  "updated_at": "2025-02-10T17:00:00Z"
}
```

---

### PATCH `/rest/v1/reviews?id=eq.{id}`

Update review.

**Request:**
```json
{
  "rating": 4,
  "review_text": "Good book, but a bit slow at times."
}
```

---

### DELETE `/rest/v1/reviews?id=eq.{id}`

Delete review.

---

## User Profiles

### GET `/rest/v1/users?id=eq.{uuid}`

Get user profile.

**Response:**
```json
[
  {
    "id": "uuid-here",
    "email": "user@example.com",
    "username": "bookworm23",
    "display_name": "Alice Johnson",
    "bio": "Love fantasy and sci-fi!",
    "avatar_url": "https://yourproject.supabase.co/storage/v1/object/public/avatars/uuid.jpg",
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-02-10T12:00:00Z"
  }
]
```

---

### PATCH `/rest/v1/users?id=eq.{uuid}`

Update profile.

**Request:**
```json
{
  "display_name": "Alice J. Smith",
  "bio": "Fantasy and sci-fi enthusiast. Book club organizer."
}
```

---

## Social Features

### GET `/rest/v1/follows`

Get followers/following.

**Examples:**

#### Get followers
```
GET /rest/v1/follows?following_id=eq.{uuid}&select=*,follower:users!follower_id(username,avatar_url)
```

#### Get following
```
GET /rest/v1/follows?follower_id=eq.{uuid}&select=*,following:users!following_id(username,avatar_url)
```

---

### POST `/rest/v1/follows`

Follow a user.

**Request:**
```json
{
  "follower_id": "my-uuid",
  "following_id": "their-uuid"
}
```

---

### DELETE `/rest/v1/follows?follower_id=eq.{my-uuid}&following_id=eq.{their-uuid}`

Unfollow a user.

---

### GET `/rest/v1/activity_feed`

Get activity feed.

**Query:**
```
GET /rest/v1/activity_feed?user_id=in.(uuid1,uuid2,uuid3)&select=*,users(username,avatar_url),media(title,cover_url)&order=created_at.desc&limit=20
```

Note: Get list of followed user IDs first, then query activity for those IDs.

---

## Custom Features

### Want-To Priorities

#### GET `/rest/v1/want_to_priorities`
```
GET /rest/v1/want_to_priorities?user_id=eq.{uuid}&select=*,user_media(media(*))&order=order_index.asc
```

#### POST `/rest/v1/want_to_priorities`
```json
{
  "user_id": "uuid-here",
  "user_media_id": 789,
  "priority": 1,
  "order_index": 0,
  "estimated_time_hours": 6,
  "notes": "Must read before book club"
}
```

#### PATCH `/rest/v1/want_to_priorities?id=eq.{id}`
Update priority, order, notes, etc.

---

### Reading Goals

#### GET `/rest/v1/reading_goals`
```
GET /rest/v1/reading_goals?user_id=eq.{uuid}&year=eq.2025&select=*
```

#### POST `/rest/v1/reading_goals`
```json
{
  "user_id": "uuid-here",
  "year": 2025,
  "target_count": 24,
  "media_type": "book"
}
```

#### GET goal progress (view)
```
SELECT 
  rg.*,
  COUNT(um.id) as current_count,
  ROUND(COUNT(um.id)::DECIMAL / rg.target_count * 100, 0) as percentage
FROM reading_goals rg
LEFT JOIN user_media um ON um.user_id = rg.user_id 
  AND um.status = 'finished'
  AND EXTRACT(YEAR FROM um.finished_at) = rg.year
WHERE rg.user_id = 'uuid-here'
GROUP BY rg.id;
```

#### GET `/rest/v1/goal_achievements`
```
GET /rest/v1/goal_achievements?goal_id=eq.{id}&select=*
```

---

### Quotes

#### GET `/rest/v1/quotes`

My quotes:
```
GET /rest/v1/quotes?user_id=eq.{uuid}&select=*,media(title,cover_url)
```

Public quotes:
```
GET /rest/v1/quotes?is_public=eq.true&order=like_count.desc&limit=20&select=*,media(title),users(username)
```

#### POST `/rest/v1/quotes`
```json
{
  "user_id": "uuid-here",
  "media_id": 123,
  "quote_text": "It is our choices, Harry, that show what we truly are...",
  "page_number": 333,
  "is_public": true
}
```

#### POST `/rest/v1/quote_likes`
```json
{
  "quote_id": 301,
  "user_id": "uuid-here"
}
```

---

## File Upload (Profile Images)

### POST `/storage/v1/object/avatars/{filename}`

Upload profile image to Supabase Storage.

**Headers:**
```
apikey: your-supabase-anon-key
Authorization: Bearer {jwt-token}
Content-Type: image/jpeg
```

**Body:** Binary image data

**Response:**
```json
{
  "Key": "avatars/uuid-timestamp.jpg"
}
```

**Public URL:**
```
https://yourproject.supabase.co/storage/v1/object/public/avatars/uuid-timestamp.jpg
```

---

### GET `/storage/v1/object/public/avatars/{filename}`

Retrieve uploaded image (public URL).

---

## Supabase Query Operators Reference

Students will use these in query parameters:

| Operator | Meaning | Example |
|----------|---------|---------|
| `eq` | Equals | `media_type=eq.book` |
| `neq` | Not equals | `status=neq.finished` |
| `gt` | Greater than | `published_year=gt.2020` |
| `gte` | Greater than or equal | `rating=gte.4` |
| `lt` | Less than | `page_count=lt.300` |
| `lte` | Less than or equal | `published_year=lte.2024` |
| `like` | SQL LIKE | `title=like.*Harry*` |
| `ilike` | Case-insensitive LIKE | `title=ilike.*harry*` |
| `is` | IS (for NULL) | `director=is.null` |
| `in` | IN list | `id=in.(1,2,3)` |
| `cs` | Contains (arrays) | `genres=cs.{Fantasy}` |
| `cd` | Contained in (arrays) | `genres=cd.{Fantasy,Sci-Fi}` |

---

## Retrofit Client Example

```kotlin
interface MediaTrackerApi {
    
    // Authentication
    @POST("auth/v1/signup")
    suspend fun register(@Body request: RegisterRequest): AuthResponse
    
    @POST("auth/v1/token?grant_type=password")
    suspend fun login(@Body request: LoginRequest): AuthResponse
    
    // Media search
    @GET("rest/v1/media")
    suspend fun searchMedia(
        @Header("apikey") apiKey: String,
        @Query("title") title: String? = null,
        @Query("media_type") type: String? = null,
        @Query("order") order: String? = "average_rating.desc",
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0,
        @Query("select") select: String = "*"
    ): List<Media>
    
    // Get specific media
    @GET("rest/v1/media")
    suspend fun getMedia(
        @Header("apikey") apiKey: String,
        @Query("id") id: String,  // "eq.123"
        @Query("select") select: String = "*"
    ): List<Media>
    
    // User library
    @GET("rest/v1/user_media")
    suspend fun getLibrary(
        @Header("apikey") apiKey: String,
        @Header("Authorization") token: String,
        @Query("user_id") userId: String,  // "eq.uuid"
        @Query("status") status: String? = null,
        @Query("select") select: String = "*,media(*)",
        @Query("order") order: String = "added_at.desc",
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): List<UserMedia>
    
    @POST("rest/v1/user_media")
    suspend fun addToLibrary(
        @Header("apikey") apiKey: String,
        @Header("Authorization") token: String,
        @Header("Prefer") prefer: String = "return=representation",
        @Body request: AddToLibraryRequest
    ): UserMedia
    
    @Headers("Content-Type: application/json")
    @PATCH("rest/v1/user_media")
    suspend fun updateLibraryItem(
        @Header("apikey") apiKey: String,
        @Header("Authorization") token: String,
        @Header("Prefer") prefer: String = "return=representation",
        @Query("id") id: String,  // "eq.789"
        @Body request: UpdateLibraryRequest
    ): List<UserMedia>
    
    // Reviews
    @GET("rest/v1/reviews")
    suspend fun getReviews(
        @Header("apikey") apiKey: String,
        @Query("media_id") mediaId: String,  // "eq.123"
        @Query("select") select: String = "*,users(username,avatar_url)",
        @Query("order") order: String = "created_at.desc",
        @Query("limit") limit: Int = 20
    ): List<Review>
    
    @POST("rest/v1/reviews")
    suspend fun createReview(
        @Header("apikey") apiKey: String,
        @Header("Authorization") token: String,
        @Header("Prefer") prefer: String = "return=representation",
        @Body request: CreateReviewRequest
    ): Review
}
```

---

## Error Responses

Supabase returns standard HTTP status codes:

**400 Bad Request:**
```json
{
  "code": "PGRST102",
  "details": null,
  "hint": null,
  "message": "Invalid query parameter"
}
```

**401 Unauthorized:**
```json
{
  "code": "401",
  "message": "Invalid JWT token"
}
```

**409 Conflict:**
```json
{
  "code": "23505",
  "details": "Key (user_id, media_id)=(uuid, 123) already exists.",
  "message": "duplicate key value violates unique constraint"
}
```

---

## Rate Limiting

Supabase free tier limits:
- **50,000 monthly active users**
- **500 MB database**
- **1 GB file storage**
- **2 GB bandwidth**

No per-request rate limits on free tier!

---

**END OF API SPECIFICATION**

Students query Supabase directly - no Edge Functions, no external APIs, unlimited queries!
