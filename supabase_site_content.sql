create table if not exists public.site_content (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

grant select, insert, update, delete on public.site_content to service_role;

create index if not exists site_content_updated_at_idx on public.site_content (updated_at desc);
