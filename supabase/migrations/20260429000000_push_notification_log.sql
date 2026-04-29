-- Track which aftercare push notifications have been successfully sent per client per day.
-- Used by aftercare-cron to avoid re-sending and to catch up on missed notifications.
create table if not exists push_notification_log (
  client_id uuid not null references clients(id) on delete cascade,
  day       integer not null check (day >= 0),
  sent_at   timestamptz not null default now(),
  primary key (client_id, day)
);

-- Allow the service-role to insert/select freely (used by edge functions).
alter table push_notification_log enable row level security;

create policy "service role full access"
  on push_notification_log
  using (true)
  with check (true);
