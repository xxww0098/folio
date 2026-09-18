alter table posts add column if not exists allow_comments boolean not null default true;

alter table comments add column if not exists parent_id integer references comments(id) on delete cascade;
create index if not exists comments_parent_id_idx on comments (parent_id);

create table if not exists tags (
  id serial primary key,
  name text not null unique,
  slug text not null unique
);

create table if not exists post_tags (
  post_id integer not null references posts(id) on delete cascade,
  tag_id integer not null references tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create table if not exists photos (
  id serial primary key,
  title text not null,
  description text not null default '',
  image text not null,
  group_name text not null default '日常',
  taken_at timestamptz not null default now()
);
