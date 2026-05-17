# Media Tracker — Seed Data Specification

This document specifies what to seed into the `media` table before the API goes live, and how to set up test accounts.

---

## Catalog Strategy: Curated Core + Bulk API Fill

The catalog is built in two phases:

**Phase 1 — Curated picks (120 items):** The 120 items listed in this document are hardcoded in the seed script as a `seedItems` array. These are recognizable, high-quality titles students will actually want to search for. Every item in this list gets full metadata from TMDB or Google Books.

**Phase 2 — Bulk API fill (≥2,880 more items, target 3,000+ total):** After seeding the curated list, the script automatically fetches additional titles from TMDB and Google Books to reach the 3,000-item minimum. This is what makes the app feel real — students are browsing an actual catalog, not a toy list.

The bulk fill must run after the curated items so their IDs are low and they appear first in unfiltered searches (good for demos). Deduplication is by title + media_type.

---

## Why 3,000+?

A catalog this size makes the app feel like a real product, not a classroom exercise. With the default `limit=20`, an unfiltered listing requires 150+ pages — students are building real infinite scroll, not a toy. A 3,000-item catalog also guarantees:
- Any genre filter returns dozens of results spanning multiple pages
- Search results feel meaningful — typing "sci" returns a real list, not 3 items
- The LazyColumn never "runs out" during a normal demo session
- Students can build a personal library without exhausting the catalog

---

## Catalog Size and Composition

**Target: 3,000+ items minimum** (no hard cap — more is fine)

Curated picks (120 items):
- 40 books
- 40 movies
- 40 TV shows

Bulk API fill (2,880+ additional items):
- ~1,000 books (Google Books, multiple subject queries with pagination)
- ~1,000 movies (TMDB top-rated, pages 1–50)
- ~880+ TV shows (TMDB top-rated, pages 1–50)

**Genre distribution** (approximate, items may belong to multiple genres):

| Genre | Books | Movies | Shows |
|---|---|---|---|
| Science Fiction | 8+ | 8+ | 6+ |
| Fantasy | 8+ | 6+ | 6+ |
| Literary Fiction / Drama | 8+ | 8+ | 6+ |
| Mystery / Thriller | 6+ | 8+ | 8+ |
| Non-Fiction | 6+ | — | — |
| Documentary | — | 4+ | 4+ |
| Comedy | 4+ | 6+ | 10+ |

---

## Suggested Titles

These are starting points. Feel free to swap titles — the goal is recognizability and variety.

### Books (40)

