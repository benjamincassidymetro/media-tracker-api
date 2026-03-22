# Media Tracker - Database Seed Script Specification
## Instructions for Claude Code to Build the Seeding Tool

**Purpose:** Create a script that fetches ~600 books and movies from external APIs and seeds them into the Supabase database.

**Run Once:** This script is run ONE TIME during setup, then the resulting SQL seed file is committed to Git.

---

## Overview

**What to build:**
1. Node.js/TypeScript script that fetches books and movies
2. Normalizes data to match our database schema
3. Inserts into Supabase
4. Exports as SQL seed file

**External APIs to use:**
- Google Books API (for books)
- TMDB API (for movies)

---

## Script Structure

```
scripts/
├── seed-media.ts           ← Main script
├── curated-lists.ts        ← Lists of books/movies to fetch
├── google-books-client.ts  ← Google Books API client
├── tmdb-client.ts          ← TMDB API client
├── normalizer.ts           ← Data normalization logic
└── package.json
```

---

## 1. Curated Lists (`curated-lists.ts`)

Create lists of ~300 books and ~300 movies to fetch.

```typescript
// curated-lists.ts

export const curatedBooks = [
  // CLASSICS (50)
  { title: "Pride and Prejudice", author: "Jane Austen" },
  { title: "1984", author: "George Orwell" },
  { title: "To Kill a Mockingbird", author: "Harper Lee" },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
  { title: "Moby Dick", author: "Herman Melville" },
  { title: "War and Peace", author: "Leo Tolstoy" },
  { title: "The Catcher in the Rye", author: "J.D. Salinger" },
  { title: "The Odyssey", author: "Homer" },
  { title: "Brave New World", author: "Aldous Huxley" },
  { title: "Jane Eyre", author: "Charlotte Brontë" },
  // ... 40 more classics

  // FANTASY & SCI-FI (50)
  { title: "The Lord of the Rings", author: "J.R.R. Tolkien" },
  { title: "The Hobbit", author: "J.R.R. Tolkien" },
  { title: "Harry Potter and the Philosopher's Stone", author: "J.K. Rowling" },
  { title: "Harry Potter and the Chamber of Secrets", author: "J.K. Rowling" },
  { title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling" },
  { title: "Harry Potter and the Goblet of Fire", author: "J.K. Rowling" },
  { title: "Harry Potter and the Order of the Phoenix", author: "J.K. Rowling" },
  { title: "Harry Potter and the Half-Blood Prince", author: "J.K. Rowling" },
  { title: "Harry Potter and the Deathly Hallows", author: "J.K. Rowling" },
  { title: "Dune", author: "Frank Herbert" },
  { title: "The Hitchhiker's Guide to the Galaxy", author: "Douglas Adams" },
  { title: "Ender's Game", author: "Orson Scott Card" },
  { title: "A Game of Thrones", author: "George R.R. Martin" },
  { title: "The Name of the Wind", author: "Patrick Rothfuss" },
  { title: "Mistborn", author: "Brandon Sanderson" },
  // ... 35 more fantasy/sci-fi

  // YOUNG ADULT (50)
  { title: "The Hunger Games", author: "Suzanne Collins" },
  { title: "Catching Fire", author: "Suzanne Collins" },
  { title: "Mockingjay", author: "Suzanne Collins" },
  { title: "Divergent", author: "Veronica Roth" },
  { title: "The Fault in Our Stars", author: "John Green" },
  { title: "Percy Jackson and the Lightning Thief", author: "Rick Riordan" },
  { title: "The Maze Runner", author: "James Dashner" },
  { title: "Twilight", author: "Stephenie Meyer" },
  // ... 42 more YA

  // MYSTERY & THRILLER (50)
  { title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson" },
  { title: "Gone Girl", author: "Gillian Flynn" },
  { title: "The Da Vinci Code", author: "Dan Brown" },
  { title: "Sherlock Holmes", author: "Arthur Conan Doyle" },
  { title: "And Then There Were None", author: "Agatha Christie" },
  // ... 45 more mystery/thriller

  // MODERN BESTSELLERS (50)
  { title: "Where the Crawdads Sing", author: "Delia Owens" },
  { title: "The Silent Patient", author: "Alex Michaelides" },
  { title: "Educated", author: "Tara Westover" },
  { title: "Becoming", author: "Michelle Obama" },
  // ... 46 more bestsellers

  // NON-FICTION (50)
  { title: "Sapiens", author: "Yuval Noah Harari" },
  { title: "Atomic Habits", author: "James Clear" },
  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman" },
  { title: "The Immortal Life of Henrietta Lacks", author: "Rebecca Skloot" },
  // ... 46 more non-fiction
];

export const curatedMovies = [
  // CLASSICS (50)
  { title: "The Godfather", year: 1972 },
  { title: "Casablanca", year: 1942 },
  { title: "Citizen Kane", year: 1941 },
  { title: "The Shawshank Redemption", year: 1994 },
  { title: "Pulp Fiction", year: 1994 },
  { title: "Schindler's List", year: 1993 },
  { title: "Forrest Gump", year: 1994 },
  { title: "Fight Club", year: 1999 },
  { title: "The Matrix", year: 1999 },
  { title: "Goodfellas", year: 1990 },
  // ... 40 more classics

  // BLOCKBUSTERS (50)
  { title: "Avengers: Endgame", year: 2019 },
  { title: "Avatar", year: 2009 },
  { title: "Titanic", year: 1997 },
  { title: "Star Wars", year: 1977 },
  { title: "Jurassic Park", year: 1993 },
  { title: "The Dark Knight", year: 2008 },
  { title: "Inception", year: 2010 },
  { title: "Interstellar", year: 2014 },
  // ... 42 more blockbusters

  // ACTION/ADVENTURE (50)
  { title: "Mad Max: Fury Road", year: 2015 },
  { title: "Die Hard", year: 1988 },
  { title: "Raiders of the Lost Ark", year: 1981 },
  { title: "Gladiator", year: 2000 },
  // ... 46 more action

  // DRAMA (50)
  { title: "The Social Network", year: 2010 },
  { title: "Parasite", year: 2019 },
  { title: "Moonlight", year: 2016 },
  { title: "12 Years a Slave", year: 2013 },
  // ... 46 more drama

  // COMEDY (50)
  { title: "The Grand Budapest Hotel", year: 2014 },
  { title: "Superbad", year: 2007 },
  { title: "Groundhog Day", year: 1993 },
  { title: "The Big Lebowski", year: 1998 },
  // ... 46 more comedy

  // SCI-FI/FANTASY (50)
  { title: "Blade Runner", year: 1982 },
  { title: "Dune", year: 2021 },
  { title: "The Lord of the Rings: The Fellowship of the Ring", year: 2001 },
  { title: "The Lord of the Rings: The Two Towers", year: 2002 },
  { title: "The Lord of the Rings: The Return of the King", year: 2003 },
  { title: "Star Wars: The Empire Strikes Back", year: 1980 },
  // ... 44 more sci-fi/fantasy
];
```

