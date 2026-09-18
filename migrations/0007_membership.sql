alter table posts add column if not exists access_mode text not null default 'public';
alter table posts add column if not exists exclusive_days integer not null default 7;

create index if not exists posts_access_mode_idx on posts (access_mode);

create table if not exists subscriptions (
  id serial primary key,
  user_id text not null unique,
  plan text not null,
  status text not null default 'active',
  source text not null default 'checkout',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_status_idx on subscriptions (status, expires_at);

create table if not exists redeem_codes (
  id serial primary key,
  code text not null unique,
  plan text not null default 'yearly',
  days integer not null default 365,
  max_uses integer not null default 1,
  used_count integer not null default 0,
  note text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists redeem_code_uses (
  id serial primary key,
  code_id integer not null references redeem_codes(id) on delete cascade,
  user_id text not null,
  used_at timestamptz not null default now(),
  unique (code_id, user_id)
);
