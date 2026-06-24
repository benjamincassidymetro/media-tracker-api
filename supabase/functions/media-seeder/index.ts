import { db } from '../_shared/db.ts'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY')
const GOOGLE_BOOKS_API_KEY = Deno.env.get('GOOGLE_BOOKS_API_KEY')
// If set, the Authorization: Bearer {SEEDER_SECRET} header is required.
// The pg_cron job must pass this value. Leave unset to run without auth (dev/test).
const SEEDER_SECRET = Deno.env.get('SEEDER_SECRET')

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w300'
const BOOKS_BASE = 'https://www.googleapis.com/books/v1'

// ---------------------------------------------------------------------------
// Genre mappings — TMDB genre IDs → canonical genre names
// ---------------------------------------------------------------------------

const TMDB_MOVIE_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Action',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  14: 'Fantasy',
  36: 'Historical Fiction',
  27: 'Horror',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  53: 'Thriller',
  10752: 'War',
  37: 'Action',
}

const TMDB_SHOW_GENRE_MAP: Record<number, string> = {
  10759: 'Action',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Drama',
  9648: 'Mystery',
  10749: 'Romance',
  10765: 'Science Fiction',
  10764: 'Reality',
  10768: 'War',
}

const CANONICAL_GENRES = new Set([
  'Science Fiction',
  'Fantasy',
  'Literary Fiction',
  'Historical Fiction',
  'Mystery',
  'Thriller',
  'Horror',
  'Crime',
  'Drama',
  'Comedy',
  'Action',
  'Romance',
  'Non-Fiction',
  'Documentary',
  'Animation',
  'Reality',
  'War',
])

// ---------------------------------------------------------------------------
// Book subjects — cycled per run. Each has a query and the canonical genre
// that best represents it.
// ---------------------------------------------------------------------------

