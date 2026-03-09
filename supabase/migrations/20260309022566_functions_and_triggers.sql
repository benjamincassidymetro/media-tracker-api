-- -----------------------------------------------------------------------
-- 1. Recalculate media aggregate ratings after any review change
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_media_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.media
  SET
    average_rating = (
      SELECT COALESCE(AVG(rating::DECIMAL), 0)
      FROM public.reviews
      WHERE media_id = COALESCE(NEW.media_id, OLD.media_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE media_id = COALESCE(NEW.media_id, OLD.media_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE media_id = COALESCE(NEW.media_id, OLD.media_id)
        AND review_text IS NOT NULL
        AND review_text != ''
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.media_id, OLD.media_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_media_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_media_rating();

-- -----------------------------------------------------------------------
-- 2. Write an activity_feed entry when a review is created or a
--    user_media row is inserted/updated
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_activity_feed_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- New review written
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'reviews' THEN
    INSERT INTO public.activity_feed (user_id, activity_type, media_id, rating, review_text)
    VALUES (NEW.user_id, 'review', NEW.media_id, NEW.rating, NEW.review_text);

  -- Media marked as finished
  ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'user_media'
    AND NEW.status = 'finished' AND OLD.status != 'finished' THEN
    INSERT INTO public.activity_feed (user_id, activity_type, media_id, status)
    VALUES (NEW.user_id, 'finished', NEW.media_id, 'finished');

  -- Media started (reading / in_progress)
  ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'user_media'
    AND NEW.status IN ('reading', 'in_progress')
    AND OLD.status NOT IN ('reading', 'in_progress') THEN
    INSERT INTO public.activity_feed (user_id, activity_type, media_id, status)
    VALUES (NEW.user_id, 'started', NEW.media_id, NEW.status);

  -- Media added to library for the first time
  ELSIF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'user_media' THEN
    INSERT INTO public.activity_feed (user_id, activity_type, media_id, status)
    VALUES (NEW.user_id, 'added', NEW.media_id, NEW.status);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_review_activity
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_feed_entry();

CREATE TRIGGER trigger_user_media_activity
  AFTER INSERT OR UPDATE ON public.user_media
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_feed_entry();

-- -----------------------------------------------------------------------
-- 3. Keep quote.like_count in sync with quote_likes rows
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_quote_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.quotes
  SET like_count = (
    SELECT COUNT(*)
    FROM public.quote_likes
    WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
  )
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_quote_likes
  AFTER INSERT OR DELETE ON public.quote_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quote_like_count();

-- -----------------------------------------------------------------------
-- 4. Auto-unlock goal achievements when a user finishes a media item
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_goal_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  goal_row     public.reading_goals%ROWTYPE;
  current_count INTEGER;
  percentage    INTEGER;
BEGIN
  -- Only act when status transitions to 'finished'
  IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status != 'finished') THEN
    FOR goal_row IN
      SELECT * FROM public.reading_goals
      WHERE user_id = NEW.user_id
        AND year = EXTRACT(YEAR FROM NOW())
    LOOP
      SELECT COUNT(*) INTO current_count
      FROM public.user_media um
      JOIN public.media m ON um.media_id = m.id
      WHERE um.user_id = NEW.user_id
        AND um.status = 'finished'
        AND EXTRACT(YEAR FROM um.finished_at) = goal_row.year
        AND (goal_row.media_type IS NULL OR m.media_type = goal_row.media_type);

      percentage := (current_count::DECIMAL / goal_row.target_count * 100)::INTEGER;

      IF percentage >= 25 THEN
        UPDATE public.goal_achievements
        SET unlocked_at = COALESCE(unlocked_at, NOW())
        WHERE goal_id = goal_row.id AND milestone = 25;
      END IF;

      IF percentage >= 50 THEN
        UPDATE public.goal_achievements
        SET unlocked_at = COALESCE(unlocked_at, NOW())
        WHERE goal_id = goal_row.id AND milestone = 50;
      END IF;

      IF percentage >= 75 THEN
        UPDATE public.goal_achievements
        SET unlocked_at = COALESCE(unlocked_at, NOW())
        WHERE goal_id = goal_row.id AND milestone = 75;
      END IF;

      IF percentage >= 100 THEN
        UPDATE public.goal_achievements
        SET unlocked_at = COALESCE(unlocked_at, NOW())
        WHERE goal_id = goal_row.id AND milestone = 100;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_achievements
  AFTER INSERT OR UPDATE ON public.user_media
  FOR EACH ROW
  EXECUTE FUNCTION public.check_goal_achievements();