---

## 2. Google Books API Client (`google-books-client.ts`)

```typescript
// google-books-client.ts

interface GoogleBooksItem {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    averageRating?: number;
    ratingsCount?: number;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    language?: string;
  };
}

export async function searchBook(
  title: string,
  author: string,
  apiKey: string
): Promise<GoogleBooksItem | null> {
  const query = encodeURIComponent(`intitle:${title}+inauthor:${author}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Google Books API error: ${response.status}`);
    return null;
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    console.warn(`No results for: ${title} by ${author}`);
    return null;
  }

  return data.items[0];
}

export async function searchBookBatch(
  books: Array<{ title: string; author: string }>,
  apiKey: string,
  delayMs: number = 1100  // Rate limit: 1 req/second
): Promise<GoogleBooksItem[]> {
  const results: GoogleBooksItem[] = [];

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(`[${i + 1}/${books.length}] Fetching: ${book.title}`);

    const result = await searchBook(book.title, book.author, apiKey);
    if (result) {
      results.push(result);
    }

    // Rate limiting
    if (i < books.length - 1) {
      await sleep(delayMs);
    }
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## 3. TMDB API Client (`tmdb-client.ts`)

```typescript
// tmdb-client.ts

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  runtime?: number;  // Requires detail call
}

interface TMDBMovieDetails extends TMDBMovie {
  runtime: number;
  genres: Array<{ id: number; name: string }>;
  credits: {
    crew: Array<{
      job: string;
      name: string;
    }>;
  };
}

