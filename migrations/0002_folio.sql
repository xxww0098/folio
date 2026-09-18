create table if not exists posts (
  id serial primary key,
  user_id text not null,
  author_name text not null default '折页编辑部',
  slug text not null unique,
  title text not null,
  excerpt text not null,
  body text not null,
  cover_image text,
  cover_alt text,
  topic text not null,
  status text not null default 'draft',
  reading_minutes integer not null default 5,
  featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_status_published_idx on posts (status, published_at desc);
create index if not exists posts_topic_idx on posts (topic);
create index if not exists posts_user_id_idx on posts (user_id);

create table if not exists comments (
  id serial primary key,
  post_id integer not null references posts(id) on delete cascade,
  user_id text not null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_id_idx on comments (post_id);
create index if not exists comments_user_id_idx on comments (user_id);
