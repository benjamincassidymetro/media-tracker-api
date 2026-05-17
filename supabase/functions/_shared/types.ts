// ---------------------------------------------------------------------------
// Database row shapes (snake_case from PostgreSQL)
// ---------------------------------------------------------------------------

export type DbUser = {
  id: string
  email: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  follower_count: number
  following_count: number
  tracked_count: number
  created_at: string
  is_following?: boolean
}

export type DbMedia = {
  id: number
  media_type: string
  title: string
  description: string | null
  cover_url: string | null
  published_year: number | null
  genres: string[]
  author: string | null
  page_count: number | null
  isbn: string | null
  director: string | null
  runtime_minutes: number | null
  creator: string | null
  network: string | null
  season_count: number | null
  episode_count: number | null
  average_rating: number
  rating_count: number
  review_count: number
  created_at: string
}

export type DbLibraryItem = {
  user_id: string
  media_id: number
  status: string
  added_at: string
  updated_at: string
  media?: DbMedia
}

export type DbReview = {
  id: number
  user_id: string
  media_id: number
  rating: number
  review_text: string | null
  share_to_feed: boolean
  created_at: string
  updated_at: string
  user?: DbUser
  media?: DbMedia
}

export type DbActivity = {
  id: number
  user_id: string
  activity_type: string
  media_id: number
  rating: number | null
  review_text: string | null
  created_at: string
  user?: DbUser
  media?: DbMedia
}

export type DbGoal = {
  id: number
  user_id: string
  year: number
  target_count: number
  media_type: string
}

export type DbQuote = {
  id: number
  user_id: string
  media_id: number
  quote_text: string
  page_number: number | null
  is_public: boolean
  like_count: number
  created_at: string
  media?: DbMedia
}

export type DbPriority = {
  user_id: string
  media_id: number
  priority: number
  order_index: number
  estimated_time_hours: number | null
  notes: string | null
  media?: DbMedia
}

// ---------------------------------------------------------------------------
// API response shapes (camelCase for clients)
// ---------------------------------------------------------------------------

export type ApiUserProfile = {
  id: string
  email: string
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  followerCount: number
  followingCount: number
  trackedCount: number
  createdAt: string
  isFollowing?: boolean
}

export type ApiMedia = {
  id: number
  mediaType: string
  title: string
  author: string | null
  director: string | null
  creator: string | null
  network: string | null
  coverUrl: string | null
  publishedYear: number | null
  averageRating: number
  ratingCount: number
  genres: string[]
}

export type ApiMediaDetail = ApiMedia & {
  description: string | null
  pageCount: number | null
  runtimeMinutes: number | null
  seasonCount: number | null
  episodeCount: number | null
  isbn: string | null
  reviewCount: number
}

// ---------------------------------------------------------------------------
// Formatters — DB row → API shape
// ---------------------------------------------------------------------------

export function formatUser(row: DbUser, authUserId?: string): ApiUserProfile {
  const profile: ApiUserProfile = {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    followerCount: row.follower_count,
    followingCount: row.following_count,
    trackedCount: row.tracked_count,
    createdAt: row.created_at,
  }
  // isFollowing is omitted on the authenticated user's own profile
  if (authUserId && row.id !== authUserId && row.is_following !== undefined) {
    profile.isFollowing = row.is_following
  }
  return profile
}

export function formatMedia(row: DbMedia): ApiMedia {
  return {
    id: row.id,
    mediaType: row.media_type,
    title: row.title,
    author: row.author,
    director: row.director,
    creator: row.creator,
    network: row.network,
    coverUrl: row.cover_url,
    publishedYear: row.published_year,
    averageRating: Number(row.average_rating),
    ratingCount: row.rating_count,
    genres: row.genres,
  }
}

export function formatMediaDetail(row: DbMedia): ApiMediaDetail {
  return {
    ...formatMedia(row),
    description: row.description,
    pageCount: row.page_count,
    runtimeMinutes: row.runtime_minutes,
    seasonCount: row.season_count,
    episodeCount: row.episode_count,
    isbn: row.isbn,
    reviewCount: row.review_count,
  }
}

export function formatLibraryItem(row: DbLibraryItem) {
  return {
    userId: row.user_id,
    mediaId: row.media_id,
    status: row.status,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
    media: row.media ? formatMedia(row.media) : undefined,
  }
}

export function formatReview(row: DbReview) {
  return {
    id: row.id,
    userId: row.user_id,
    mediaId: row.media_id,
    rating: row.rating,
    reviewText: row.review_text,
    createdAt: row.created_at,
    user: row.user ? formatUser(row.user) : undefined,
    media: row.media ? formatMedia(row.media) : undefined,
  }
}

export function formatActivity(row: DbActivity) {
  return {
    id: row.id,
    userId: row.user_id,
    activityType: row.activity_type,
    mediaId: row.media_id,
    rating: row.rating,
    reviewText: row.review_text,
    createdAt: row.created_at,
    user: row.user ? formatUser(row.user) : undefined,
    media: row.media ? formatMedia(row.media) : undefined,
  }
}

export function formatGoal(row: DbGoal, currentCount: number) {
  return {
    id: row.id,
    userId: row.user_id,
    year: row.year,
    targetCount: row.target_count,
    currentCount,
    mediaType: row.media_type,
  }
}

export function formatQuote(row: DbQuote) {
  return {
    id: row.id,
    userId: row.user_id,
    mediaId: row.media_id,
    quoteText: row.quote_text,
    pageNumber: row.page_number,
    isPublic: row.is_public,
    likeCount: row.like_count,
    createdAt: row.created_at,
    media: row.media ? formatMedia(row.media) : undefined,
  }
}

export function formatPriority(row: DbPriority) {
  return {
    mediaId: row.media_id,
    priority: row.priority,
    orderIndex: row.order_index,
    estimatedTimeHours: row.estimated_time_hours,
    notes: row.notes,
    media: row.media ? formatMedia(row.media) : undefined,
  }
}
