-- =============================================================================
-- Seed: local development data
-- Applied by: supabase db reset  OR  docker/migrate.sh
-- =============================================================================

-- ─── Test user ────────────────────────────────────────────────────────────────
-- Creates a user you can log in with during local development:
--   email:    dev@example.com
--   password: password123
--
-- The encrypted_password below is the bcrypt hash of "password123".
-- Supabase Auth's GoTrue will verify it on login.

INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'dev@example.com',
  '$2a$10$PXF3sJb5oZziFEXRGTkEmeYfqq4X3e9TcxJTCQyW3y3.8DbnZWR9O',
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- The trigger handle_new_user fires on auth.users INSERT and creates the public
-- profile row automatically.  We UPDATE it here to add a real username.
UPDATE public.users
SET
  username     = 'devuser',
  display_name = 'Dev User',
  bio          = 'Local development test account'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- ─── Books ────────────────────────────────────────────────────────────────────

INSERT INTO public.media
  (media_type, title, author, cover_url, description, published_year, page_count, genres, language)
VALUES
  ('book', 'The Hobbit',
   'J.R.R. Tolkien',
   'https://covers.openlibrary.org/b/id/8243894-L.jpg',
   'A homebody hobbit is swept into an unexpected quest to reclaim a dwarven treasure guarded by a dragon.',
   1937, 310, ARRAY['Fantasy', 'Adventure'], 'en'),

  ('book', 'The Fellowship of the Ring',
   'J.R.R. Tolkien',
   'https://covers.openlibrary.org/b/id/8405716-L.jpg',
   'A young hobbit and his companions begin a perilous journey to destroy a powerful ring.',
   1954, 423, ARRAY['Fantasy', 'Adventure'], 'en'),

  ('book', '1984',
   'George Orwell',
   'https://covers.openlibrary.org/b/id/8575708-L.jpg',
   'A dystopian novel set in a totalitarian society where Big Brother watches everyone.',
   1949, 328, ARRAY['Dystopia', 'Science Fiction', 'Classic'], 'en'),

  ('book', 'Brave New World',
   'Aldous Huxley',
   'https://covers.openlibrary.org/b/id/8745635-L.jpg',
   'A vision of a future society where people are engineered and conditioned for happiness.',
   1932, 311, ARRAY['Dystopia', 'Science Fiction', 'Classic'], 'en'),

  ('book', 'Harry Potter and the Philosopher''s Stone',
   'J.K. Rowling',
   'https://covers.openlibrary.org/b/id/8228691-L.jpg',
   'An orphan boy discovers he is a wizard and begins his education at Hogwarts School of Witchcraft and Wizardry.',
   1997, 309, ARRAY['Fantasy', 'Young Adult', 'Adventure'], 'en'),

  ('book', 'Harry Potter and the Chamber of Secrets',
   'J.K. Rowling',
   'https://covers.openlibrary.org/b/id/8228371-L.jpg',
   'Harry Potter''s second year at Hogwarts brings a mysterious voice and petrified students.',
   1998, 341, ARRAY['Fantasy', 'Young Adult', 'Adventure'], 'en'),

  ('book', 'Harry Potter and the Prisoner of Azkaban',
   'J.K. Rowling',
   'https://covers.openlibrary.org/b/id/8410155-L.jpg',
   'Harry faces the escaped prisoner Sirius Black and uncovers secrets about his past.',
   1999, 435, ARRAY['Fantasy', 'Young Adult', 'Adventure'], 'en'),

  ('book', 'Dune',
   'Frank Herbert',
   'https://covers.openlibrary.org/b/id/8786938-L.jpg',
   'Epic science fiction set on the desert planet Arrakis, home of the most valuable substance in the universe.',
   1965, 412, ARRAY['Science Fiction', 'Adventure'], 'en'),

  ('book', 'The Hitchhiker''s Guide to the Galaxy',
   'Douglas Adams',
   'https://covers.openlibrary.org/b/id/8406786-L.jpg',
   'Moments before Earth is demolished for a hyperspace bypass, Arthur Dent is whisked away into space.',
   1979, 193, ARRAY['Science Fiction', 'Comedy'], 'en'),

  ('book', 'Ender''s Game',
   'Orson Scott Card',
   'https://covers.openlibrary.org/b/id/422221-L.jpg',
   'A brilliant child is trained at a military school in space to lead Earth''s defense against an alien threat.',
   1985, 352, ARRAY['Science Fiction', 'Young Adult'], 'en'),

  ('book', 'Pride and Prejudice',
   'Jane Austen',
   'https://covers.openlibrary.org/b/id/8739161-L.jpg',
   'Elizabeth Bennet navigates issues of manners, upbringing, morality, and marriage in Georgian England.',
   1813, 432, ARRAY['Classic', 'Romance'], 'en'),

  ('book', 'To Kill a Mockingbird',
   'Harper Lee',
   'https://covers.openlibrary.org/b/id/8228691-L.jpg',
   'A lawyer in the Deep South defends a Black man accused of a crime he did not commit.',
   1960, 281, ARRAY['Classic', 'Historical Fiction'], 'en'),

  ('book', 'The Great Gatsby',
   'F. Scott Fitzgerald',
   'https://covers.openlibrary.org/b/id/8431961-L.jpg',
   'A story of wealth, love, and the American Dream set in the Jazz Age.',
   1925, 180, ARRAY['Classic', 'Literary Fiction'], 'en'),

  ('book', 'A Game of Thrones',
   'George R.R. Martin',
   'https://covers.openlibrary.org/b/id/8743536-L.jpg',
   'Noble families fight for control of the Iron Throne of the Seven Kingdoms.',
   1996, 694, ARRAY['Fantasy', 'Adventure'], 'en'),

  ('book', 'The Hunger Games',
   'Suzanne Collins',
   'https://covers.openlibrary.org/b/id/8228691-L.jpg',
   'In a dystopian future, a teenage girl volunteers to take her sister''s place in a televised death match.',
   2008, 374, ARRAY['Young Adult', 'Dystopia', 'Science Fiction'], 'en'),

  ('book', 'The Name of the Wind',
   'Patrick Rothfuss',
   'https://covers.openlibrary.org/b/id/7963207-L.jpg',
   'The tale of Kvothe, a legendary wizard, as told in his own words.',
   2007, 662, ARRAY['Fantasy', 'Adventure'], 'en'),

  ('book', 'Mistborn: The Final Empire',
   'Brandon Sanderson',
   'https://covers.openlibrary.org/b/id/9256204-L.jpg',
   'A group of rebels plans to overthrow a god-like ruler who has dominated their world for a thousand years.',
   2006, 541, ARRAY['Fantasy', 'Adventure'], 'en'),

  ('book', 'The Catcher in the Rye',
   'J.D. Salinger',
   'https://covers.openlibrary.org/b/id/8231432-L.jpg',
   'The story of Holden Caulfield, a disillusioned teenager expelled from his prep school.',
   1951, 277, ARRAY['Classic', 'Literary Fiction'], 'en'),

  ('book', 'Sapiens: A Brief History of Humankind',
   'Yuval Noah Harari',
   'https://covers.openlibrary.org/b/id/8739161-L.jpg',
   'A sweeping narrative of humanity''s creation and evolution from prehistoric times to the present.',
   2011, 443, ARRAY['Non-Fiction', 'History'], 'en'),

  ('book', 'Atomic Habits',
   'James Clear',
   'https://covers.openlibrary.org/b/id/8406786-L.jpg',
   'A practical guide for how to form good habits, break bad ones, and get 1% better every day.',
   2018, 320, ARRAY['Non-Fiction', 'Self-Help'], 'en');

