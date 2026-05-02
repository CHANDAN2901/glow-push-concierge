# GlowPush — Codebase Navigation Guide

Quick reference for locating code without re-reading the whole codebase.

---

## Routing & App Entry

| What | File |
|------|------|
| Route definitions | `src/App.tsx` |
| Role-based redirect after login | `src/lib/role-routing.ts` |
| Auth guard (require login) | `src/components/ProtectedRoute.tsx` |
| Admin-only guard | `src/components/RequireAdmin.tsx` |

---

## Pages

| Route | File | Notes |
|-------|------|-------|
| `/` | `src/pages/Index.tsx` | Redirects to landing or dashboard |
| `/` (marketing) | `src/pages/MarketingLanding.tsx` | Public homepage |
| `/auth` | `src/pages/Auth.tsx` | Login / signup |
| `/reset-password` | `src/pages/ResetPassword.tsx` | |
| `/artist` | `src/pages/ArtistDashboard.tsx` | **Main artist workspace** (~3200 lines) |
| `/client-profile` | `src/pages/ClientProfile.tsx` | Artist views one client's full profile |
| `/c/:clientId` | `src/pages/ClientHome.tsx` | **Client-facing healing dashboard** |
| `/health-declaration` | `src/pages/HealthDeclarationPage.tsx` | Health form (direct URL) |
| `/f/:code` | `src/pages/FormLinkResolver.tsx` | Short-link → resolves to health form |
| `/pricing` | `src/pages/Pricing.tsx` | Subscription plans |
| `/digital-card` | `src/pages/DigitalCard.tsx` | Artist's shareable business card |
| `/super-admin` | `src/pages/SuperAdmin.tsx` | Super admin panel |
| `/admin/timeline` | inside `ArtistDashboard.tsx` | Healing phase editor |
| `/admin/faq-manager` | `src/pages/FaqManager.tsx` | |
| `/privacy`, `/terms`, `/refund-policy`, `/legal` | `src/pages/` | Legal pages |

---

## Key Components — Where Logic Lives

### Health Declaration
| What | File |
|------|------|
| 3-step form UI + submit | `src/components/HealthDeclaration.tsx` |
| Page wrapper + token validation + push subscribe | `src/pages/HealthDeclarationPage.tsx` |
| Artist previews client's submitted form | `src/components/DeclarationViewer.tsx` |
| Read-only view on client dashboard | `src/components/HealthDeclarationReadOnly.tsx` |
| Artist customises questions | `src/components/HealthQuestionsEditor.tsx` |
| Artist writes clinic policy | `src/components/ClinicPolicyEditor.tsx` |
| Client acknowledges policy before form | `src/components/ClinicPolicyAcknowledgment.tsx` |
| **Edge function: save + burn token** | `supabase/functions/submit-health-declaration/index.ts` |

### Push Notifications
| What | File |
|------|------|
| Subscribe browser to push (full flow) | `src/lib/push-utils.ts` → `subscribeToPush()` |
| Fire a local SW notification | `src/lib/sendLocalPushNotification.ts` |
| Fire a server-side push (VAPID) | `src/lib/sendServerPushNotification.ts` |
| "Declaration received" notification to client | `src/pages/ClientHome.tsx` → `buildFirstDashboardNotificationText()` + effect ~line 574 |
| Artist dashboard realtime toast on new declaration | `src/pages/ArtistDashboard.tsx` ~line 609 |
| Daily aftercare push (cron) | `supabase/functions/aftercare-cron/index.ts` |
| Birthday push | `supabase/functions/birthday-greetings/index.ts` |
| VAPID key management | `supabase/functions/get-vapid-key/`, `generate-vapid-keys/` |
| Deliver push via edge | `supabase/functions/send-push/index.ts` |

### Healing Journey
| What | File |
|------|------|
| Client swipeable day-cards | `src/components/HealingTimelineCarousel.tsx` |
| Fetch healing phases for a client | `src/hooks/useClientHealingPhases.ts` |
| Artist edits phases/timeline | `src/components/admin/TimelineEditor.tsx` |
| Artist edits tips/quotes per step | `src/components/admin/TimelineContentEditor.tsx` |
| Client photo upload + day tagging | `src/components/ClientPhotoTimeline.tsx` |
| Edge function: upload photo | `supabase/functions/upload-client-photo/index.ts` |

### Client Dashboard (`/c/:clientId`)
| What | File |
|------|------|
| Full page | `src/pages/ClientHome.tsx` |
| Client identity from localStorage | `ClientHome.tsx` top-level consts (`LS_CLIENT_ID`, `LS_ARTIST_ID`, etc.) |
| Artist name resolution (race condition fixed) | `ClientHome.tsx` → `clientDbLoaded` flag ~line 368 |
| Push subscription on client side | `src/hooks/usePushSubscription` (inline in ClientHome) |
| In-app notification feed | `src/components/ClientNotificationCenter.tsx` |
| Shared gallery | `src/components/ClientSharedGallery.tsx` |

