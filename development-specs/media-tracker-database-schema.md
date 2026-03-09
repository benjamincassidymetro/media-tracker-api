# Media Tracker - Database Schema (Pre-Seeded)
## PostgreSQL Database Design - All Data Pre-Seeded

**Version:** 3.0  
**Last Updated:** 2026-02-10  
**Approach:** Pre-seeded database with ~600 books and movies  
**No External APIs:** All data fetched once during setup, then served from database

---

## Overview

This database schema supports a **pre-seeded** approach where all books and movies are loaded into the database during initial setup. Students query the local database directly - no external API calls needed.

**Benefits:**
- No API rate limits
- Unlimited queries for pagination practice
- Faster responses
- Consistent data across all students
- Works offline

---

## Core Tables

### **users**

User accounts and authentication.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  bio VARCHAR(500),
  avatar_url VARCHAR(500),  -- URL to Supabase Storage
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

ALTER TABLE users ADD CONSTRAINT chk_username_format 
  CHECK (username ~ '^[a-zA-Z0-9_]{3,50}$');
```

---

### **media**

Pre-seeded books and movies (~600 total).

```sql
CREATE TABLE media (
  id SERIAL PRIMARY KEY,
  media_type VARCHAR(20) NOT NULL,  -- 'book' or 'movie'
  title VARCHAR(500) NOT NULL,
  author VARCHAR(255),  -- For books
  director VARCHAR(255),  -- For movies
  cover_url VARCHAR(500),  -- Direct URL to Google Books / TMDB image
  description TEXT,
  published_year INTEGER,
  page_count INTEGER,  -- For books
  runtime_minutes INTEGER,  -- For movies
  genres TEXT[],  -- Array of genre strings
  isbn VARCHAR(20),  -- For books
  language VARCHAR(10) DEFAULT 'en',
  
  -- Our internal ratings (calculated from user reviews)
  average_rating DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  
  -- Metadata
  seeded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for search and filtering
CREATE INDEX idx_media_type ON media(media_type);
CREATE INDEX idx_media_title_trgm ON media USING gin(title gin_trgm_ops);
CREATE INDEX idx_media_author_trgm ON media USING gin(author gin_trgm_ops);
CREATE INDEX idx_media_director_trgm ON media USING gin(director gin_trgm_ops);
CREATE INDEX idx_media_genres ON media USING gin(genres);
CREATE INDEX idx_media_year ON media(published_year);
CREATE INDEX idx_media_rating ON media(average_rating DESC);

-- Enable trigram extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Constraints
ALTER TABLE media ADD CONSTRAINT chk_media_type 
  CHECK (media_type IN ('book', 'movie'));
ALTER TABLE media ADD CONSTRAINT chk_rating_range 
  CHECK (average_rating >= 0 AND average_rating <= 5);
```

**Notes:**
- ~300 books, ~300 movies pre-loaded
- `cover_url` points to external CDN (Google Books / TMDB) - free forever
- Trigram indexes enable fuzzy search: "harry poter" → finds "Harry Potter"
- Genres stored as PostgreSQL array for flexible filtering

**Seed Data Coverage:**
- Books: Classics, bestsellers, sci-fi, fantasy, mystery, non-fiction, YA
- Movies: Classics, blockbusters, action, drama, comedy, sci-fi, horror

---

### **user_media**

User's personal library.

```sql
CREATE TABLE user_media (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, media_id)
);

CREATE INDEX idx_user_media_user_status ON user_media(user_id, status);
CREATE INDEX idx_user_media_media ON user_media(media_id);
CREATE INDEX idx_user_media_added ON user_media(added_at DESC);
CREATE INDEX idx_user_media_finished ON user_media(finished_at DESC) 
  WHERE finished_at IS NOT NULL;

ALTER TABLE user_media ADD CONSTRAINT chk_status 
  CHECK (status IN ('want_to', 'reading', 'in_progress', 'finished'));
```

---

### **reviews**

User ratings and reviews.

```sql
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  review_text VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, media_id)
);

CREATE INDEX idx_reviews_media ON reviews(media_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating DESC);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);