const BOOK_SUBJECTS: Array<{ query: string; genre: string }> = [
  { query: 'Science Fiction', genre: 'Science Fiction' },
  { query: 'Fantasy', genre: 'Fantasy' },
  { query: 'Mystery', genre: 'Mystery' },
  { query: 'Thriller', genre: 'Thriller' },
  { query: 'Historical Fiction', genre: 'Historical Fiction' },
  { query: 'Literary Fiction', genre: 'Literary Fiction' },
  { query: 'Horror', genre: 'Horror' },
  { query: 'Crime Fiction', genre: 'Crime' },
  { query: 'Romance', genre: 'Romance' },
  { query: 'Biography', genre: 'Non-Fiction' },
  { query: 'Popular Science', genre: 'Non-Fiction' },
  { query: 'Technology', genre: 'Non-Fiction' },
  { query: 'Philosophy', genre: 'Non-Fiction' },
  { query: 'World History', genre: 'Historical Fiction' },
  { query: 'Psychology', genre: 'Non-Fiction' },
  { query: 'Business', genre: 'Non-Fiction' },
  { query: 'Self-Help', genre: 'Non-Fiction' },
  { query: 'Adventure Fiction', genre: 'Action' },
  { query: 'Contemporary Fiction', genre: 'Literary Fiction' },
  { query: 'Graphic Novel', genre: 'Literary Fiction' },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MediaInsert = {
  external_id: string
  media_type: 'book' | 'movie' | 'show'
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
}

type TmdbListResponse = { results: Array<{ id: number }> }

type TmdbMovieDetail = {
  id: number
  title: string
  overview: string
  release_date: string
  runtime: number | null
  genres: Array<{ id: number }>
  poster_path: string | null
  credits: { crew: Array<{ job: string; name: string }> }
}

type TmdbShowDetail = {
  id: number
  name: string
  overview: string
  first_air_date: string
  genres: Array<{ id: number }>
  poster_path: string | null
  created_by: Array<{ name: string }>
  networks: Array<{ name: string }>
  number_of_seasons: number | null
  number_of_episodes: number | null
}

type GoogleBooksResponse = {
  items?: Array<{
    id: string
    volumeInfo: {
      title: string
      subtitle?: string
      description?: string
      authors?: string[]
      publishedDate?: string
      pageCount?: number
      industryIdentifiers?: Array<{ type: string; identifier: string }>
      imageLinks?: { thumbnail?: string }
    }
  }>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapGenreIds(ids: number[], map: Record<number, string>): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of ids) {
    const name = map[id]
    if (name && CANONICAL_GENRES.has(name) && !seen.has(name)) {
      seen.add(name)
      result.push(name)
    }
  }
  return result
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

function parseYear(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const year = parseInt(dateStr.slice(0, 4), 10)
  return isNaN(year) ? null : year
}

// ---------------------------------------------------------------------------
// TMDB — movies
// Fetches one page of popular movies, then all detail+credits in parallel.
// ---------------------------------------------------------------------------

async function fetchMovies(page: number): Promise<{ records: MediaInsert[]; errors: string[] }> {
  const errors: string[] = []
  const list = await fetchJson<TmdbListResponse>(
    `${TMDB_BASE}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`,
  )

  const detailResults = await Promise.allSettled(
    list.results.map((item) =>
      fetchJson<TmdbMovieDetail>(
        `${TMDB_BASE}/movie/${item.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`,
      )
    ),
  )

  const records: MediaInsert[] = []
  for (const result of detailResults) {
    if (result.status === 'rejected') {
      errors.push(`movie detail: ${result.reason}`)
      continue
    }
    const d = result.value
    const director = d.credits?.crew?.find((c) => c.job === 'Director')?.name ?? null
    records.push({
      external_id: `tmdb-movie-${d.id}`,
      media_type: 'movie',
      title: d.title,
      description: d.overview || null,
      cover_url: d.poster_path ? `${TMDB_IMAGE_BASE}${d.poster_path}` : null,
      published_year: parseYear(d.release_date),
      genres: mapGenreIds(d.genres?.map((g) => g.id) ?? [], TMDB_MOVIE_GENRE_MAP),
      author: null,
      page_count: null,
      isbn: null,
      director,
      runtime_minutes: d.runtime ?? null,
      creator: null,
      network: null,
      season_count: null,
      episode_count: null,
    })
  }
  return { records, errors }
}

// ---------------------------------------------------------------------------
// TMDB — TV shows
// Fetches one page of popular shows, then all details in parallel.
// ---------------------------------------------------------------------------

async function fetchShows(page: number): Promise<{ records: MediaInsert[]; errors: string[] }> {
  const errors: string[] = []
  const list = await fetchJson<TmdbListResponse>(
    `${TMDB_BASE}/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`,
  )

  const detailResults = await Promise.allSettled(
    list.results.map((item) =>
      fetchJson<TmdbShowDetail>(`${TMDB_BASE}/tv/${item.id}?api_key=${TMDB_API_KEY}`)
    ),
  )

  const records: MediaInsert[] = []
  for (const result of detailResults) {
    if (result.status === 'rejected') {
      errors.push(`show detail: ${result.reason}`)
      continue
    }
    const d = result.value
    records.push({
      external_id: `tmdb-show-${d.id}`,
      media_type: 'show',
      title: d.name,
      description: d.overview || null,
      cover_url: d.poster_path ? `${TMDB_IMAGE_BASE}${d.poster_path}` : null,
      published_year: parseYear(d.first_air_date),
      genres: mapGenreIds(d.genres?.map((g) => g.id) ?? [], TMDB_SHOW_GENRE_MAP),
      author: null,
      page_count: null,
      isbn: null,
      director: null,
      runtime_minutes: null,
      creator: d.created_by?.[0]?.name ?? null,
      network: d.networks?.[0]?.name ?? null,
      season_count: d.number_of_seasons ?? null,
      episode_count: d.number_of_episodes ?? null,
    })
  }
  return { records, errors }
}

// ---------------------------------------------------------------------------
// Google Books
// Fetches 40 books from one subject at a given startIndex offset.
// ---------------------------------------------------------------------------

async function fetchBooks(
  subjectIndex: number,
  startIndex: number,
): Promise<{ records: MediaInsert[]; errors: string[] }> {
  const subject = BOOK_SUBJECTS[subjectIndex]
  const data = await fetchJson<GoogleBooksResponse>(
    `${BOOKS_BASE}/volumes?q=subject:${encodeURIComponent(subject.query)}&orderBy=relevance&maxResults=40&startIndex=${startIndex}&langRestrict=en&key=${GOOGLE_BOOKS_API_KEY}`,
  )

  if (!data.items?.length) return { records: [], errors: [] }

  const records: MediaInsert[] = data.items.map((item) => {
    const info = item.volumeInfo
    const isbn =
      info.industryIdentifiers?.find((i) => i.type === 'ISBN_13')?.identifier ??
      info.industryIdentifiers?.find((i) => i.type === 'ISBN_10')?.identifier ??
      null

    let coverUrl = info.imageLinks?.thumbnail ?? null
    if (coverUrl) {
      // Upgrade Google Books thumbnail to a cleaner URL (remove edge curl artifact)
      coverUrl = coverUrl.replace(/&edge=curl/g, '').replace(/zoom=\d/, 'zoom=1')
    }

    return {
      external_id: `gb-${item.id}`,
      media_type: 'book' as const,
      title: info.title,
      description: info.description ?? info.subtitle ?? null,
      cover_url: coverUrl,
      published_year: parseYear(info.publishedDate),
      genres: [subject.genre],
      author: info.authors?.[0] ?? null,
      page_count: info.pageCount ?? null,
      isbn,
      director: null,
      runtime_minutes: null,
      creator: null,
      network: null,
      season_count: null,
      episode_count: null,
    }
  })

  return { records, errors: [] }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // pg_cron scheduled invocations use POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // If SEEDER_SECRET is configured, enforce it via Authorization: Bearer header.
  // The pg_cron invocation must include this header. Unset in local dev to skip the check.
  if (SEEDER_SECRET) {
    const auth = req.headers.get('Authorization')
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    if (token !== SEEDER_SECRET) {
      return new Response(
        JSON.stringify({ code: 'UNAUTHORIZED', message: 'Invalid or missing seeder secret.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  if (!TMDB_API_KEY || !GOOGLE_BOOKS_API_KEY) {
    return new Response(
      JSON.stringify({ code: 'CONFIGURATION_ERROR', message: 'Missing TMDB_API_KEY or GOOGLE_BOOKS_API_KEY.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Derive a monotonically increasing run number from the current 30-minute window.
  // Stateless — no DB tracking needed. Drives page and subject rotation.
  const runNumber = Math.floor(Date.now() / (30 * 60 * 1000))
  const moviePage = (runNumber % 250) + 1       // cycles pages 1–250 → ~5,000 unique movies
  const showPage = (runNumber % 150) + 1        // cycles pages 1–150 → ~3,000 unique shows
  const subjectIndex = runNumber % BOOK_SUBJECTS.length
  const bookStartIndex = (Math.floor(runNumber / BOOK_SUBJECTS.length) % 25) * 40 // 25 pages × 40 → 1,000/subject

  const [moviesResult, showsResult, booksResult] = await Promise.allSettled([
    fetchMovies(moviePage),
    fetchShows(showPage),
    fetchBooks(subjectIndex, bookStartIndex),
  ])

  const errors: string[] = []
  const allRecords: MediaInsert[] = []

  if (moviesResult.status === 'fulfilled') {
    allRecords.push(...moviesResult.value.records)
    errors.push(...moviesResult.value.errors)
  } else {
    errors.push(`movies list: ${moviesResult.reason}`)
  }

  if (showsResult.status === 'fulfilled') {
    allRecords.push(...showsResult.value.records)
    errors.push(...showsResult.value.errors)
  } else {
    errors.push(`shows list: ${showsResult.reason}`)
  }

  if (booksResult.status === 'fulfilled') {
    allRecords.push(...booksResult.value.records)
    errors.push(...booksResult.value.errors)
  } else {
    errors.push(`books: ${booksResult.reason}`)
  }

  let upsertError: string | null = null
  if (allRecords.length > 0) {
    const { error } = await db.from('media').upsert(allRecords, { onConflict: 'external_id' })
    if (error) upsertError = error.message
  }

  const movieCount = moviesResult.status === 'fulfilled' ? moviesResult.value.records.length : 0
  const showCount = showsResult.status === 'fulfilled' ? showsResult.value.records.length : 0
  const bookCount = booksResult.status === 'fulfilled' ? booksResult.value.records.length : 0

  const isError = !!upsertError || (errors.length > 0 && allRecords.length === 0)

  return new Response(
    JSON.stringify({
      run: runNumber,
      pages: { movies: moviePage, shows: showPage },
      book_subject: {
        index: subjectIndex,
        query: BOOK_SUBJECTS[subjectIndex].query,
        start_index: bookStartIndex,
      },
      counts: {
        movies: movieCount,
        shows: showCount,
        books: bookCount,
        total: movieCount + showCount + bookCount,
      },
      upsert_error: upsertError,
      errors,
    }),
    {
      status: isError ? 500 : 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
})
