alter table posts add column if not exists view_count integer not null default 0;

create table if not exists post_likes (
  post_id integer not null references posts(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_likes_post_id_idx on post_likes (post_id);

create table if not exists moments (
  id serial primary key,
  user_id text not null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists moments_created_at_idx on moments (created_at desc);

create table if not exists friend_links (
  id serial primary key,
  name text not null,
  url text not null,
  description text not null default '',
  group_name text not null default '博客',
  sort_order integer not null default 0
);