const TMDB_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western"
};

export async function searchMovie(
  title: string,
  year: number | null,
  apiKey: string
): Promise<TMDBMovie | null> {
  let url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&api_key=${apiKey}`;
  if (year) {
    url += `&year=${year}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`TMDB API error: ${response.status}`);
    return null;
  }

  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    console.warn(`No results for: ${title} (${year})`);
    return null;
  }

  return data.results[0];
}

export async function getMovieDetails(
  movieId: number,
  apiKey: string
): Promise<TMDBMovieDetails | null> {
  const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&append_to_response=credits`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`TMDB API error: ${response.status}`);
    return null;
  }

  return await response.json();
}

export async function searchMovieBatch(
  movies: Array<{ title: string; year?: number }>,
  apiKey: string,
  delayMs: number = 300  // TMDB allows more requests
): Promise<TMDBMovieDetails[]> {
  const results: TMDBMovieDetails[] = [];

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    console.log(`[${i + 1}/${movies.length}] Fetching: ${movie.title}`);

    // Search for movie
    const searchResult = await searchMovie(movie.title, movie.year || null, apiKey);
    if (!searchResult) {
      continue;
    }

    // Get full details (includes runtime and director)
    const details = await getMovieDetails(searchResult.id, apiKey);
    if (details) {
      results.push(details);
    }

    // Rate limiting
    if (i < movies.length - 1) {
      await sleep(delayMs);
    }
  }

  return results;
}

export function getGenreNames(genreIds: number[]): string[] {
  return genreIds.map(id => TMDB_GENRES[id]).filter(Boolean);
}

export function getDirector(credits: TMDBMovieDetails['credits']): string | null {
  const director = credits.crew.find(person => person.job === "Director");
  return director?.name || null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## 4. Data Normalizer (`normalizer.ts`)

```typescript
// normalizer.ts

import type { GoogleBooksItem } from './google-books-client';
import type { TMDBMovieDetails } from './tmdb-client';
import { getGenreNames, getDirector } from './tmdb-client';

export interface NormalizedMedia {
  media_type: 'book' | 'movie';
  title: string;
  author: string | null;
  director: string | null;
  cover_url: string | null;
  description: string | null;
  published_year: number | null;
  page_count: number | null;
  runtime_minutes: number | null;
  genres: string[];
  isbn: string | null;
  language: string;
}

export function normalizeBook(book: GoogleBooksItem): NormalizedMedia {
  const volumeInfo = book.volumeInfo;

  return {
    media_type: 'book',
    title: volumeInfo.title,
    author: volumeInfo.authors?.[0] || null,
    director: null,
    cover_url: volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
    description: volumeInfo.description || null,
    published_year: volumeInfo.publishedDate
      ? parseInt(volumeInfo.publishedDate.substring(0, 4))
      : null,
    page_count: volumeInfo.pageCount || null,
    runtime_minutes: null,
    genres: volumeInfo.categories || [],
    isbn: volumeInfo.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier || null,
    language: volumeInfo.language || 'en'
  };
}

export function normalizeMovie(movie: TMDBMovieDetails): NormalizedMedia {
  return {
    media_type: 'movie',
    title: movie.title,
    author: null,
    director: getDirector(movie.credits),
    cover_url: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : null,
    description: movie.overview || null,
    published_year: movie.release_date
      ? parseInt(movie.release_date.substring(0, 4))
      : null,
    page_count: null,
    runtime_minutes: movie.runtime || null,
    genres: movie.genres.map(g => g.name),
    isbn: null,
    language: 'en'  // TMDB doesn't provide this easily
  };
}
```

---

## 5. Main Seed Script (`seed-media.ts`)

```typescript
// seed-media.ts

import { createClient } from '@supabase/supabase-js';
import { curatedBooks, curatedMovies } from './curated-lists';
import { searchBookBatch } from './google-books-client';
import { searchMovieBatch } from './tmdb-client';
import { normalizeBook, normalizeMovie } from './normalizer';
import * as fs from 'fs';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;  // Service role key (not anon)
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY!;
const TMDB_API_KEY = process.env.TMDB_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🌱 Starting media database seeding...\n');

  // Fetch books from Google Books API
  console.log('📚 Fetching books from Google Books API...');
  const googleBooks = await searchBookBatch(curatedBooks, GOOGLE_BOOKS_API_KEY);
  console.log(`✅ Fetched ${googleBooks.length} books\n`);

  // Fetch movies from TMDB API
  console.log('🎬 Fetching movies from TMDB API...');
  const tmdbMovies = await searchMovieBatch(curatedMovies, TMDB_API_KEY);
  console.log(`✅ Fetched ${tmdbMovies.length} movies\n`);

  // Normalize data
  console.log('🔄 Normalizing data...');
  const normalizedBooks = googleBooks.map(normalizeBook);
  const normalizedMovies = tmdbMovies.map(normalizeMovie);
  const allMedia = [...normalizedBooks, ...normalizedMovies];
  console.log(`✅ Normalized ${allMedia.length} total media items\n`);

  // Insert into Supabase (in batches of 100)
  console.log('💾 Inserting into Supabase...');
  let insertedCount = 0;

  for (let i = 0; i < allMedia.length; i += 100) {
    const batch = allMedia.slice(i, i + 100);

    const { data, error } = await supabase
      .from('media')
      .insert(batch)
      .select();

    if (error) {
      console.error(`❌ Batch ${i / 100 + 1} error:`, error.message);
    } else {
      insertedCount += data?.length || 0;
      console.log(`✅ Batch ${i / 100 + 1}: Inserted ${data?.length} items`);
    }
  }

  console.log(`\n✅ Total inserted: ${insertedCount} media items`);

  // Export as SQL seed file
  console.log('\n📝 Exporting as SQL seed file...');
  await exportToSQL();

  console.log('\n🎉 Seeding complete!');
  console.log('\nNext steps:');
  console.log('1. Check media_seed.sql file');
  console.log('2. Commit to Git: git add media_seed.sql');
  console.log('3. Students can import: psql $DATABASE_URL < media_seed.sql');
}

