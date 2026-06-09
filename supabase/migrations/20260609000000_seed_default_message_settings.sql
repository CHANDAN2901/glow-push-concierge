-- Migration: auto-seed default automated-message settings on artist signup.
--
-- Background: the "Edit Message Content" editor (src/components/MessageEditor.tsx) ships default
-- drafts (welcome + brows/lips day follow-ups) but only persists them to artist_message_settings
-- when the artist clicks Save. The aftercare-cron reads only the DB, so artists who never saved had
-- no message content and received no daily aftercare push. We now create a default
-- artist_message_settings row for every new artist so the daily push works out of the box.
--
-- The settings JSON below is a verbatim copy of SHARED_TEMPLATES / BROWS_TEMPLATES / LIPS_TEMPLATES
-- in MessageEditor.tsx (the single source of truth). Existing artists are backfilled separately
-- (see the backfill SQL in the plan / run manually).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referral_code TEXT;
  v_result JSONB;
  v_profile_id UUID;
BEGIN
  -- Create profile row — no trial granted automatically
  INSERT INTO public.profiles (user_id, email, full_name, studio_name, subscription_tier, subscription_status, trial_ends_at, trial_source)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'studio_name', ''),
    'lite',
    'pending',
    NULL,
    NULL
  )
  RETURNING id INTO v_profile_id;

  -- Create default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Seed default automated-message settings so the daily aftercare push has content immediately.
  -- Wrapped so any failure here can never block signup.
  BEGIN
    INSERT INTO public.artist_message_settings (artist_profile_id, settings)
    VALUES (v_profile_id, $msgjson$
{
  "drafts": {
    "welcome__he": "היי {שם_לקוחה} אהובה, מתרגשת לקראת התור שלנו! ✨\n\nכדי שנוכל להתחיל את הטיפול ברוגע ולוודא שהכל מותאם עבורך בצורה מושלמת, אשמח שתקדישי דקה למילוי הצהרת הבריאות בלינק כאן למטה:\n\n{קישור_לשאלון}\n\nמחכה לראותך בקליניקה ולעשות לך הכי יפה שיש,\n\nאורית 💖",
    "welcome__en": "Hi {Client_Name}, we are so excited for your appointment! To ensure we are fully prepared, please complete your health declaration form here: {Form_Link}. Can't wait to see you!",
    "brows_day1__he": "בוקר טוב {שם_לקוחה}, איך הגבות החדשות שלך? רק מזכירה למרוח את המשחה. הצבע עשוי להיראות כהה היום וזה טבעי לגמרי!",
    "brows_day1__en": "Good morning {Client_Name}, how are your new brows? Just a reminder to apply the ointment. The color may look dark today — that's completely normal!",
    "brows_day4__he": "היי {שם_לקוחה}, שלב הקילוף אולי התחיל. נא לא לגעת ולא לקלף! תני לזה לנשור לבד כדי לשמור על הפיגמנט.",
    "brows_day4__en": "Hi {Client_Name}, the peeling stage may have started. Please don't touch or pick! Let it flake off naturally to preserve the pigment.",
    "brows_day10__he": "תתחדשי {שם_לקוחה}! ההחלמה החיצונית הסתיימה. איך התוצאה נראית לך? אשמח לראות תמונה!",
    "brows_day10__en": "Looking great {Client_Name}! The external healing is complete. How does the result look? I'd love to see a photo!",
    "lips_day1__he": "היי {שם_לקוחה}, איך השפתיים החדשות? זכרי לשתות בקש ביומיים הקרובים ולהימנע מאוכל חריף/חם מדי. אל תשכחי למרוח את המשחה!",
    "lips_day1__en": "Hi {Client_Name}, how are your new lips? Remember to drink with a straw for the next couple of days and avoid spicy/hot food. Don't forget to apply the ointment!",
    "lips_day3__he": "בוקר טוב! השפתיים עשויות להרגיש יבשות או להתחיל להתקלף. זה הזמן להקפיד על לחות מקסימלית ולא לקלף!",
    "lips_day3__en": "Good morning! Your lips may feel dry or start peeling. Now is the time to keep them well-moisturized and avoid picking!",
    "lips_day10__he": "תתחדשי! הצבע של השפתיים עשוי להיראות בהיר כרגע, הוא יתייצב בשבועות הקרובים. איך התחושה?",
    "lips_day10__en": "Looking great! The lip color may appear lighter right now — it will settle in the coming weeks. How does it feel?"
  },
  "days": { "welcome": null, "brows_day1": 1, "brows_day4": 4, "brows_day10": 10, "lips_day1": 1, "lips_day3": 3, "lips_day10": 10 },
  "sendTypes": { "welcome": "push", "brows_day1": "push", "brows_day4": "push", "brows_day10": "push", "lips_day1": "push", "lips_day3": "push", "lips_day10": "push" },
  "customTemplates": []
}
$msgjson$::jsonb)
    ON CONFLICT (artist_profile_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[handle_new_user] seed artist_message_settings failed for profile %: %', v_profile_id, SQLERRM;
  END;

  -- Apply referral benefits if a referral code was provided at signup
  v_referral_code := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')), '');
  IF v_referral_code IS NOT NULL THEN
    BEGIN
      v_result := public.apply_referral_benefits(NEW.id, v_referral_code);
      RAISE LOG '[handle_new_user] apply_referral_benefits result for %: %', NEW.id, v_result;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[handle_new_user] apply_referral_benefits error for user %, code "%": %', NEW.id, v_referral_code, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