### Artist Dashboard (`/artist`)
| What | File |
|------|------|
| Entire file | `src/pages/ArtistDashboard.tsx` |
| Artist name state (also saved to localStorage) | `ArtistDashboard.tsx` ~line 288 — `artistName` / `gp-artist-name` |
| Add client flow (4 buttons) | `ArtistDashboard.tsx` → `NewClientDispatch.tsx` |
| Build health form short link | `ArtistDashboard.tsx` ~line 946 |
| Sidebar nav | `src/components/AdminSidebar.tsx` |
| Calendar/appointments | `src/components/SmartCalendar.tsx` |
| Message editor | `src/components/MessageEditor.tsx` |
| Voice treatment notes | `src/components/VoiceTreatmentRecord.tsx` |
| AI tools section | `src/components/AiMagicSection.tsx` |

### Feature Gating & Subscriptions
| What | File |
|------|------|
| `<FeatureGate>` wrapper component | `src/components/FeatureGate.tsx` |
| `useFeatureAccess` hook | `src/hooks/useFeatureAccess.ts` |
| Tier slugs + feature key constants | `src/lib/featureKeys.ts` |
| Plan/price config | `src/lib/subscriptionConfig.ts` |
| Admin pricing editor | `src/components/AdminPricingEditor.tsx` |
| Dev tier switcher (testing) | `src/components/DevSwitcher.tsx` |

### Payments (Tranzilla)
| What | File |
|------|------|
| Create payment session | `supabase/functions/create-payment-session/index.ts` |
| Webhook handler | `supabase/functions/tranzilla-webhook/index.ts` |
| Recurring charge | `supabase/functions/tranzilla-recurring-charge/index.ts` |
| Payment history page | `src/pages/PaymentHistory.tsx` |

### AI Features
| What | File |
|------|------|
| Social caption generation | `supabase/functions/ai-caption/index.ts` |
| Before/after analysis | `supabase/functions/ai-compare/index.ts` |
| Collage generation | `supabase/functions/ai-collage/index.ts` |
| Photo alignment | `supabase/functions/ai-align/index.ts` |
| Voice → text | `supabase/functions/transcribe-treatment-audio/index.ts` |
| Structure raw notes | `supabase/functions/structure-treatment-notes/index.ts` |

---

## Shared Utilities

| What | File |
|------|------|
| Supabase client | `src/integrations/supabase/client.ts` |
| All DB types | `src/integrations/supabase/types.ts` |
| i18n strings (HE/EN) | `src/lib/i18n.ts` |
| WhatsApp message builders | `src/lib/whatsapp-messages.ts` |
| Treatment type options | `src/lib/treatment-options.ts` |
| Edge function error parsing | `src/lib/edge-function-errors.ts` |
| Impersonation (admin as artist) | `src/lib/impersonation.ts` |
| Admin auth check | `src/lib/admin-auth.ts` |
| Branding constants | `src/lib/branding.ts` |

---

## Database Tables (key ones)

| Table | Purpose |
|-------|---------|
| `profiles` | Artist profiles (name, logo, social links) |
| `clients` | Artist's clients (linked via `artist_id`) |
| `appointments` | Scheduled appointments |
| `health_declarations` | Submitted health forms |
| `form_links` | Single-use tokenised form links |
| `push_subscriptions` | Client push endpoints (endpoint, p256dh, auth_key, artist_profile_id) |
| `healing_phases` | Per-client healing phase data |
| `pricing_plans` | Subscription tiers + feature keys |
| `pricing_features` | Feature definitions |
| `user_roles` | Maps user → admin/user role |
| `artist_message_settings` | Per-artist WhatsApp template overrides |
| `announcements` | Super-admin broadcast messages |

---

## Common Fix Patterns

**Notification shows wrong artist name**
→ `src/pages/ClientHome.tsx` — check `artistDisplayName` resolution, `clientDbLoaded` guard, `LS_ARTIST_ID` localStorage key.

**Health form link not working / token invalid**
→ `src/pages/FormLinkResolver.tsx` → `supabase/functions/submit-health-declaration/index.ts` — check `form_links` table, `is_token_used`, `artist_id` mismatch.

**Push notification not delivered**
→ `src/lib/push-utils.ts` (subscribe) → `supabase/functions/send-push/` (deliver) → `push_subscriptions` table (stored endpoint).

**Feature locked for wrong tier**
→ `src/lib/featureKeys.ts` + `src/hooks/useFeatureAccess.ts` + `pricing_plan_features` table.

**Artist name wrong in WhatsApp messages**
→ `src/components/SmartCalendar.tsx` ~line 387 — `artistDisplayName` comes from `localStorage['gp-artist-name']` set in `ArtistDashboard.tsx` ~line 532.

**Realtime toast on artist dashboard**
→ `src/pages/ArtistDashboard.tsx` ~line 609 — Supabase realtime channel `health-declarations-realtime`.

**i18n / translation missing**
→ `src/lib/i18n.ts` — all string keys in one object, `{ en: '...', he: '...' }` per key.
