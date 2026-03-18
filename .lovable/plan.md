

## Plan: Create Test User

**Goal:** Add a test user with credentials `lior@gmail.com` / `lior123456` to the database.

### Implementation

Run a single database migration that:

1. Inserts into `auth.users` with email `lior@gmail.com`, bcrypt-hashed password `lior123456`, and `email_confirmed_at` set (so no email verification needed)
2. Inserts into `public.profiles` with default `lite` tier, `trial` status
3. Inserts into `public.user_roles` with the default `user` role
4. Uses idempotent check (skip if email already exists) — same pattern as the existing `seed_mock_users` function