| Title | Author | Year | Genre(s) |
|---|---|---|---|
| Dune | Frank Herbert | 1965 | Science Fiction |
| The Left Hand of Darkness | Ursula K. Le Guin | 1969 | Science Fiction |
| Ender's Game | Orson Scott Card | 1985 | Science Fiction |
| Project Hail Mary | Andy Weir | 2021 | Science Fiction |
| The Martian | Andy Weir | 2011 | Science Fiction |
| Klara and the Sun | Kazuo Ishiguro | 2021 | Science Fiction |
| Foundation | Isaac Asimov | 1951 | Science Fiction |
| Recursion | Blake Crouch | 2019 | Science Fiction, Thriller |
| The Name of the Wind | Patrick Rothfuss | 2007 | Fantasy |
| The Way of Kings | Brandon Sanderson | 2010 | Fantasy |
| A Wizard of Earthsea | Ursula K. Le Guin | 1968 | Fantasy |
| Jonathan Strange & Mr Norrell | Susanna Clarke | 2004 | Fantasy |
| The House in the Cerulean Sea | TJ Klune | 2020 | Fantasy |
| Piranesi | Susanna Clarke | 2020 | Fantasy, Mystery |
| Never Let Me Go | Kazuo Ishiguro | 2005 | Literary Fiction |
| Pachinko | Min Jin Lee | 2017 | Literary Fiction |
| Normal People | Sally Rooney | 2018 | Literary Fiction |
| The Remains of the Day | Kazuo Ishiguro | 1989 | Literary Fiction |
| Demon Copperhead | Barbara Kingsolver | 2022 | Literary Fiction |
| All the Light We Cannot See | Anthony Doerr | 2014 | Historical Fiction |
| The Night Circus | Erin Morgenstern | 2011 | Fantasy |
| Station Eleven | Emily St. John Mandel | 2014 | Science Fiction |
| The Girl with the Dragon Tattoo | Stieg Larsson | 2005 | Mystery, Thriller |
| Gone Girl | Gillian Flynn | 2012 | Mystery, Thriller |
| The Thursday Murder Club | Richard Osman | 2020 | Mystery |
| Educated | Tara Westover | 2018 | Non-Fiction |
| Becoming | Michelle Obama | 2018 | Non-Fiction |
| Sapiens | Yuval Noah Harari | 2011 | Non-Fiction |
| The Body Keeps the Score | Bessel van der Kolk | 2014 | Non-Fiction |
| Atomic Habits | James Clear | 2018 | Non-Fiction |
| Born a Crime | Trevor Noah | 2016 | Non-Fiction |
| In the Woods | Tana French | 2007 | Mystery |
| The Secret History | Donna Tartt | 1992 | Mystery, Literary Fiction |
| Mexican Gothic | Silvia Moreno-Garcia | 2020 | Horror, Mystery |
| Anxious People | Fredrik Backman | 2019 | Literary Fiction, Comedy |
| A Gentleman in Moscow | Amor Towles | 2016 | Historical Fiction |
| The Hitchhiker's Guide to the Galaxy | Douglas Adams | 1979 | Science Fiction, Comedy |
| Good Omens | Terry Pratchett & Neil Gaiman | 1990 | Fantasy, Comedy |
| The Midnight Library | Matt Haig | 2020 | Literary Fiction |
| Tomorrow, and Tomorrow, and Tomorrow | Gabrielle Zevin | 2022 | Literary Fiction |

### Movies (40)

| Title | Director | Year | Genre(s) |
|---|---|---|---|
| Dune: Part One | Denis Villeneuve | 2021 | Science Fiction |
| Dune: Part Two | Denis Villeneuve | 2024 | Science Fiction |
| Arrival | Denis Villeneuve | 2016 | Science Fiction |
| Interstellar | Christopher Nolan | 2014 | Science Fiction |
| The Martian | Ridley Scott | 2015 | Science Fiction |
| Everything Everywhere All at Once | Daniel Kwan & Daniel Scheinert | 2022 | Science Fiction, Comedy |
| Oppenheimer | Christopher Nolan | 2023 | Drama, Historical |
| Poor Things | Yorgos Lanthimos | 2023 | Drama, Comedy |
| The Banshees of Inisherin | Martin McDonagh | 2022 | Drama, Comedy |
| Past Lives | Celine Song | 2023 | Drama |
| The Holdovers | Alexander Payne | 2023 | Drama, Comedy |
| Tár | Todd Field | 2022 | Drama |
| All Quiet on the Western Front | Edward Berger | 2022 | Drama, War |
| Triangle of Sadness | Ruben Östlund | 2022 | Comedy, Drama |
| The Whale | Darren Aronofsky | 2022 | Drama |
| Parasite | Bong Joon-ho | 2019 | Drama, Thriller |
| Get Out | Jordan Peele | 2017 | Horror, Thriller |
| Us | Jordan Peele | 2019 | Horror, Thriller |
| Knives Out | Rian Johnson | 2019 | Mystery, Comedy |
| Glass Onion | Rian Johnson | 2022 | Mystery, Comedy |
| The Menu | Mark Mylod | 2022 | Thriller, Comedy |
| Nope | Jordan Peele | 2022 | Horror, Science Fiction |
| Top Gun: Maverick | Joseph Kosinski | 2022 | Action |
| Mission: Impossible — Dead Reckoning | Christopher McQuarrie | 2023 | Action, Thriller |
| Spider-Man: Into the Spider-Verse | Bob Persichetti et al. | 2018 | Animation, Action |
| Soul | Pete Docter | 2020 | Animation, Comedy |
| Turning Red | Domee Shi | 2022 | Animation, Comedy |
| Elemental | Peter Sohn | 2023 | Animation |
| Minari | Lee Isaac Chung | 2020 | Drama |
| Nomadland | Chloé Zhao | 2020 | Drama |
| The Power of the Dog | Jane Campion | 2021 | Drama, Western |
| CODA | Sian Heder | 2021 | Drama |
| Belfast | Kenneth Branagh | 2021 | Drama |
| Spencer | Pablo Larraín | 2021 | Drama |
| Free Guy | Shawn Levy | 2021 | Action, Comedy |
| The Lost City | Adam Nee & Aaron Nee | 2022 | Comedy, Action |
| Emily the Criminal | John Patton Ford | 2022 | Thriller |
| Women Talking | Sarah Polley | 2022 | Drama |
| Causeway | Lila Neugebauer | 2022 | Drama |
| The Zone of Interest | Jonathan Glazer | 2023 | Drama, War |

