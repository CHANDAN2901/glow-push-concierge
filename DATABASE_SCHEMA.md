# GlowPush — Database Schema Reference

Auto-generated schema documentation for all public tables.

## announcements

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| created_at | timestamp with time zone | No | now() |
| title | text | No | — |
| content | text | Yes | — |
| is_active | boolean | No | true |

## appointments

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| artist_id | uuid | No | — |
| client_name | text | No | — |
| client_phone | text | Yes | ''::text |
| treatment_type | text | No | 'eyebrows'::text |
| date | date | No | — |
| time | text | No | '10:00'::text |
| health_form_status | text | No | 'pending'::text |
| health_risk_level | text | No | 'none'::text |
| health_form_answers | jsonb | Yes | '{}'::jsonb |
| status | text | No | 'scheduled'::text |
| auto_send_health | boolean | No | false |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |
| client_id | uuid | Yes | — |

## artist_custom_health_questions

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| artist_profile_id | uuid | No | — |
| question_he | text | No | — |
| question_en | text | No | ''::text |
| icon | text | No | '❓'::text |
| risk_level | text | No | 'green'::text |
| has_detail_field | boolean | No | false |
| detail_placeholder_he | text | Yes | ''::text |
| detail_placeholder_en | text | Yes | ''::text |
| sort_order | integer | No | 100 |
| created_at | timestamp with time zone | No | now() |

## artist_health_question_overrides

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| artist_profile_id | uuid | No | — |
| question_id | uuid | No | — |
| is_included | boolean | No | true |
| custom_text_he | text | Yes | — |
| custom_text_en | text | Yes | — |
| sort_order | integer | No | 0 |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

## artist_message_settings

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| artist_profile_id | uuid | No | — |
| settings | jsonb | No | '{}'::jsonb |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

## client_gallery_photos

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| client_id | uuid | Yes | — |
| artist_id | uuid | No | — |
| storage_path | text | No | — |
| public_url | text | No | — |
| photo_type | text | No | 'healing'::text |
| label | text | Yes | — |
| day_number | integer | Yes | — |
| uploaded_by | text | No | 'artist'::text |
| seen_by_client | boolean | No | false |
| created_at | timestamp with time zone | No | now() |

## client_healing_phases

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| client_id | uuid | No | — |
| source_phase_id | uuid | Yes | — |
| treatment_type | text | No | — |
| day_start | integer | No | — |
| day_end | integer | No | — |
| title_he | text | No | — |
| title_en | text | No | — |
| icon | text | No | '💧'::text |
| severity | text | No | 'medium'::text |
| steps_he | ARRAY | No | '{}'::text[] |
| steps_en | ARRAY | No | '{}'::text[] |
| sort_order | integer | No | 0 |
| image_url | text | Yes | — |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

## clients

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| created_at | timestamp with time zone | No | now() |
| artist_id | uuid | No | — |
| full_name | text | No | — |
| phone | text | Yes | — |
| email | text | Yes | — |
| treatment_type | text | Yes | — |
| treatment_date | date | Yes | — |
| birth_date | date | Yes | — |
| push_opted_in | boolean | No | false |
| referral_code | text | Yes | — |
| medical_exception_approved | boolean | No | false |

## clinic_policies

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| artist_profile_id | uuid | No | — |
| content_he | text | No | ''::text |
| content_en | text | No | ''::text |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

## clinic_policy_master

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| content_he | text | No | ''::text |
| content_en | text | No | ''::text |
| updated_at | timestamp with time zone | No | now() |

## faqs

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| question_he | text | No | — |
| question_en | text | No | ''::text |
| answer_he | text | No | — |
| answer_en | text | No | ''::text |
| sort_order | integer | No | 0 |
| is_active | boolean | No | true |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |
| category | text | No | 'אפליקציית הלקוחות'::text |

## form_links

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| code | text | No | substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 8) |
| artist_id | uuid | No | — |
| client_name | text | No | ''::text |
| client_phone | text | Yes | ''::text |
| logo_url | text | Yes | ''::text |
| instagram_handle | text | Yes | ''::text |
| artist_phone | text | Yes | ''::text |
| created_at | timestamp with time zone | No | now() |
| treatment_type | text | Yes | ''::text |
| include_policy | boolean | Yes | true |
| client_id | uuid | Yes | — |
| artist_name | text | Yes | ''::text |
| is_completed | boolean | No | false |
| form_token | uuid | No | gen_random_uuid() |
| is_token_used | boolean | No | false |

## healing_phases

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| treatment_type | text | No | — |
| day_start | integer | No | — |
| day_end | integer | No | — |
| title_he | text | No | — |
| title_en | text | No | — |
| icon | text | No | '💧'::text |
| severity | text | No | 'medium'::text |
| steps_he | ARRAY | No | '{}'::text[] |
| steps_en | ARRAY | No | '{}'::text[] |
| sort_order | integer | No | 0 |
| updated_at | timestamp with time zone | No | now() |
| image_url | text | Yes | — |

## health_declarations

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| created_at | timestamp with time zone | No | now() |
| client_id | uuid | No | — |
| form_data | jsonb | No | '{}'::jsonb |
| signature_svg | text | Yes | — |
| is_signed | boolean | No | false |
| consent_accepted_at | timestamp with time zone | Yes | — |
| medical_consent_at | timestamp with time zone | Yes | — |

## health_questions

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| question_he | text | No | — |
| question_en | text | No | ''::text |
| risk_level | text | No | 'green'::text |
| icon | text | No | '❓'::text |
| has_detail_field | boolean | No | false |
| detail_placeholder_he | text | Yes | ''::text |
| detail_placeholder_en | text | Yes | ''::text |
| sort_order | integer | No | 0 |
| is_active | boolean | No | true |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

