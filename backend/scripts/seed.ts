import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TMDB_API_KEY = process.env.TMDB_API_KEY
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!TMDB_API_KEY || !GOOGLE_BOOKS_API_KEY) {
  console.error('Missing TMDB_API_KEY or GOOGLE_BOOKS_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SeedBook = {
  author: string
  genres: string[]
  isbn?: string
  title: string
  type: 'book'
  year: number
}

type SeedMovie = {
  director: string
  genres: string[]
  title: string
  type: 'movie'
  year: number
}

type SeedShow = {
  creator: string
  genres: string[]
  network: string
  title: string
  type: 'show'
}

type SeedItem = SeedBook | SeedMovie | SeedShow

// ---------------------------------------------------------------------------
// Curated catalog (120 items)
// ---------------------------------------------------------------------------

const seedItems: SeedItem[] = [
  // Books (40)
  { type: 'book', title: 'Dune', author: 'Frank Herbert', year: 1965, genres: ['Science Fiction'] },
  {
    type: 'book',
    title: 'The Left Hand of Darkness',
    author: 'Ursula K. Le Guin',
    year: 1969,
    genres: ['Science Fiction'],
  },
  {
    type: 'book',
    title: "Ender's Game",
    author: 'Orson Scott Card',
    year: 1985,
    genres: ['Science Fiction'],
  },
  {
    type: 'book',
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    year: 2021,
    genres: ['Science Fiction'],
  },
  {
    type: 'book',
    title: 'The Martian',
    author: 'Andy Weir',
    year: 2011,
    genres: ['Science Fiction'],
  },
  {
    type: 'book',
    title: 'Klara and the Sun',
    author: 'Kazuo Ishiguro',
    year: 2021,
    genres: ['Science Fiction'],
  },
  {
    type: 'book',
    title: 'Foundation',
    author: 'Isaac Asimov',
    year: 1951,
    genres: ['Science Fiction'],
  },
  {
    type: 'book',
    title: 'Recursion',
    author: 'Blake Crouch',
    year: 2019,
    genres: ['Science Fiction', 'Thriller'],
  },
  {
    type: 'book',
    title: 'The Name of the Wind',
    author: 'Patrick Rothfuss',
    year: 2007,
    genres: ['Fantasy'],
  },
  {
    type: 'book',
    title: 'The Way of Kings',
    author: 'Brandon Sanderson',
    year: 2010,
    genres: ['Fantasy'],
  },
  {
    type: 'book',
    title: 'A Wizard of Earthsea',
    author: 'Ursula K. Le Guin',
    year: 1968,
    genres: ['Fantasy'],
  },
  {
    type: 'book',
    title: 'Jonathan Strange & Mr Norrell',
    author: 'Susanna Clarke',
    year: 2004,
    genres: ['Fantasy'],
  },
  {
    type: 'book',
    title: 'The House in the Cerulean Sea',
    author: 'TJ Klune',
    year: 2020,
    genres: ['Fantasy'],
  },
  {
    type: 'book',
    title: 'Piranesi',
    author: 'Susanna Clarke',
    year: 2020,
    genres: ['Fantasy', 'Mystery'],
  },
  {
    type: 'book',
    title: 'Never Let Me Go',
    author: 'Kazuo Ishiguro',
    year: 2005,
    genres: ['Literary Fiction'],
  },
  {
    type: 'book',
    title: 'Pachinko',
    author: 'Min Jin Lee',
    year: 2017,
    genres: ['Literary Fiction'],
  },
  {
    type: 'book',
    title: 'Normal People',
    author: 'Sally Rooney',
    year: 2018,
    genres: ['Literary Fiction'],
  },
  {
    type: 'book',
    title: 'The Remains of the Day',
    author: 'Kazuo Ishiguro',
    year: 1989,
    genres: ['Literary Fiction'],
  },
  {
    type: 'book',
    title: 'Demon Copperhead',
    author: 'Barbara Kingsolver',
    year: 2022,
    genres: ['Literary Fiction'],
  },
  {
    type: 'book',
    title: 'All the Light We Cannot See',
    author: 'Anthony Doerr',
    year: 2014,
    genres: ['Historical Fiction'],
  },
  {
    type: 'book',
    title: 'The Night Circus',
    author: 'Erin Morgenstern',
    year: 2011,
    genres: ['Fantasy'],
  },
  {
    type: 'book',
    title: 'Station Eleven',
    author: 'Emily St. John Mandel',
    year: 2014,
    genres: ['Science Fiction'],
  },
  {
    type: 'book',
    title: 'The Girl with the Dragon Tattoo',
    author: 'Stieg Larsson',
    year: 2005,
    genres: ['Mystery', 'Thriller'],
  },
  {
    type: 'book',
    title: 'Gone Girl',
    author: 'Gillian Flynn',
    year: 2012,
    genres: ['Mystery', 'Thriller'],
  },
  {
    type: 'book',
    title: 'The Thursday Murder Club',
    author: 'Richard Osman',
    year: 2020,
    genres: ['Mystery'],
  },
  { type: 'book', title: 'Educated', author: 'Tara Westover', year: 2018, genres: ['Non-Fiction'] },
  {
    type: 'book',
    title: 'Becoming',
    author: 'Michelle Obama',
    year: 2018,
    genres: ['Non-Fiction'],
  },
  {
    type: 'book',
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    year: 2011,
    genres: ['Non-Fiction'],
  },
  {
    type: 'book',
    title: 'The Body Keeps the Score',
    author: 'Bessel van der Kolk',
    year: 2014,
    genres: ['Non-Fiction'],
  },
  {
    type: 'book',
    title: 'Atomic Habits',
    author: 'James Clear',
    year: 2018,
    genres: ['Non-Fiction'],
  },
  {
    type: 'book',
    title: 'Born a Crime',
    author: 'Trevor Noah',
    year: 2016,
    genres: ['Non-Fiction'],
  },
  { type: 'book', title: 'In the Woods', author: 'Tana French', year: 2007, genres: ['Mystery'] },
  {
    type: 'book',
    title: 'The Secret History',
    author: 'Donna Tartt',
    year: 1992,
    genres: ['Mystery', 'Literary Fiction'],
  },
  {
    type: 'book',
    title: 'Mexican Gothic',
    author: 'Silvia Moreno-Garcia',
    year: 2020,
    genres: ['Horror', 'Mystery'],
  },
  {
    type: 'book',
    title: 'Anxious People',
    author: 'Fredrik Backman',
    year: 2019,
    genres: ['Literary Fiction', 'Comedy'],
  },
  {
    type: 'book',
    title: 'A Gentleman in Moscow',
    author: 'Amor Towles',
    year: 2016,
    genres: ['Historical Fiction'],
  },
  {
    type: 'book',
    title: "The Hitchhiker's Guide to the Galaxy",
    author: 'Douglas Adams',
    year: 1979,
    genres: ['Science Fiction', 'Comedy'],
  },
  {
    type: 'book',
    title: 'Good Omens',
    author: 'Terry Pratchett & Neil Gaiman',
    year: 1990,
    genres: ['Fantasy', 'Comedy'],
  },
  {
    type: 'book',
    title: 'The Midnight Library',
    author: 'Matt Haig',
    year: 2020,
    genres: ['Literary Fiction'],
  },
  {
    type: 'book',
    title: 'Tomorrow, and Tomorrow, and Tomorrow',
    author: 'Gabrielle Zevin',
    year: 2022,
    genres: ['Literary Fiction'],
  },

  // Movies (40)
  {
    type: 'movie',
    title: 'Dune: Part One',
    director: 'Denis Villeneuve',
    year: 2021,
    genres: ['Science Fiction'],
  },
  {
    type: 'movie',
    title: 'Dune: Part Two',
    director: 'Denis Villeneuve',
    year: 2024,
    genres: ['Science Fiction'],
  },
  {
    type: 'movie',
    title: 'Arrival',
    director: 'Denis Villeneuve',
    year: 2016,
    genres: ['Science Fiction'],
  },
  {
    type: 'movie',
    title: 'Interstellar',
    director: 'Christopher Nolan',
    year: 2014,
    genres: ['Science Fiction'],
  },
  {
    type: 'movie',
    title: 'The Martian',
    director: 'Ridley Scott',
    year: 2015,
    genres: ['Science Fiction'],
  },
  {
    type: 'movie',
    title: 'Everything Everywhere All at Once',
    director: 'Daniel Kwan & Daniel Scheinert',
    year: 2022,
    genres: ['Science Fiction', 'Comedy'],
  },
  {
    type: 'movie',
    title: 'Oppenheimer',
    director: 'Christopher Nolan',
    year: 2023,
    genres: ['Drama', 'Historical Fiction'],
  },
  {
    type: 'movie',
    title: 'Poor Things',
    director: 'Yorgos Lanthimos',
    year: 2023,
    genres: ['Drama', 'Comedy'],
  },
  {
    type: 'movie',
    title: 'The Banshees of Inisherin',
    director: 'Martin McDonagh',
    year: 2022,
    genres: ['Drama', 'Comedy'],
  },
  { type: 'movie', title: 'Past Lives', director: 'Celine Song', year: 2023, genres: ['Drama'] },
  {
    type: 'movie',
    title: 'The Holdovers',
    director: 'Alexander Payne',
    year: 2023,
    genres: ['Drama', 'Comedy'],
  },
  { type: 'movie', title: 'Tár', director: 'Todd Field', year: 2022, genres: ['Drama'] },
  {
    type: 'movie',
    title: 'All Quiet on the Western Front',
    director: 'Edward Berger',
    year: 2022,
    genres: ['Drama', 'War'],
  },
  {
    type: 'movie',
    title: 'Triangle of Sadness',
    director: 'Ruben Östlund',
    year: 2022,
    genres: ['Comedy', 'Drama'],
  },
  {
    type: 'movie',
    title: 'The Whale',
    director: 'Darren Aronofsky',
    year: 2022,
    genres: ['Drama'],
  },
  {
    type: 'movie',
    title: 'Parasite',
    director: 'Bong Joon-ho',
    year: 2019,
    genres: ['Drama', 'Thriller'],
  },
  {
    type: 'movie',
    title: 'Get Out',
    director: 'Jordan Peele',
    year: 2017,
    genres: ['Horror', 'Thriller'],
  },
  {
    type: 'movie',
    title: 'Us',
    director: 'Jordan Peele',
    year: 2019,
    genres: ['Horror', 'Thriller'],
  },
  {
    type: 'movie',
    title: 'Knives Out',
    director: 'Rian Johnson',
    year: 2019,
    genres: ['Mystery', 'Comedy'],
  },
  {
    type: 'movie',
    title: 'Glass Onion',
    director: 'Rian Johnson',
    year: 2022,
    genres: ['Mystery', 'Comedy'],
  },
  {
    type: 'movie',
    title: 'The Menu',
    director: 'Mark Mylod',
    year: 2022,
    genres: ['Thriller', 'Comedy'],
  },
  {
    type: 'movie',
    title: 'Nope',
    director: 'Jordan Peele',
    year: 2022,
    genres: ['Horror', 'Science Fiction'],
  },
  {
    type: 'movie',
    title: 'Top Gun: Maverick',
    director: 'Joseph Kosinski',
    year: 2022,
    genres: ['Action'],
  },
  {
    type: 'movie',
    title: 'Mission: Impossible — Dead Reckoning',
    director: 'Christopher McQuarrie',
    year: 2023,
    genres: ['Action', 'Thriller'],
  },
  {
    type: 'movie',
    title: 'Spider-Man: Into the Spider-Verse',
    director: 'Bob Persichetti',
    year: 2018,
    genres: ['Animation', 'Action'],
  },
  {
    type: 'movie',
    title: 'Soul',
    director: 'Pete Docter',
    year: 2020,
    genres: ['Animation', 'Comedy'],
  },
  {
    type: 'movie',
    title: 'Turning Red',
    director: 'Domee Shi',
    year: 2022,
    genres: ['Animation', 'Comedy'],
  },
  { type: 'movie', title: 'Elemental', director: 'Peter Sohn', year: 2023, genres: ['Animation'] },
  { type: 'movie', title: 'Minari', director: 'Lee Isaac Chung', year: 2020, genres: ['Drama'] },
  { type: 'movie', title: 'Nomadland', director: 'Chloé Zhao', year: 2020, genres: ['Drama'] },
  {
    type: 'movie',
    title: 'The Power of the Dog',
    director: 'Jane Campion',
    year: 2021,
    genres: ['Drama'],
  },
  { type: 'movie', title: 'CODA', director: 'Sian Heder', year: 2021, genres: ['Drama'] },
  { type: 'movie', title: 'Belfast', director: 'Kenneth Branagh', year: 2021, genres: ['Drama'] },
  { type: 'movie', title: 'Spencer', director: 'Pablo Larraín', year: 2021, genres: ['Drama'] },
  {
    type: 'movie',
    title: 'Free Guy',
    director: 'Shawn Levy',
    year: 2021,
    genres: ['Action', 'Comedy'],
  },
  {
    type: 'movie',
    title: 'The Lost City',
    director: 'Adam Nee & Aaron Nee',
    year: 2022,
    genres: ['Comedy', 'Action'],
  },
  {
    type: 'movie',
    title: 'Emily the Criminal',
    director: 'John Patton Ford',
    year: 2022,
    genres: ['Thriller'],
  },
  {
    type: 'movie',
    title: 'Women Talking',
    director: 'Sarah Polley',
    year: 2022,
    genres: ['Drama'],
  },
  { type: 'movie', title: 'Causeway', director: 'Lila Neugebauer', year: 2022, genres: ['Drama'] },
  {
    type: 'movie',
    title: 'The Zone of Interest',
    director: 'Jonathan Glazer',
    year: 2023,
    genres: ['Drama', 'War'],
  },

  // TV Shows (40)
  {
    type: 'show',
    title: 'Andor',
    creator: 'Tony Gilroy',
    network: 'Disney+',
    genres: ['Science Fiction', 'Drama'],
  },
  {
    type: 'show',
    title: 'Severance',
    creator: 'Dan Erickson',
    network: 'Apple TV+',
    genres: ['Science Fiction', 'Thriller'],
  },
  {
    type: 'show',
    title: 'The Bear',
    creator: 'Christopher Storer',
    network: 'FX',
    genres: ['Drama'],
  },
  {
    type: 'show',
    title: 'Succession',
    creator: 'Jesse Armstrong',
    network: 'HBO',
    genres: ['Drama'],
  },
  {
    type: 'show',
    title: 'The Last of Us',
    creator: 'Craig Mazin & Neil Druckmann',
    network: 'HBO',
    genres: ['Drama'],
  },
  {
    type: 'show',
    title: 'House of the Dragon',
    creator: 'Ryan Condal',
    network: 'HBO',
    genres: ['Fantasy', 'Drama'],
  },
  {
    type: 'show',
    title: 'Slow Horses',
    creator: 'Will Smith',
    network: 'Apple TV+',
    genres: ['Thriller'],
  },
  {
    type: 'show',
    title: 'Bad Sisters',
    creator: 'Sharon Horgan',
    network: 'Apple TV+',
    genres: ['Drama', 'Comedy'],
  },
  {
    type: 'show',
    title: 'Ted Lasso',
    creator: 'Jason Sudeikis',
    network: 'Apple TV+',
    genres: ['Comedy', 'Drama'],
  },
  {
    type: 'show',
    title: 'Mythic Quest',
    creator: 'Rob McElhenney',
    network: 'Apple TV+',
    genres: ['Comedy'],
  },
  {
    type: 'show',
    title: 'Abbott Elementary',
    creator: 'Quinta Brunson',
    network: 'ABC',
    genres: ['Comedy'],
  },
  {
    type: 'show',
    title: 'Shrinking',
    creator: 'Jason Segel & Bill Lawrence',
    network: 'Apple TV+',
    genres: ['Comedy', 'Drama'],
  },
  {
    type: 'show',
    title: 'Only Murders in the Building',
    creator: 'Steve Martin & John Hoffman',
    network: 'Hulu',
    genres: ['Mystery', 'Comedy'],
  },
  {
    type: 'show',
    title: 'Poker Face',
    creator: 'Rian Johnson',
    network: 'Peacock',
    genres: ['Mystery', 'Comedy'],
  },
  {
    type: 'show',
    title: 'White Lotus',
    creator: 'Mike White',
    network: 'HBO',
    genres: ['Drama', 'Comedy'],
  },
  {
    type: 'show',
    title: 'Beef',
    creator: 'Lee Sung Jin',
    network: 'Netflix',
    genres: ['Drama', 'Comedy'],
  },
  {
    type: 'show',
    title: 'Jury Duty',
    creator: 'Lee Eisenberg & Gene Stupnitsky',
    network: 'Amazon',
    genres: ['Comedy', 'Documentary'],
  },
  {
    type: 'show',
    title: 'Physical: 100',
    creator: 'Cho Hyun-il',
    network: 'Netflix',
    genres: ['Reality', 'Documentary'],
  },
  {
    type: 'show',
    title: 'Fleabag',
    creator: 'Phoebe Waller-Bridge',
    network: 'BBC',
    genres: ['Comedy', 'Drama'],
  },
  {
    type: 'show',
    title: "Schitt's Creek",
    creator: 'Daniel Levy & Eugene Levy',
    network: 'CBC',
    genres: ['Comedy'],
  },
  {
    type: 'show',
    title: 'The Good Place',
    creator: 'Michael Schur',
    network: 'NBC',
    genres: ['Comedy'],
  },
  {
    type: 'show',
    title: 'Brooklyn Nine-Nine',
    creator: 'Dan Goor & Michael Schur',
    network: 'NBC',
    genres: ['Comedy'],
  },
  {
    type: 'show',
    title: 'What We Do in the Shadows',
    creator: 'Taika Waititi & Jemaine Clement',
    network: 'FX',
    genres: ['Comedy'],
  },
  {
    type: 'show',
    title: 'Our Flag Means Death',
    creator: 'David Jenkins',
    network: 'HBO Max',
    genres: ['Comedy'],
  },
  {
    type: 'show',
    title: 'Reservation Dogs',
    creator: 'Sterlin Harjo & Taika Waititi',
    network: 'FX',
    genres: ['Comedy', 'Drama'],
  },
  {
    type: 'show',
    title: 'Dark',
    creator: 'Baran bo Odar & Jantje Friese',
    network: 'Netflix',
    genres: ['Science Fiction', 'Mystery'],
  },
  {
    type: 'show',
    title: 'Mindhunter',
    creator: 'Joe Penhall',
    network: 'Netflix',
    genres: ['Crime', 'Drama'],
  },
  {
    type: 'show',
    title: 'True Detective',
    creator: 'Nic Pizzolatto',
    network: 'HBO',
    genres: ['Crime', 'Mystery'],
  },
  {
    type: 'show',
    title: 'Shogun',
    creator: 'Rachel Kondo & Caillin Puente',
    network: 'FX',
    genres: ['Historical Fiction', 'Drama'],
  },
  {
    type: 'show',
    title: 'Fargo',
    creator: 'Noah Hawley',
    network: 'FX',
    genres: ['Crime', 'Drama', 'Comedy'],
  },
  {
    type: 'show',
    title: 'The Diplomat',
    creator: 'Debora Cahn',
    network: 'Netflix',
    genres: ['Drama', 'Comedy'],
  },
  {
    type: 'show',
    title: 'Black Mirror',
    creator: 'Charlie Brooker',
    network: 'Netflix',
    genres: ['Science Fiction', 'Thriller'],
  },
  {
    type: 'show',
    title: 'Years and Years',
    creator: 'Russell T. Davies',
    network: 'BBC',
    genres: ['Science Fiction', 'Drama'],
  },
  {
    type: 'show',
    title: 'Station Eleven',
    creator: 'Patrick Somerville',
    network: 'HBO Max',
    genres: ['Science Fiction', 'Drama'],
  },
  {
    type: 'show',
    title: 'The Morning Show',
    creator: 'Kerry Ehrin',
    network: 'Apple TV+',
    genres: ['Drama'],
  },
  {
    type: 'show',
    title: 'The Gilded Age',
    creator: 'Julian Fellowes',
    network: 'HBO',
    genres: ['Historical Fiction', 'Drama'],
  },
  {
    type: 'show',
    title: 'Industry',
    creator: 'Mickey Down & Konrad Kay',
    network: 'BBC',
    genres: ['Drama'],
  },
  {
    type: 'show',
    title: 'Invincible',
    creator: 'Robert Kirkman',
    network: 'Amazon',
    genres: ['Animation', 'Action'],
  },
  {
    type: 'show',
    title: 'Arcane',
    creator: 'Christian Linke & Alex Yee',
    network: 'Netflix',
    genres: ['Animation', 'Fantasy'],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const _delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

function _slugify(title: string, type: string): string {
  return `${type}-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`
}

async function placeholderBuffer(): Promise<Buffer> {
  return sharp({
    create: { width: 300, height: 450, channels: 3, background: { r: 180, g: 180, b: 180 } },
  })
    .jpeg({ quality: 85 })
    .toBuffer()
}

async function _resizeCover(imageData: ArrayBuffer): Promise<Buffer> {
  return sharp(Buffer.from(imageData))
    .resize(300, 450, { fit: 'cover' })
    .jpeg({ quality: 85 })
    .toBuffer()
}

// ---------------------------------------------------------------------------
// Phase 1 — Storage setup
// ---------------------------------------------------------------------------

async function setupStorage(): Promise<string> {
  console.log('\n[Phase 1] Setting up Supabase Storage...')

  const { error: bucketError } = await supabase.storage.createBucket('media-covers', {
    public: true,
  })
  if (bucketError && !bucketError.message.includes('already exists')) {
    throw bucketError
  }

  const placeholder = await placeholderBuffer()
  await supabase.storage
    .from('media-covers')
    .upload('placeholder.jpg', placeholder, { contentType: 'image/jpeg', upsert: true })

  const { data } = supabase.storage.from('media-covers').getPublicUrl('placeholder.jpg')
  console.log('  Placeholder uploaded:', data.publicUrl)
  return data.publicUrl
}

// ---------------------------------------------------------------------------
// Phase 2 — Fetch metadata (curated list)
// Phase 3 — Bulk fill (TMDB top-rated + Google Books subjects)
// Phase 4 — Download and upload covers
// Phase 5 — Insert into media table
// These phases are stubbed — full implementation in later sessions
// ---------------------------------------------------------------------------

async function run() {
  const errors: { error: string; title: string }[] = []
  const _placeholderUrl = await setupStorage()
  console.log('\n[Phase 2–5] Metadata fetch and insert — TODO')
  console.log(`  Loaded ${seedItems.length} curated seed items`)
  console.log('  Full implementation pending')

  if (errors.length > 0) {
    const fs = await import('fs/promises')
    await fs.writeFile(
      new URL('seed-errors.json', import.meta.url),
      JSON.stringify(errors, null, 2),
    )
  }
  console.log('\nDone.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