### TV Shows (40)

| Title | Creator | Network | Years | Genre(s) |
|---|---|---|---|---|
| Andor | Tony Gilroy | Disney+ | 2022– | Science Fiction, Drama |
| Severance | Dan Erickson | Apple TV+ | 2022– | Science Fiction, Thriller |
| The Bear | Christopher Storer | FX/Hulu | 2022– | Drama |
| Succession | Jesse Armstrong | HBO | 2018–2023 | Drama |
| The Last of Us | Craig Mazin & Neil Druckmann | HBO | 2023– | Drama |
| House of the Dragon | Ryan Condal & George R.R. Martin | HBO | 2022– | Fantasy, Drama |
| Slow Horses | Will Smith | Apple TV+ | 2022– | Thriller |
| Bad Sisters | Sharon Horgan | Apple TV+ | 2022– | Drama, Comedy |
| Ted Lasso | Jason Sudeikis et al. | Apple TV+ | 2020–2023 | Comedy, Drama |
| Mythic Quest | Rob McElhenney et al. | Apple TV+ | 2020– | Comedy |
| Abbott Elementary | Quinta Brunson | ABC | 2021– | Comedy |
| Shrinking | Jason Segel & Bill Lawrence | Apple TV+ | 2023– | Comedy, Drama |
| Only Murders in the Building | Steve Martin & John Hoffman | Hulu | 2021– | Mystery, Comedy |
| Poker Face | Rian Johnson | Peacock | 2023– | Mystery, Comedy |
| White Lotus | Mike White | HBO | 2021– | Drama, Comedy |
| Beef | Lee Sung Jin | Netflix | 2023 | Drama, Comedy |
| Jury Duty | Lee Eisenberg & Gene Stupnitsky | Amazon | 2023 | Comedy, Documentary |
| Physical: 100 | Cho Hyun-il | Netflix | 2023– | Reality, Documentary |
| Fleabag | Phoebe Waller-Bridge | BBC/Amazon | 2016–2019 | Comedy, Drama |
| Schitt's Creek | Daniel Levy & Eugene Levy | CBC | 2015–2020 | Comedy |
| The Good Place | Michael Schur | NBC | 2016–2020 | Comedy |
| Brooklyn Nine-Nine | Dan Goor & Michael Schur | NBC | 2013–2021 | Comedy |
| What We Do in the Shadows | Taika Waititi & Jemaine Clement | FX | 2019– | Comedy |
| Our Flag Means Death | David Jenkins | HBO Max | 2022– | Comedy |
| Reservation Dogs | Sterlin Harjo & Taika Waititi | FX | 2021–2023 | Comedy, Drama |
| The Bear | Christopher Storer | Hulu | 2022– | Drama |
| Dark | Baran bo Odar & Jantje Friese | Netflix | 2017–2020 | Science Fiction, Mystery |
| Mindhunter | Joe Penhall | Netflix | 2017–2019 | Crime, Drama |
| True Detective | Nic Pizzolatto | HBO | 2014– | Crime, Mystery |
| Shogun | Rachel Kondo & Caillin Puente | FX | 2024 | Historical Drama |
| Fargo | Noah Hawley | FX | 2014– | Crime, Drama, Comedy |
| The Diplomat | Debora Cahn | Netflix | 2023– | Drama, Comedy |
| Black Mirror | Charlie Brooker | Netflix | 2011– | Science Fiction, Thriller |
| Years and Years | Russell T. Davies | BBC/HBO | 2019 | Science Fiction, Drama |
| Station Eleven | Patrick Somerville | HBO Max | 2021 | Science Fiction, Drama |
| The Morning Show | Kerry Ehrin | Apple TV+ | 2019– | Drama |
| The Gilded Age | Julian Fellowes | HBO | 2022– | Historical Drama |
| Industry | Mickey Down & Konrad Kay | BBC/HBO | 2020– | Drama |
| Invincible | Robert Kirkman | Amazon | 2021– | Animation, Action |
| Arcane | Christian Linke & Alex Yee | Netflix | 2021– | Animation, Fantasy |

