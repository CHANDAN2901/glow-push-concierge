
ALTER TABLE public.promo_settings
  ADD COLUMN IF NOT EXISTS tag_text_en TEXT NOT NULL DEFAULT 'Exclusive for Returning Clients ✨',
  ADD COLUMN IF NOT EXISTS title_en TEXT NOT NULL DEFAULT 'Complete Your Look',
  ADD COLUMN IF NOT EXISTS description_en TEXT NOT NULL DEFAULT 'Love your new brows? Complete your look with a delicate watercolor lip blush! Enjoy 15% off your next treatment as an existing client.',
  ADD COLUMN IF NOT EXISTS button_text_en TEXT NOT NULL DEFAULT 'Details & Booking 💋';