async function exportToSQL() {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .order('id');

  if (error) {
    console.error('Error fetching media for export:', error);
    return;
  }

  let sql = '-- Media Tracker Seed Data\n';
  sql += '-- Generated: ' + new Date().toISOString() + '\n\n';
  sql += '-- Insert media items\n';

  data?.forEach(item => {
    const values = [
      item.media_type,
      item.title.replace(/'/g, "''"),  // Escape single quotes
      item.author ? `'${item.author.replace(/'/g, "''")}'` : 'NULL',
      item.director ? `'${item.director.replace(/'/g, "''")}'` : 'NULL',
      item.cover_url ? `'${item.cover_url}'` : 'NULL',
      item.description ? `'${item.description.replace(/'/g, "''").substring(0, 5000)}'` : 'NULL',
      item.published_year || 'NULL',
      item.page_count || 'NULL',
      item.runtime_minutes || 'NULL',
      item.genres ? `ARRAY[${item.genres.map(g => `'${g.replace(/'/g, "''")}'`).join(',')}]` : 'ARRAY[]::text[]',
      item.isbn ? `'${item.isbn}'` : 'NULL',
      `'${item.language}'`
    ];

    sql += `INSERT INTO media (media_type, title, author, director, cover_url, description, published_year, page_count, runtime_minutes, genres, isbn, language) VALUES ('${values.join("', '")}');\n`;
  });

  fs.writeFileSync('media_seed.sql', sql);
  console.log('✅ Exported to media_seed.sql');
}