---

## Cover Images — Supabase Storage

All cover images are fetched from external APIs during seeding, uploaded to Supabase Storage, and the resulting public URLs are stored in `media.cover_url`. The app only ever loads images from Supabase — it never depends on TMDB or Google Books at runtime.

**Bucket:** `media-covers` (public, read-only for all)

**Naming convention:** `{media_type}-{slug}.jpg` where slug is the title lowercased, spaces replaced with hyphens, special characters stripped. Examples:
- `movie-dune-part-one.jpg`
- `book-the-name-of-the-wind.jpg`
- `show-severance.jpg`

**Image sizing:** Fetch the TMDB `w500` size for movies and shows. For Google Books, use the `zoom=1` thumbnail and enlarge with a resize step (see script spec below). Target stored size: 300×450px JPEG at 85% quality. Consistent 2:3 aspect ratio throughout — crop if necessary.

**Supabase Storage URL pattern after upload:**
```
https://<project-id>.supabase.co/storage/v1/object/public/media-covers/movie-arrival.jpg
```

This URL is what goes into `media.cover_url`.

---

## Seed Script Specification

Write a Node.js/TypeScript script at `backend/scripts/seed.ts`. It should be runnable with `npx tsx backend/scripts/seed.ts` after setting the required environment variables.

### Environment Variables Required

```
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
TMDB_API_KEY=<tmdb v3 api key>
GOOGLE_BOOKS_API_KEY=<google books api key>
```

Store these in `backend/scripts/.env` (gitignored). The script reads them with `dotenv`.

### Dependencies

```json
{
  "@supabase/supabase-js": "^2",
  "dotenv": "^16",
  "sharp": "^0.33",
  "tsx": "^4"
}
```

`sharp` handles image resizing before upload. It must process the image into a consistent 300×450 JPEG before sending to Storage.

### Script Architecture

The script is structured in five phases, run sequentially:

**Phase 1 — Supabase Storage setup**

Create the `media-covers` bucket if it does not already exist. Set it to public:
```typescript
await supabase.storage.createBucket('media-covers', { public: true });
```
If the bucket already exists, the error can be safely ignored (idempotent).

Also upload the placeholder image before anything else. Generate programmatically with `sharp`:
```typescript
const placeholder = await sharp({
  create: { width: 300, height: 450, channels: 3, background: { r: 180, g: 180, b: 180 } }
}).jpeg({ quality: 85 }).toBuffer();
await supabase.storage.from('media-covers').upload('placeholder.jpg', placeholder, { upsert: true });
```

