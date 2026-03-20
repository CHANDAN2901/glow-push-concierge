# GlowPush — Complete Feature & UX Flow Guide

## 🎯 What Is GlowPush?

A SaaS platform for **PMU (Permanent Makeup) artists** to manage clients, automate aftercare, and grow their business. Three user roles: **Artist**, **Client**, **Super Admin**.

---

![Client Experience Payment-2026-03-20-083135.svg](attachment:b65d0936-77b5-41eb-9ba9-fa849d58bb81:Client_Experience_Payment-2026-03-20-083135.svg)

---

## 1. 🔐 Authentication (`/auth`)

- Email + password signup/login (email verification required)
- Password reset flow via `/reset-password`
- On first login → profile auto-created in `profiles` table with `subscription_tier: lite`
- Role assigned in `user_roles` table (admin or user)

---

## 2. 🏠 Marketing Landing Page (`/`)

- Public-facing homepage with hero, features grid, pricing preview, FAQ accordion, and footer
- Hebrew-first RTL design with English fallback
- CTA buttons route to `/auth` (signup) or `/pricing`

---

## 3. 👩‍🎨 Artist Dashboard (`/artist`)

The main workspace. Uses a **sidebar navigation** (`AdminSidebar`) with these sections:

### 3a. 📋 Dashboard

- Overview stats: total clients, upcoming appointments, recent activity
- **Onboarding Checklist** (`OnboardingWizard`) — guided first-time setup steps (add logo, create first client, etc.), dismissible

### 3b. 👥 Client Management

- **Client list** with search, filter by treatment type
- **Add Client flow** — 4 action buttons in vertical stack:
    1. **Save & Send Link** → creates client + generates WhatsApp message with health form link
    2. **Save & Fill Here** → opens health declaration form in-app
    3. **Save & Copy Link** → copies form link to clipboard
    4. **Save Only** → just saves the client record
- All buttons have `isSubmitting` guard to prevent duplicates
- **Client Import** (`ClientImportDialog`) — bulk CSV import
- **Client Profile** (`/client-profile`) — view/edit individual client details, treatment history, photos

### 3c. 📅 Smart Calendar (`SmartCalendar`)

- Appointment scheduling with date picker
- Fields: client name, phone, treatment type (eyebrows/lips/eyeliner), date, time
- Auto-link to existing clients
- Status tracking: scheduled → completed → cancelled

### 3d. 📝 Health Declaration System

**Artist side:**

- **Health Questions Editor** (`HealthQuestionsEditor`) — customize which questions appear
- Two layers: master clinical list (Super Admin) + artist overrides/custom questions
- **Clinic Policy Editor** (`ClinicPolicyEditor`) — write clinic policy text (Hebrew + English)
- **Preview mode** — bronze exit banner, validation bypass, debug button for success screen

**Client side** (`/health-declaration`, `/f/:code`):

- 3-step form with sticky footer navigation:
    1. **Personal info** — name, phone, treatment type
    2. **Health questionnaire** — dynamic questions with risk indicators (green/yellow/red)
    3. **Consent & Signature** — digital signature pad, clinic policy acknowledgment
- Premium landing page with Ministry of Health trust indicators, studio branding (3x logo with gold glow)
- Post-submission → **VIP Pass success view** with care instructions and calendar integration
- Form accessed via short link (`/f/:code`) generated per client

### 3e. 💬 Message Automation

- **Message Templates** (`MessageTemplateSettings`) — admin-managed WhatsApp message templates with placeholders (`{client_name}`, `{artist_name}`, etc.)
- **Auto-send toggle** on appointments — sends health form link via WhatsApp automatically
- **Message Editor** (`MessageEditor`) — preview and customize messages before sending
- **Message Preview Modal** — shows exactly what client will receive

### 3f. 🩹 Healing Journey / Aftercare

**Artist management:**

- **Timeline Editor** (`/admin/timeline`) — define healing phases per treatment type (e.g., "Days 1-3: Initial Healing")
- Each phase: title (HE/EN), day range, severity level, icon, image, step-by-step instructions
- **Timeline Content Editor** (`/admin/timeline-content`) — add daily tips and motivational quotes per step
- **Timeline Settings** (`/admin/timeline-settings`) — advanced journey configuration (Pro+ feature)
- **Aftercare Editor** (`/admin/aftercare`) — manage aftercare notification messages

**Client side** (`/c/:clientId`):

- **Healing Timeline Carousel** (`HealingTimelineCarousel`) — swipeable day-by-day cards showing:
    - Current phase name + severity badge
    - Step-by-step care instructions
    - Phase image (from DB or fallback sprite)
    - Daily tip + motivational quote
- **Photo Timeline** (`ClientPhotoTimeline`) — upload healing progress photos tagged by day
- **Photo Gallery** (`ClientGallery`, `ClientMyPhotos`) — view before/after photos shared by artist
- **Push Notifications** — opt-in via PWA, receive daily aftercare reminders via `aftercare-cron` edge function

### 3g. 🖼️ Gallery & Portfolio

- **Client Gallery** (`ClientSharedGallery`) — artist shares specific photos with specific clients
- **Portfolio Manager** (`PortfolioManager`) — manage public portfolio images by category (brows/lips/eyeliner)
- **Portfolio Gallery** (`PortfolioGallery`) — public-facing portfolio display
- **Before & After Collage** — AI-powered branded comparison photos (Pro+ feature)
- **Dual Photo Gallery** (`DualPhotoGallery`) — side-by-side comparison view
- **Image Editor** (`ImageEditorDialog`) — crop/edit uploaded images