## images_metadata

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| artist_profile_id | uuid | No | — |
| storage_path | text | No | — |
| category | text | No | 'general'::text |
| label | text | Yes | — |
| created_at | timestamp with time zone | No | now() |
| client_id | text | Yes | — |

## message_templates

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| template_key | text | No | — |
| label | text | No | — |
| default_text | text | No | ''::text |
| placeholders | ARRAY | No | '{}'::text[] |
| updated_at | timestamp with time zone | No | now() |

## portfolio_images

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| artist_profile_id | uuid | No | — |
| image_url | text | No | — |
| category | text | No | 'brows'::text |
| is_public | boolean | No | true |
| created_at | timestamp with time zone | No | now() |
| base64_data | text | Yes | — |

## pricing_features

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| key | text | No | — |
| name_en | text | No | ''::text |
| name_he | text | No | ''::text |
| is_active | boolean | No | true |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

## pricing_plan_features

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| plan_id | uuid | No | — |
| feature_id | uuid | No | — |
| created_at | timestamp with time zone | No | now() |

## pricing_plans

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| slug | text | No | — |
| name_en | text | No | — |
| name_he | text | No | — |
| price_monthly | numeric | No | 0 |
| currency | text | No | 'USD'::text |
| is_highlighted | boolean | No | false |
| badge_en | text | Yes | — |
| badge_he | text | Yes | — |
| features_en | ARRAY | No | '{}'::text[] |
| features_he | ARRAY | No | '{}'::text[] |
| cta_en | text | No | 'Get Started'::text |
| cta_he | text | No | 'התחילי עכשיו'::text |
| sort_order | integer | No | 0 |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |
| price_usd | numeric | No | 0 |
| total_promo_spots | integer | No | 0 |
| stripe_price_id | text | Yes | — |
| feature_keys | ARRAY | No | '{}'::text[] |
| original_price_monthly | numeric | No | 0 |
| original_price_usd | numeric | No | 0 |

## products

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| name | text | No | — |
| price | text | No | — |
| emoji | text | No | '🛍️'::text |
| url | text | Yes | ''::text |
| is_global | boolean | No | false |
| artist_profile_id | uuid | Yes | — |
| created_at | timestamp with time zone | No | now() |
| description | text | Yes | ''::text |

## profiles

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| full_name | text | Yes | — |
| studio_name | text | Yes | — |
| email | text | Yes | — |
| subscription_tier | text | No | 'lite'::text |
| subscription_status | text | No | 'trial'::text |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |
| logo_url | text | Yes | — |
| has_health_form_addon | boolean | No | false |
| referral_code | text | Yes | — |
| referral_credit | numeric | Yes | 0 |
| business_phone | text | Yes | ''::text |
| instagram_url | text | Yes | ''::text |
| facebook_url | text | Yes | ''::text |
| waze_address | text | Yes | ''::text |
| has_whatsapp_automation | boolean | No | false |
| referred_by_profile_id | uuid | Yes | — |
| promo_code_used | text | Yes | — |
| promo_tag | text | Yes | — |
| onboarding_checklist_state | jsonb | No | '{}'::jsonb |
| onboarding_checklist_dismissed | boolean | No | false |

## promo_codes

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| code | text | No | — |
| code_type | text | No | 'academy'::text |
| label | text | No | ''::text |
| discount_percent | integer | Yes | 0 |
| is_active | boolean | No | true |
| max_uses | integer | Yes | — |
| current_uses | integer | No | 0 |
| created_at | timestamp with time zone | No | now() |
| discount_type | text | No | 'percentage'::text |
| free_months | integer | Yes | 0 |
| expiration_date | date | Yes | — |
| new_users_only | boolean | No | false |

## promo_settings

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| artist_profile_id | uuid | No | — |
| tag_text | text | No | 'פינוק ללקוחות חוזרות ✨'::text |
| title | text | No | 'להשלמת המראה'::text |
| description | text | No | 'אהבת את הגבות החדשות? השלימי את המראה עם פיגמנט שפתיים בטכניקת אקוורל עדינה! קבלי 15% הנחה לטיפול נוסף כלקוחה קיימת.'::text |
| button_text | text | No | 'לפרטים ותיאום 💋'::text |
| button_url | text | Yes | ''::text |
| is_enabled | boolean | No | true |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

## push_subscriptions

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| client_name | text | No | — |
| artist_profile_id | uuid | Yes | — |
| endpoint | text | No | — |
| p256dh | text | No | — |
| auth_key | text | No | — |
| treatment_type | text | Yes | — |
| treatment_start | date | No | CURRENT_DATE |
| created_at | timestamp with time zone | No | now() |
| client_id | uuid | Yes | — |

## referrals

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| referrer_profile_id | uuid | No | — |
| referred_email | text | Yes | — |
| referred_profile_id | uuid | Yes | — |
| referral_code | text | No | — |
| status | text | No | 'pending'::text |
| reward_credit | numeric | Yes | 0 |
| created_at | timestamp with time zone | No | now() |
| converted_at | timestamp with time zone | Yes | — |

## support_tickets

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| message | text | No | — |
| status | text | No | 'open'::text |
| created_at | timestamp with time zone | No | now() |

## timeline_content

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| artist_profile_id | uuid | No | — |
| step_index | integer | No | — |
| quote_he | text | No | ''::text |
| quote_en | text | No | ''::text |
| tip_he | text | No | ''::text |
| tip_en | text | No | ''::text |
| updated_at | timestamp with time zone | No | now() |

## user_feedback

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| name | text | No | — |
| email | text | No | — |
| topic | text | No | — |
| message | text | No | — |
| created_at | timestamp with time zone | No | now() |

## user_roles

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| role | USER-DEFINED | No | — |
