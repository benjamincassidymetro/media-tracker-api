-- -----------------------------------------------------------------------
-- Enable Row Level Security on all tables
-- -----------------------------------------------------------------------
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_media       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.want_to_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_goals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_likes      ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------
-- media: publicly readable, never writable by end-users
-- -----------------------------------------------------------------------
CREATE POLICY "Media is viewable by everyone"
  ON public.media FOR SELECT
  USING (true);

-- -----------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------
-- Public profiles are readable by anyone (needed for social features)
CREATE POLICY "Public profiles viewable"
  ON public.users FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- -----------------------------------------------------------------------
-- user_media
-- -----------------------------------------------------------------------
CREATE POLICY "Users can view own library"
  ON public.user_media FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own library"
  ON public.user_media FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own library"
  ON public.user_media FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from own library"
  ON public.user_media FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------
-- reviews
-- -----------------------------------------------------------------------
CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------
-- follows
-- -----------------------------------------------------------------------
CREATE POLICY "Follows are viewable"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- -----------------------------------------------------------------------
-- activity_feed
-- -----------------------------------------------------------------------
-- Users see their own activity plus activity from people they follow
CREATE POLICY "Users can view followed activity"
  ON public.activity_feed FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT following_id FROM public.follows WHERE follower_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------
-- want_to_priorities
-- -----------------------------------------------------------------------
CREATE POLICY "Users manage own priorities"
  ON public.want_to_priorities FOR ALL
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------
-- reading_goals
-- -----------------------------------------------------------------------
CREATE POLICY "Users manage own goals"
  ON public.reading_goals FOR ALL
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------
-- goal_achievements (read-only for users; written only by triggers)
-- -----------------------------------------------------------------------
CREATE POLICY "Users view own achievements"
  ON public.goal_achievements FOR SELECT
  USING (
    goal_id IN (
      SELECT id FROM public.reading_goals WHERE user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------
-- quotes
-- -----------------------------------------------------------------------
CREATE POLICY "Users manage own quotes"
  ON public.quotes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Public quotes viewable"
  ON public.quotes FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- -----------------------------------------------------------------------
-- quote_likes
-- -----------------------------------------------------------------------
CREATE POLICY "Quote likes viewable"
  ON public.quote_likes FOR SELECT
  USING (true);

CREATE POLICY "Users manage own quote likes"
  ON public.quote_likes FOR ALL
  USING (auth.uid() = user_id);