ALTER TABLE reviews ADD CONSTRAINT chk_rating 
  CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE reviews ADD CONSTRAINT chk_review_length 
  CHECK (char_length(review_text) <= 500);
```

---

## Social Features

### **follows**

```sql
CREATE TABLE follows (
  id SERIAL PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

ALTER TABLE follows ADD CONSTRAINT chk_no_self_follow 
  CHECK (follower_id != following_id);
```

---

### **activity_feed**

```sql
CREATE TABLE activity_feed (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(20) NOT NULL,
  media_id INTEGER REFERENCES media(id) ON DELETE CASCADE,
  rating INTEGER,
  review_text VARCHAR(500),
  status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON activity_feed(user_id);
CREATE INDEX idx_activity_created ON activity_feed(created_at DESC);
CREATE INDEX idx_activity_type ON activity_feed(activity_type);

ALTER TABLE activity_feed ADD CONSTRAINT chk_activity_type 
  CHECK (activity_type IN ('review', 'added', 'finished', 'started'));
```

---

## Custom Feature Tables

### **want_to_priorities**

```sql
CREATE TABLE want_to_priorities (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_media_id INTEGER NOT NULL REFERENCES user_media(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  estimated_time_hours INTEGER,
  notes VARCHAR(200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, user_media_id)
);

CREATE INDEX idx_priorities_user ON want_to_priorities(user_id, order_index);

ALTER TABLE want_to_priorities ADD CONSTRAINT chk_priority_level 
  CHECK (priority IN (1, 2, 3));
```

---

### **reading_goals**

```sql
CREATE TABLE reading_goals (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  target_count INTEGER NOT NULL,
  media_type VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, year, media_type)
);

ALTER TABLE reading_goals ADD CONSTRAINT chk_media_type_null_or_valid 
  CHECK (media_type IS NULL OR media_type IN ('book', 'movie'));
ALTER TABLE reading_goals ADD CONSTRAINT chk_target_positive 
  CHECK (target_count > 0);
```

---

### **goal_achievements**

```sql
CREATE TABLE goal_achievements (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL REFERENCES reading_goals(id) ON DELETE CASCADE,
  milestone INTEGER NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(goal_id, milestone)
);

ALTER TABLE goal_achievements ADD CONSTRAINT chk_milestone 
  CHECK (milestone IN (25, 50, 75, 100));
```

---

### **quotes**

```sql
CREATE TABLE quotes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  quote_text VARCHAR(500) NOT NULL,
  page_number INTEGER,
  timestamp_seconds INTEGER,
  is_public BOOLEAN DEFAULT TRUE,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quotes_user ON quotes(user_id);
CREATE INDEX idx_quotes_media ON quotes(media_id);
CREATE INDEX idx_quotes_public ON quotes(is_public, created_at DESC) 
  WHERE is_public = TRUE;
CREATE INDEX idx_quotes_likes ON quotes(like_count DESC) 
  WHERE is_public = TRUE;

ALTER TABLE quotes ADD CONSTRAINT chk_quote_length 
  CHECK (char_length(quote_text) <= 500);
```

---

### **quote_likes**

```sql
CREATE TABLE quote_likes (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quote_id, user_id)
);

CREATE INDEX idx_quote_likes_quote ON quote_likes(quote_id);
CREATE INDEX idx_quote_likes_user ON quote_likes(user_id);
```

---

## Database Triggers

### Update `media.average_rating` when review created/updated/deleted

```sql
CREATE OR REPLACE FUNCTION update_media_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate average rating and count for the media item
  UPDATE media
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM reviews
      WHERE media_id = COALESCE(NEW.media_id, OLD.media_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE media_id = COALESCE(NEW.media_id, OLD.media_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE media_id = COALESCE(NEW.media_id, OLD.media_id)
      AND review_text IS NOT NULL
      AND review_text != ''
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.media_id, OLD.media_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_media_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_media_rating();
```

---

### Create activity feed entry when user performs actions

```sql
CREATE OR REPLACE FUNCTION create_activity_feed_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- When review created
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'reviews' THEN
    INSERT INTO activity_feed (user_id, activity_type, media_id, rating, review_text)
    VALUES (NEW.user_id, 'review', NEW.media_id, NEW.rating, NEW.review_text);
    
  -- When user_media status changes to finished
  ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'user_media' 
    AND NEW.status = 'finished' AND OLD.status != 'finished' THEN
    INSERT INTO activity_feed (user_id, activity_type, media_id, status)
    VALUES (NEW.user_id, 'finished', NEW.media_id, 'finished');
    
  -- When user_media status changes to reading/in_progress
  ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'user_media' 
    AND NEW.status IN ('reading', 'in_progress') 
    AND OLD.status NOT IN ('reading', 'in_progress') THEN
    INSERT INTO activity_feed (user_id, activity_type, media_id, status)
    VALUES (NEW.user_id, 'started', NEW.media_id, NEW.status);
    
  -- When user_media first created (added to library)
  ELSIF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'user_media' THEN
    INSERT INTO activity_feed (user_id, activity_type, media_id, status)
    VALUES (NEW.user_id, 'added', NEW.media_id, NEW.status);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_review_activity
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION create_activity_feed_entry();

CREATE TRIGGER trigger_user_media_activity
AFTER INSERT OR UPDATE ON user_media
FOR EACH ROW
EXECUTE FUNCTION create_activity_feed_entry();
```

---

### Update quote like count

```sql
CREATE OR REPLACE FUNCTION update_quote_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE quotes
  SET like_count = (
    SELECT COUNT(*)
    FROM quote_likes
    WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
  )
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quote_likes
AFTER INSERT OR DELETE ON quote_likes
FOR EACH ROW
EXECUTE FUNCTION update_quote_like_count();
```

---

### Auto-unlock goal achievements

```sql
CREATE OR REPLACE FUNCTION check_goal_achievements()
RETURNS TRIGGER AS $$
DECLARE
  goal_row reading_goals%ROWTYPE;
  current_count INTEGER;
  percentage INTEGER;
BEGIN
  -- Only check when user finishes media
  IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status != 'finished') THEN
    -- Get all active goals for this user
    FOR goal_row IN 
      SELECT * FROM reading_goals 
      WHERE user_id = NEW.user_id 
      AND year = EXTRACT(YEAR FROM NOW())
    LOOP
      -- Count finished media for this goal
      SELECT COUNT(*) INTO current_count
      FROM user_media um
      JOIN media m ON um.media_id = m.id
      WHERE um.user_id = NEW.user_id
      AND um.status = 'finished'
      AND EXTRACT(YEAR FROM um.finished_at) = goal_row.year
      AND (goal_row.media_type IS NULL OR m.media_type = goal_row.media_type);
      
      -- Calculate percentage
      percentage := (current_count::DECIMAL / goal_row.target_count * 100)::INTEGER;
      
      -- Unlock achievements
      IF percentage >= 25 THEN
        UPDATE goal_achievements
        SET unlocked_at = COALESCE(unlocked_at, NOW())
        WHERE goal_id = goal_row.id AND milestone = 25;
      END IF;
      
      IF percentage >= 50 THEN
        UPDATE goal_achievements
        SET unlocked_at = COALESCE(unlocked_at, NOW())
        WHERE goal_id = goal_row.id AND milestone = 50;
      END IF;
      
      IF percentage >= 75 THEN
        UPDATE goal_achievements
        SET unlocked_at = COALESCE(unlocked_at, NOW())
        WHERE goal_id = goal_row.id AND milestone = 75;
      END IF;
      
      IF percentage >= 100 THEN
        UPDATE goal_achievements
        SET unlocked_at = COALESCE(unlocked_at, NOW())
        WHERE goal_id = goal_row.id AND milestone = 100;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_achievements
AFTER INSERT OR UPDATE ON user_media
FOR EACH ROW
EXECUTE FUNCTION check_goal_achievements();
```

---

## Row Level Security (RLS) Policies

Enable RLS on all user-data tables:

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE want_to_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_likes ENABLE ROW LEVEL SECURITY;

-- Media table is public (read-only for all)
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Media is viewable by everyone" ON media
  FOR SELECT USING (true);
```

### Users table policies

```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can view public profiles (for social features)
CREATE POLICY "Public profiles viewable" ON users
  FOR SELECT USING (true);
```

### User_media policies

```sql
-- Users can view their own library
CREATE POLICY "Users can view own library" ON user_media
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert to their own library
CREATE POLICY "Users can add to own library" ON user_media
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own library
CREATE POLICY "Users can update own library" ON user_media
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete from their own library
CREATE POLICY "Users can delete from own library" ON user_media
  FOR DELETE USING (auth.uid() = user_id);
```

### Reviews policies

```sql
-- Anyone can view reviews
CREATE POLICY "Reviews are viewable by everyone" ON reviews
  FOR SELECT USING (true);

-- Users can create reviews
CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews" ON reviews
  FOR DELETE USING (auth.uid() = user_id);
```

### Follows policies

```sql
-- Users can view all follows (for social features)
CREATE POLICY "Follows are viewable" ON follows
  FOR SELECT USING (true);

-- Users can create follows
CREATE POLICY "Users can follow others" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Users can delete their own follows
CREATE POLICY "Users can unfollow" ON follows
  FOR DELETE USING (auth.uid() = follower_id);
```

### Activity feed policies

```sql
-- Users can view activity from people they follow
CREATE POLICY "Users can view followed activity" ON activity_feed
  FOR SELECT USING (
    user_id IN (
      SELECT following_id FROM follows WHERE follower_id = auth.uid()
    )
    OR user_id = auth.uid()  -- Also see own activity
  );
```

### Custom feature policies

```sql
-- Want-to priorities
CREATE POLICY "Users manage own priorities" ON want_to_priorities
  FOR ALL USING (auth.uid() = user_id);

-- Reading goals
CREATE POLICY "Users manage own goals" ON reading_goals
  FOR ALL USING (auth.uid() = user_id);

-- Goal achievements (read-only, managed by triggers)
CREATE POLICY "Users view own achievements" ON goal_achievements
  FOR SELECT USING (
    goal_id IN (SELECT id FROM reading_goals WHERE user_id = auth.uid())
  );

-- Quotes
CREATE POLICY "Users manage own quotes" ON quotes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public quotes viewable" ON quotes
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

-- Quote likes
CREATE POLICY "Users manage own quote likes" ON quote_likes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Quote likes viewable" ON quote_likes
  FOR SELECT USING (true);
```

---

## Sample Queries for Students

### Search books by title (fuzzy match)

```sql
SELECT * FROM media
WHERE media_type = 'book'
AND title ILIKE '%harry%'
ORDER BY average_rating DESC
LIMIT 20;
```

### Search with pagination

```sql
SELECT * FROM media
WHERE media_type = 'book'
AND title ILIKE '%fantasy%'
ORDER BY title ASC
LIMIT 20 OFFSET 40;  -- Page 3 (20 per page)
```

### Filter by genre and year

```sql
SELECT * FROM media
WHERE media_type = 'movie'
AND 'Action' = ANY(genres)
AND published_year >= 2020
ORDER BY average_rating DESC
LIMIT 20;
```

### Get user's library with media details

```sql
SELECT um.*, m.*
FROM user_media um
JOIN media m ON um.media_id = m.id
WHERE um.user_id = 'uuid-here'
AND um.status = 'want_to'
ORDER BY um.added_at DESC;
```

---

## Database Size Estimates

- **Media table:** ~600 rows × ~2KB = ~1.2 MB
- **Users:** 50 users × 1KB = 50 KB
- **User_media:** 50 users × 20 items × 200 bytes = 200 KB
- **Reviews:** 50 users × 10 reviews × 300 bytes = 150 KB
- **Other tables:** < 100 KB

**Total:** ~2 MB (well under Supabase free tier of 500 MB)

---

**END OF DATABASE SCHEMA**

This schema supports a fully pre-seeded Media Tracker with no external API dependencies.