### 3h. ✨ AI Magic Tools (Pro+ feature)

- **AI Captions** (`ai-caption` edge function) — generate social media captions from photos
- **AI Compare** (`ai-compare` edge function) — intelligent before/after analysis
- **AI Collage** (`ai-collage` edge function) — auto-generate branded collage layouts
- **AI Align** (`ai-align` edge function) — align before/after photos for perfect comparison
- **Voice Treatment Notes** (`VoiceTreatmentRecord`) — record voice → transcribe via `transcribe-treatment-audio` → structure via `structure-treatment-notes`

### 3i. 💳 Digital Business Card (`/digital-card`, Pro+ feature)

- Luxury shareable digital card with:
    - Artist name, studio name, logo
    - Instagram, Facebook, Waze links
    - Phone/WhatsApp contact
    - Portfolio preview
- Shareable via link or QR code

### 3j. ⚙️ Settings

- Profile editing (name, studio, phone, social links, logo upload)
- **Promo Settings** (`PromoSettings`) — configure upsell banner shown to clients
- **Referral System** (`ReferralTab`) — generate referral codes, track conversions, earn credits
- **Coupon Manager** (`CouponManager`) — create/manage discount coupons

### 3k. 📢 Announcements

- View system-wide announcements from Super Admin
- Displayed as banners/notifications in dashboard

---

## 4. 📱 Client Experience (`/c/:clientId` or `/client`)

Accessed via short link sent by artist — **no login required** (anon access):

- **Healing Journey Timeline** — the core client-facing feature (see 3f above)
- **Notification Center** (`ClientNotificationCenter`) — in-app notification feed
- **Shared Gallery** — photos shared by their artist
- **My Photos** — self-uploaded healing progress photos
- **Product Recommendations** — artist's recommended aftercare products with purchase links
- **Birthday Wishes** (`BirthdayWishDialog`) — automated birthday greeting
- **Push Notification Opt-in** — subscribe to daily healing reminders

---

## 5. 👑 Super Admin (`/super-admin`)

Only for users with `admin` role:

- **User Management** — view all registered artists, their tiers, subscription status
- **Pricing Editor** (`AdminPricingEditor`) — manage plans (Pro/Elite/VIP), prices, feature keys, badges
- **Feature Management** — toggle feature availability per plan via `pricing_features` + `pricing_plan_features` tables
- **Healing Phase Templates** — master templates cloned to each client via `clone_healing_phases_for_client` RPC
- **Health Questions** — master clinical question bank
- **Clinic Policy Master** — default policy text for all artists
- **Message Templates** — manage WhatsApp template library
- **Announcements** — create/manage system-wide announcements
- **FAQ Manager** (`/admin/faq-manager`) — manage landing page FAQ content
- **Promo Codes** — create discount/free-month promo codes

---

## 6. 💰 Subscription & Feature Gating

| Tier | DB Slug | Price | Key Features |
| --- | --- | --- | --- |
| **Pro – Basic** | `lite` / `pro` | Free | Clients, Calendar, Auto-messages, Aftercare |
| **Elite – Professional** | `professional` / `elite` | ₪79/mo | + Health Declaration, AI Magic, Client Gallery, Collage, Digital Card, Portfolio, Voice Notes |
| **VIP – Founders** | `master` / `vip-3year` | ₪149/mo | + WhatsApp Automation, White Label, CSV Export, Growth Engine, Referrals, Bonus Center |
- `FeatureGate` component wraps UI — shows lock/upgrade prompt for gated features
- `useFeatureAccess` hook reads live `feature_keys` from `pricing_plans` table
- `ProtectedRoute` blocks route-level access
- **Dev Switcher** (`DevSwitcher`) — tier override for testing/impersonation

---

## 7. 🔔 Push Notifications (PWA)

- Service worker (`custom-sw.js`) handles web push
- `generate-vapid-keys` / `get-vapid-key` edge functions manage VAPID keys
- `send-push` edge function delivers notifications
- `aftercare-cron` edge function — scheduled daily push reminders to clients based on their treatment date + healing phase
- `birthday-greetings` edge function — automated birthday notifications

---

## 8. 🌐 Internationalization

- Full Hebrew (RTL) + English support via `I18nProvider` + `i18n.ts`
- All DB content stored in dual columns (`title_he`/`title_en`, `name_he`/`name_en`, etc.)
- Auto-detect browser language, manual toggle available

---

## 9. 📄 Legal Pages

- `/privacy` — Privacy Policy
- `/terms` — Terms of Service
- `/refund-policy` — Refund Policy
- `/legal` — Legal overview

---

## 10. 🛠️ Edge Functions (Backend)

| Function | Purpose |
| --- | --- |
| `aftercare-cron` | Daily healing reminder push notifications |
| `birthday-greetings` | Automated birthday messages |
| `ai-caption` | Generate social captions from photos |
| `ai-compare` | Before/after AI analysis |
| `ai-collage` | Branded collage generation |
| `ai-align` | Photo alignment for comparisons |
| `transcribe-treatment-audio` | Voice → text transcription |
| `structure-treatment-notes` | AI-structure raw treatment notes |
| `submit-health-declaration` | Process signed health forms |
| `upload-client-photo` | Handle client photo uploads |
| `send-push` | Deliver web push notifications |
| `generate-vapid-keys` / `get-vapid-key` | VAPID key management |
| `delete-account` | GDPR-compliant account deletion |

---

This covers every feature in the codebase and how users interact with it end-to-end.