main().catch(console.error);
```

---

## 6. Package Configuration (`package.json`)

```json
{
  "name": "media-tracker-seed",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "seed": "tsx seed-media.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "@types/node": "^20.11.0"
  }
}
```

---

## Environment Variables

This script reads values from environment variables (no `.env` file required). For local development, you can set them in `mise.toml` (see the `env` section), or export them in your shell before running the script.

Example (bash/zsh):

```bash
export SUPABASE_URL=https://yourproject.supabase.co
export SUPABASE_SERVICE_KEY=your-service-role-key-here
export GOOGLE_BOOKS_API_KEY=your-google-books-key
export TMDB_API_KEY=your-tmdb-key
```

---

## Usage Instructions

### Setup
```bash
cd scripts
npm install
```

### Get API Keys

**Google Books:**
1. Go to https://console.cloud.google.com/
2. Create project
3. Enable "Books API"
4. Create API key
5. Set it as an environment variable (e.g. in `mise.toml` or via `export`).

**TMDB:**
1. Go to https://www.themoviedb.org/settings/api
2. Sign up
3. Request API key
4. Set it as an environment variable (e.g. in `mise.toml` or via `export`).

### Run Seeding
```bash
npm run seed
```

This will:
1. Fetch ~300 books from Google Books (takes ~5-6 minutes due to rate limiting)
2. Fetch ~300 movies from TMDB (takes ~2-3 minutes)
3. Insert into Supabase
4. Export `media_seed.sql`

### Commit Seed File
```bash
git add media_seed.sql
git commit -m "Add media database seed with 600+ books and movies"
git push
```

---

## Rate Limiting Strategy

**Google Books:**
- Limit: 1,000 requests/day
- Strategy: 1 request per second (1100ms delay)
- 300 books takes ~6 minutes

**TMDB:**
- Limit: 1,000 requests per 10 minutes
- Strategy: 300ms delay between requests
- 300 movies × 2 requests each (search + details) = 600 requests
- Takes ~3-4 minutes

**Total time:** ~10 minutes for full seed

---

## Error Handling

The script should:
- ✅ Continue on individual failures (log and skip)
- ✅ Retry on network errors (3 attempts)
- ✅ Save progress periodically
- ✅ Generate partial seed file if interrupted

---

## Expected Output

**Console:**
```
🌱 Starting media database seeding...

📚 Fetching books from Google Books API...
[1/300] Fetching: Pride and Prejudice
[2/300] Fetching: 1984
...
✅ Fetched 287 books

🎬 Fetching movies from TMDB API...
[1/300] Fetching: The Godfather
[2/300] Fetching: Casablanca
...
✅ Fetched 294 movies

🔄 Normalizing data...
✅ Normalized 581 total media items

💾 Inserting into Supabase...
✅ Batch 1: Inserted 100 items
✅ Batch 2: Inserted 100 items
...
✅ Total inserted: 581 media items

📝 Exporting as SQL seed file...
✅ Exported to media_seed.sql

🎉 Seeding complete!
```

**Generated File:**
- `media_seed.sql` (~2-3 MB)
- Contains INSERT statements for all media
- Can be imported by students

---

## Testing

### Test with small dataset first:
```typescript
// In curated-lists.ts
export const curatedBooks = [
  { title: "Harry Potter and the Philosopher's Stone", author: "J.K. Rowling" },
  { title: "The Hobbit", author: "J.R.R. Tolkien" },
  // Just 5-10 for testing
];
```

Run seed, verify data looks good, then expand to full 300.

---

## Success Criteria

- ✅ Script fetches ~600 items total
- ✅ Data normalized correctly
- ✅ Inserts into Supabase without errors
- ✅ Generates valid SQL seed file
- ✅ SQL file can be imported successfully
- ✅ All book covers display correctly
- ✅ All movie posters display correctly
- ✅ Genres are properly tagged
- ✅ ISBN/year/runtime data is accurate

---

**This specification gives Claude Code everything needed to build the seeding tool!**
