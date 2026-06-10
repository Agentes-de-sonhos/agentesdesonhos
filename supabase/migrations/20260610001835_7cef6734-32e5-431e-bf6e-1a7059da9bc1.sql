create extension if not exists unaccent;
create extension if not exists pg_trgm;

create table if not exists public.cities (
  id bigint primary key,
  name text not null,
  name_ascii text not null,
  country text not null,
  iso2 text,
  iso3 text,
  admin_name text,
  capital text,
  population bigint,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

grant select on public.cities to anon, authenticated;
grant all on public.cities to service_role;

alter table public.cities enable row level security;

drop policy if exists "cities_public_read" on public.cities;
create policy "cities_public_read" on public.cities for select to anon, authenticated using (true);

drop policy if exists "cities_admin_write" on public.cities;
create policy "cities_admin_write" on public.cities for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Immutable wrapper around unaccent for index expressions
create or replace function public.immutable_unaccent(text)
returns text language sql immutable parallel safe as $$
  select public.unaccent('public.unaccent', $1)
$$;

create index if not exists cities_name_ascii_lower_idx
  on public.cities (lower(name_ascii) text_pattern_ops);

create index if not exists cities_name_unaccent_lower_idx
  on public.cities (lower(public.immutable_unaccent(name)) text_pattern_ops);

create index if not exists cities_name_ascii_trgm_idx
  on public.cities using gin (lower(name_ascii) gin_trgm_ops);

create index if not exists cities_population_idx
  on public.cities (population desc nulls last);

create or replace function public.search_cities(q text, max_results int default 10)
returns table (
  id bigint,
  name text,
  country text,
  admin_name text,
  iso2 text,
  lat double precision,
  lng double precision,
  population bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with nq as (
    select lower(public.immutable_unaccent(coalesce(q,''))) as t
  )
  select c.id, c.name, c.country, c.admin_name, c.iso2, c.lat, c.lng, c.population
  from public.cities c, nq
  where length(nq.t) >= 2
    and (
      lower(c.name_ascii) like nq.t || '%'
      or lower(public.immutable_unaccent(c.name)) like nq.t || '%'
      or lower(c.name_ascii) like '% ' || nq.t || '%'
    )
  order by
    case when lower(c.name_ascii) = nq.t then 0
         when lower(c.name_ascii) like nq.t || '%' then 1
         else 2 end,
    coalesce(c.population, 0) desc,
    c.name asc
  limit greatest(1, least(coalesce(max_results, 10), 25));
$$;

grant execute on function public.search_cities(text, int) to anon, authenticated;