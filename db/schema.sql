-- ============================================================================
-- Digital Heroes — database schema (PostgreSQL / Supabase)
-- Run this once in the Supabase SQL editor of a NEW project.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- charities
create table if not exists charities (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  category      text not null default 'General',
  tagline       text,
  description   text,
  image_url     text,
  hero_url      text,
  events        jsonb not null default '[]'::jsonb,   -- upcoming golf days etc.
  featured      boolean not null default false,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- -------------------------------------------------------------------- users
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text not null unique,
  password_hash   text not null,
  role            text not null default 'user' check (role in ('user','admin')),
  phone           text,
  charity_id      uuid references charities(id) on delete set null,
  charity_percent numeric(5,2) not null default 10 check (charity_percent between 10 and 100),
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------ subscriptions
create table if not exists subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references users(id) on delete cascade,
  plan                 text not null check (plan in ('monthly','yearly')),
  amount               numeric(12,2) not null,            -- amount charged, INR
  status               text not null default 'active'
                       check (status in ('active','cancelled','expired')),
  cancel_at_period_end boolean not null default false,
  provider             text not null default 'demo',      -- 'stripe' | 'demo'
  provider_ref         text,
  started_at           timestamptz not null default now(),
  current_period_end   timestamptz not null,
  cancelled_at         timestamptz,
  created_at           timestamptz not null default now()
);
create index if not exists idx_subs_user on subscriptions(user_id);
create index if not exists idx_subs_status on subscriptions(status, current_period_end);

-- ------------------------------------------------------------------- scores
-- Stableford points, 1-45. Only the latest five per user are ever retained.
create table if not exists scores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  score      integer not null check (score between 1 and 45),
  played_on  date not null,
  created_at timestamptz not null default now(),
  unique (user_id, played_on)
);
create index if not exists idx_scores_user_date on scores(user_id, played_on desc);

-- -------------------------------------------------------------------- draws
create table if not exists draws (
  id              uuid primary key default gen_random_uuid(),
  period          text not null unique,                   -- 'YYYY-MM'
  method          text not null default 'random' check (method in ('random','algorithmic')),
  winning_numbers integer[] not null default '{}',
  status          text not null default 'simulated' check (status in ('simulated','published')),
  prize_pool      numeric(14,2) not null default 0,
  rollover_in     numeric(14,2) not null default 0,
  rollover_out    numeric(14,2) not null default 0,
  entrant_count   integer not null default 0,
  stats           jsonb not null default '{}'::jsonb,
  draw_date       date not null,
  published_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------- draw entries
create table if not exists draw_entries (
  id         uuid primary key default gen_random_uuid(),
  draw_id    uuid not null references draws(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  numbers    integer[] not null,                           -- the player's five scores
  matched    integer not null default 0,
  created_at timestamptz not null default now(),
  unique (draw_id, user_id)
);
create index if not exists idx_entries_user on draw_entries(user_id);

-- ----------------------------------------------------------------- winnings
create table if not exists winnings (
  id                  uuid primary key default gen_random_uuid(),
  draw_id             uuid not null references draws(id) on delete cascade,
  user_id             uuid not null references users(id) on delete cascade,
  entry_id            uuid references draw_entries(id) on delete set null,
  tier                integer not null check (tier in (3,4,5)),
  amount              numeric(14,2) not null,
  verification_status text not null default 'pending'
                      check (verification_status in ('pending','submitted','approved','rejected')),
  proof_url           text,                                -- data URL of the uploaded screenshot
  proof_note          text,
  reviewed_by         uuid references users(id) on delete set null,
  reviewed_at         timestamptz,
  review_note         text,
  payment_status      text not null default 'pending' check (payment_status in ('pending','paid')),
  paid_at             timestamptz,
  payout_ref          text,
  created_at          timestamptz not null default now(),
  unique (draw_id, user_id)
);
create index if not exists idx_winnings_user on winnings(user_id);

-- ---------------------------------------------------- charity contributions
create table if not exists charity_contributions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  charity_id      uuid references charities(id) on delete set null,
  subscription_id uuid references subscriptions(id) on delete set null,
  amount          numeric(12,2) not null,
  percent         numeric(5,2) not null,
  source          text not null default 'subscription' check (source in ('subscription','donation')),
  period          text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_contrib_charity on charity_contributions(charity_id);

-- ----------------------------------------------------------------- settings
create table if not exists settings (
  key   text primary key,
  value jsonb not null
);

insert into settings (key, value) values
  ('prize_pool_percent', '30'::jsonb),
  ('draw_method',        '"random"'::jsonb),
  ('plan_prices',        '{"monthly": 499, "yearly": 4999}'::jsonb)
on conflict (key) do nothing;

-- ------------------------------------------------------------------- views
create or replace view active_subscriptions as
  select * from subscriptions
  where status = 'active' and current_period_end > now();