**Phase 2 — Fetch metadata for the curated list**

The 120 curated items are hardcoded in the script as a `seedItems: SeedItem[]` array (see Seed Input Format below). For each item:

- **Movies and shows:** Call the TMDB search endpoint, take the first result, then fetch detail for type-specific fields.
  - Search movies: `GET https://api.themoviedb.org/3/search/movie?query={title}&year={year}&api_key={key}`
  - Search shows: `GET https://api.themoviedb.org/3/search/tv?query={title}&api_key={key}`
  - Movie detail (runtime): `GET https://api.themoviedb.org/3/movie/{id}?api_key={key}`
  - Show detail (seasons/episodes): `GET https://api.themoviedb.org/3/tv/{id}?api_key={key}`
  - Extract: `overview` (description), `poster_path`, `vote_average`, `vote_count`, type-specific fields
  - Poster URL: `https://image.tmdb.org/t/p/w500{poster_path}`

- **Books:** Call the Google Books API, take the first result.
  - `GET https://www.googleapis.com/books/v1/volumes?q=intitle:{title}+inauthor:{author}&key={key}`
  - Extract: `volumeInfo.description`, `volumeInfo.pageCount`, `volumeInfo.imageLinks.thumbnail`, `volumeInfo.industryIdentifiers`
  - Use `zoom=3` instead of `zoom=1` in the thumbnail URL for higher resolution
  - Fall back to Open Library cover if no image: `https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg`

Rate limit: 250ms delay between API calls. Log progress as each item is processed.

**Phase 3 — Bulk fill from TMDB and Google Books (to reach 3,000+ items)**

After the curated list is processed, fetch additional items from TMDB and Google Books bulk/discovery endpoints until the total item count reaches at least 3,000. Items already in the curated set are skipped by title + media_type deduplication.

- **Additional movies:** Fetch TMDB top-rated movies: `GET https://api.themoviedb.org/3/movie/top_rated?page={n}&api_key={key}` — pages 1 through 50 (~1,000 items). For each movie, fetch full detail for runtime.

- **Additional TV shows:** Fetch TMDB top-rated TV: `GET https://api.themoviedb.org/3/tv/top_rated?page={n}&api_key={key}` — pages 1 through 50 (~1,000 items). For each show, fetch full detail for seasons/episodes.

- **Additional books:** Google Books does not have a simple "top rated" list. Use a broad set of subject searches with pagination to reach ~1,000 books. Run each query with `maxResults=40&startIndex={offset}&orderBy=relevance`, paginating until you have enough or the API stops returning results:

  | Query | Target items |
  |---|---|
  | `subject:fiction` | 200 |
  | `subject:science+fiction` | 120 |
  | `subject:fantasy` | 120 |
  | `subject:mystery+thriller` | 120 |
  | `subject:biography` | 100 |
  | `subject:history` | 100 |
  | `subject:nonfiction` | 100 |
  | `subject:horror` | 80 |
  | `subject:romance` | 80 |

  Deduplicate by ISBN and title across all queries.

For bulk fill items, `genres` must be derived from the TMDB `genre_ids` field. Maintain a local TMDB genre ID → genre name map (fetch once from `GET /genre/movie/list` and `GET /genre/tv/list` at the start of the bulk fill phase).

**Phase 4 — Download and upload cover images**

For every item collected in Phases 2 and 3:
1. Skip if a file already exists at `media-covers/{slug}.jpg` in Storage (check `supabase.storage.from('media-covers').list()` once at the start, cache the result).
2. Download the cover image (fetch as ArrayBuffer).
3. Resize to 300×450px using `sharp`, output as JPEG at quality 85, `fit: 'cover'` (crop to fill if aspect ratio differs).
4. Upload to `media-covers/{slug}.jpg`.
5. Get the public URL and store it with the item's metadata.

