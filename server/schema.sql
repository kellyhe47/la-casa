-- La Casa storage schema (PRD §4.1). Applied on boot by the pg store only.

create table if not exists events (
  id          bigserial primary key,
  ts          timestamptz not null default now(),
  learner_id  uuid,
  type        text not null,
  payload     jsonb not null
);

create index if not exists events_ts_idx on events (ts desc);
create index if not exists events_type_ts_idx on events (type, ts desc);

create table if not exists asset_cache (
  key         text primary key,
  kind        text not null,
  mime        text not null,
  bytes       bytea not null,
  created_at  timestamptz not null default now()
);

create table if not exists learners (
  id          uuid primary key,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

create table if not exists learner_state (
  learner_id  uuid primary key references learners(id),
  graph       jsonb not null,
  independence int not null,
  updated_at  timestamptz not null default now()
);
