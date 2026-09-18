create table if not exists api_tokens (
  id serial primary key,
  user_id text not null,
  name text not null default 'Obsidian',
  token_hash text not null unique,
  prefix text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists api_tokens_user_id_idx on api_tokens (user_id);