On image failure: log a warning, assign the placeholder URL, continue.

**Phase 5 — Insert rows into `media` table**

Bulk insert all collected rows using the Supabase service role client (bypasses RLS):
```typescript
const { error } = await supabase.from('media').insert(rows);
```

Run as service role (bypasses RLS). If a row with the same title and media_type already exists, skip it (upsert with `onConflict: 'title,media_type'` and `ignoreDuplicates: true`). This makes the script safe to re-run.

Log a summary at the end: `Inserted X items. Skipped Y duplicates. Z image errors.`

### Seed Input Format

The hardcoded title list in the script should be typed as:

```typescript
type SeedMovie = {
  type: 'movie';
  title: string;
  director: string;
  year: number;
  genres: string[];
};

type SeedShow = {
  type: 'show';
  title: string;
  creator: string;
  network: string;
  genres: string[];
};

type SeedBook = {
  type: 'book';
  title: string;
  author: string;
  year: number;
  genres: string[];
  isbn?: string; // optional hint for cover lookup fallback
};

type SeedItem = SeedMovie | SeedShow | SeedBook;
```

The full list of 120 items (from the title tables above) is hardcoded as a `const seedItems: SeedItem[]` array in the script. The script does not read from a separate JSON file — keep it self-contained.

### Error Handling and Idempotency

- The script must be safe to re-run. Use `ignoreDuplicates: true` on the database insert and skip Storage uploads where the file already exists (check with `supabase.storage.from('media-covers').list()` before uploading, or catch the "already exists" error and continue).
- Log all API errors with the title that caused them. Do not abort the whole script on a single item failure — continue to the next item and report at the end.
- Write a `backend/scripts/seed-errors.json` file at the end listing any items that had metadata or image fetch failures, so they can be manually patched.

### Placeholder Image

Before the main loop, upload a simple gray placeholder JPEG to `media-covers/placeholder.jpg`. Generate it programmatically with `sharp`:
```typescript
await sharp({ create: { width: 300, height: 450, channels: 3, background: { r: 180, g: 180, b: 180 } } })
  .jpeg({ quality: 85 })
  .toBuffer();
```

---

## Test Accounts

Pre-create two test accounts in the `users` table so students can log in without going through registration for quick testing. Announce credentials in Discord at the start of Week 1.

| Account | Email | Password | Purpose |
|---|---|---|---|
| Alice | `alice@mediatracker.dev` | `Testing123!` | Primary test account — used in instructor demos |
| Bob | `bob@mediatracker.dev` | `Testing123!` | Secondary account — use when demonstrating follow/unfollow or social features |

Create via the `POST /users` endpoint rather than direct database insert, so the auth records are properly linked. Do this during the pre-semester Supabase setup:

```bash
# Create alice
curl -X POST https://<project-id>.supabase.co/functions/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@mediatracker.dev",
    "password": "Testing123!",
    "username": "alice",
    "displayName": "Alice (Test)",
    "clientId": "ics342-android-v1",
    "clientSecret": "mt-android-s26-xK9pQ2"
  }'

# Create bob (same pattern)
```

Seed Alice's library with 15–20 items in a mix of statuses so the Library screen has visible content during Week 5 demos without students needing to manually add items first.

---

## Genres Reference

Use these exact strings consistently across the catalog. The `GET /media` endpoint supports filtering by `genre`, so consistent spelling matters.

Canonical genre list: `Science Fiction`, `Fantasy`, `Literary Fiction`, `Historical Fiction`, `Mystery`, `Thriller`, `Horror`, `Crime`, `Drama`, `Comedy`, `Action`, `Romance`, `Non-Fiction`, `Documentary`, `Animation`, `Reality`, `War`

Never use abbreviations or alternate spellings (e.g., `Sci-Fi`, `SciFi`, `sci-fi` — always use `Science Fiction`).