-- ─── Movies ───────────────────────────────────────────────────────────────────

INSERT INTO public.media
  (media_type, title, director, cover_url, description, published_year, runtime_minutes, genres, language)
VALUES
  ('movie', 'The Matrix',
   'Lana Wachowski, Lilly Wachowski',
   'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
   'A computer hacker learns about the true nature of reality and his role in the war against its controllers.',
   1999, 136, ARRAY['Science Fiction', 'Action', 'Thriller'], 'en'),

  ('movie', 'Inception',
   'Christopher Nolan',
   'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
   'A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea.',
   2010, 148, ARRAY['Science Fiction', 'Action', 'Thriller'], 'en'),

  ('movie', 'The Shawshank Redemption',
   'Frank Darabont',
   'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
   'Two imprisoned men bond over a number of years, finding solace and eventual redemption through common decency.',
   1994, 142, ARRAY['Drama'], 'en'),

  ('movie', 'Forrest Gump',
   'Robert Zemeckis',
   'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
   'The history of the United States from the 1950s to the 1970s unfolds from the perspective of Forrest Gump.',
   1994, 142, ARRAY['Drama', 'Comedy', 'Romance'], 'en'),

  ('movie', 'The Dark Knight',
   'Christopher Nolan',
   'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
   'Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
   2008, 152, ARRAY['Action', 'Crime', 'Drama'], 'en'),

  ('movie', 'Pulp Fiction',
   'Quentin Tarantino',
   'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
   'The lives of two mob hitmen, a boxer, a gangster and his wife intersect in four tales of violence and redemption.',
   1994, 154, ARRAY['Crime', 'Drama', 'Thriller'], 'en'),

  ('movie', 'Star Wars: A New Hope',
   'George Lucas',
   'https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg',
   'Luke Skywalker joins forces with a Jedi Knight and a roguish smuggler to save the galaxy.',
   1977, 121, ARRAY['Science Fiction', 'Action', 'Adventure'], 'en'),

  ('movie', 'Jurassic Park',
   'Steven Spielberg',
   'https://image.tmdb.org/t/p/w500/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg',
   'During a preview tour, a theme park suffers a major power breakdown that allows its cloned dinosaurs to run amok.',
   1993, 127, ARRAY['Science Fiction', 'Adventure', 'Thriller'], 'en'),

  ('movie', 'Schindler''s List',
   'Steven Spielberg',
   'https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',
   'In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce.',
   1993, 195, ARRAY['Drama', 'History', 'War'], 'en'),

  ('movie', 'Toy Story',
   'John Lasseter',
   'https://image.tmdb.org/t/p/w500/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg',
   'A cowboy doll is profoundly threatened when a new spaceman figure becomes the favorite toy of the owner.',
   1995, 81, ARRAY['Animation', 'Comedy', 'Family'], 'en'),

  ('movie', 'Interstellar',
   'Christopher Nolan',
   'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
   'A team of explorers travel through a wormhole in space in an attempt to ensure humanity''s survival.',
   2014, 169, ARRAY['Science Fiction', 'Adventure', 'Drama'], 'en'),

  ('movie', 'Parasite',
   'Bong Joon-ho',
   'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
   'Two families from vastly different social backgrounds become entangled in a dark and ironic twist of fate.',
   2019, 132, ARRAY['Thriller', 'Drama', 'Comedy'], 'ko'),

  ('movie', 'Get Out',
   'Jordan Peele',
   'https://image.tmdb.org/t/p/w500/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg',
   'A young African-American man visits his white girlfriend''s family estate, uncovering a disturbing secret.',
   2017, 104, ARRAY['Horror', 'Thriller', 'Mystery'], 'en'),

  ('movie', 'Spirited Away',
   'Hayao Miyazaki',
   'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
   'A sullen 10-year-old girl wanders into a world ruled by gods, witches, and demons.',
   2001, 125, ARRAY['Animation', 'Fantasy', 'Adventure'], 'ja'),

  ('movie', 'The Godfather',
   'Francis Ford Coppola',
   'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsLeMLoNWgEJN.jpg',
   'The aging patriarch of an organized crime dynasty transfers control to his reluctant son.',
   1972, 175, ARRAY['Crime', 'Drama'], 'en'),

  ('movie', 'Goodfellas',
   'Martin Scorsese',
   'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
   'The story of Henry Hill and his life in the mob, covering his relationship with his wife and the mob lifestyle.',
   1990, 146, ARRAY['Crime', 'Drama', 'Biography'], 'en'),

  ('movie', 'Back to the Future',
   'Robert Zemeckis',
   'https://image.tmdb.org/t/p/w500/fNOH9f1aA7XRTzl1sAOx9iF553Q.jpg',
   'Marty McFly is accidentally sent back to 1955 and must make sure his parents meet and fall in love.',
   1985, 116, ARRAY['Science Fiction', 'Adventure', 'Comedy'], 'en'),

  ('movie', 'The Silence of the Lambs',
   'Jonathan Demme',
   'https://image.tmdb.org/t/p/w500/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg',
   'A young FBI cadet must confide in an incarcerated and manipulative killer to catch another serial killer.',
   1991, 118, ARRAY['Thriller', 'Crime', 'Drama'], 'en'),

  ('movie', 'The Princess Bride',
   'Rob Reiner',
   'https://image.tmdb.org/t/p/w500/gpRssUsesiNk3b2MBYGapmxjDVj.jpg',
   'A storybook adventure spanning love, tragedy, mystery, torture, danger, and more.',
   1987, 98, ARRAY['Fantasy', 'Adventure', 'Comedy', 'Romance'], 'en'),

  ('movie', 'WALL-E',
   'Andrew Stanton',
   'https://image.tmdb.org/t/p/w500/hbhFnRzzg6ZDmm8YAmxBnMkRqGs.jpg',
   'A waste-collecting robot finds love and participates in a plan to end the human race''s idleness by returning to Earth.',
   2008, 98, ARRAY['Animation', 'Science Fiction', 'Comedy', 'Family'], 'en');
