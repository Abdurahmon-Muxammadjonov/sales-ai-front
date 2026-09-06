-- SalesPulse — complete database setup for a fresh Supabase project.
--
-- Run this once in the SQL editor. It is idempotent: re-running it is safe.
--
-- Creates: the six tables, the seller_stats view, row level security for every
-- one of them, the private audio bucket, a trigger that gives each new account
-- a profile, and the function that lets a new user create their own company.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  tariff      text not null default 'start'
              check (tariff in ('start', 'pro', 'enterprise')),
  hours_limit integer not null default 10,
  hours_used  numeric not null default 0,
  created_at  timestamptz not null default now()
);

-- One row per auth user. `company_id` stays null until somebody is attached to
-- a company, which is what the app's guard screen keys off.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  full_name  text,
  role       text not null default 'viewer'
             check (role in ('owner', 'manager', 'viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.sellers (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  full_name  text not null,
  phone      text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.calls (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  seller_id    uuid references public.sellers (id) on delete set null,
  audio_path   text,
  duration_sec numeric,
  status       text not null default 'pending'
               check (status in ('pending','transcribing','analyzing','done','failed')),
  error        text,
  client_name  text,
  called_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.transcripts (
  call_id     uuid primary key references public.calls (id) on delete cascade,
  dialog      jsonb,
  full_text   text,
  words_count integer,
  talk_ratio  jsonb,
  stt_sec     numeric,
  created_at  timestamptz not null default now()
);

-- Optional: the SPIN step can be disabled, in which case no row appears here
-- and the call detail page says so rather than showing an empty panel.
create table if not exists public.analyses (
  call_id         uuid primary key references public.calls (id) on delete cascade,
  situation       integer check (situation between 0 and 10),
  problem         integer check (problem between 0 and 10),
  implication     integer check (implication between 0 and 10),
  need_payoff     integer check (need_payoff between 0 and 10),
  total_score     numeric check (total_score between 0 and 10),
  strengths       jsonb,
  mistakes        jsonb,
  missed          jsonb,
  recommendations jsonb,
  raw             jsonb,
  model           text,
  created_at      timestamptz not null default now()
);

create index if not exists calls_company_created_idx
  on public.calls (company_id, created_at desc);
create index if not exists calls_seller_idx on public.calls (seller_id);
create index if not exists sellers_company_idx on public.sellers (company_id);
create index if not exists profiles_company_idx on public.profiles (company_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Every policy below is built on this. SECURITY DEFINER so that reading the
-- caller's own profile is not itself subject to a policy, and STABLE so
-- Postgres evaluates it once per statement rather than once per row.
create or replace function public.my_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists calls_touch_updated_at on public.calls;
create trigger calls_touch_updated_at
  before update on public.calls
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
--
-- This is the only thing separating one company's calls from another's. The
-- app ships the publishable key in the browser, so these policies — not the
-- key — are the security boundary.
-- ---------------------------------------------------------------------------

alter table public.companies   enable row level security;
alter table public.profiles    enable row level security;
alter table public.sellers     enable row level security;
alter table public.calls       enable row level security;
alter table public.transcripts enable row level security;
alter table public.analyses    enable row level security;

drop policy if exists "own company"         on public.companies;
drop policy if exists "own profile"         on public.profiles;
drop policy if exists "company sellers"     on public.sellers;
drop policy if exists "company calls"       on public.calls;
drop policy if exists "company transcripts" on public.transcripts;
drop policy if exists "company analyses"    on public.analyses;

-- Read-only on purpose. Renaming a company or changing a tariff is not
-- something the browser may do; nor may anyone edit their own role.
create policy "own company" on public.companies
  for select to authenticated using (id = public.my_company_id());

create policy "own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "company sellers" on public.sellers
  for all to authenticated
  using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id());

create policy "company calls" on public.calls
  for all to authenticated
  using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id());

create policy "company transcripts" on public.transcripts
  for all to authenticated
  using (call_id in (select id from public.calls where company_id = public.my_company_id()))
  with check (call_id in (select id from public.calls where company_id = public.my_company_id()));

create policy "company analyses" on public.analyses
  for all to authenticated
  using (call_id in (select id from public.calls where company_id = public.my_company_id()))
  with check (call_id in (select id from public.calls where company_id = public.my_company_id()));

-- ---------------------------------------------------------------------------
-- seller_stats
--
-- `security_invoker = on` is load-bearing. A view otherwise runs as its owner,
-- RLS on the tables underneath is never evaluated, and every company's figures
-- become readable by anyone holding the publishable key.
-- ---------------------------------------------------------------------------

drop view if exists public.seller_stats;
create view public.seller_stats
with (security_invoker = on) as
select
  s.id                                                        as seller_id,
  s.company_id,
  s.full_name,
  count(c.id)::integer                                        as calls_count,
  avg(a.total_score)                                          as avg_score,
  avg(a.situation)                                            as avg_situation,
  avg(a.problem)                                              as avg_problem,
  avg(a.implication)                                          as avg_implication,
  avg(a.need_payoff)                                          as avg_need_payoff,
  round(coalesce(sum(c.duration_sec), 0) / 3600.0, 2)         as total_hours
from public.sellers s
left join public.calls c     on c.seller_id = s.id and c.status = 'done'
left join public.analyses a  on a.call_id = c.id
group by s.id, s.company_id, s.full_name;

-- ---------------------------------------------------------------------------
-- A profile for every new account
--
-- Without this, `auth.users` gets the account but `profiles` stays empty,
-- `my_company_id()` returns null, every policy fails, and the person sees an
-- app with nothing in it. New profiles get no company and the lowest role:
-- signing up must not by itself grant access to anyone's calls.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    'viewer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, full_name, role)
select u.id,
       nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), ''),
       'viewer'
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Self-serve onboarding
--
-- A function rather than two policies. Granting UPDATE on `profiles` wide
-- enough for someone to set their own `company_id` also lets them set it to
-- *any* company id — and every policy above trusts `my_company_id()`, so that
-- single write would hand them another business's calls and recordings. This
-- runs as its definer instead, and refuses anyone who already has a company.
-- ---------------------------------------------------------------------------

create or replace function public.create_company_for_current_user(company_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid        uuid := auth.uid();
  clean_name text := nullif(btrim(company_name), '');
  existing   uuid;
  has_row    boolean;
  new_id     uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if clean_name is null or length(clean_name) > 120 then
    raise exception 'company name must be 1-120 characters' using errcode = '22023';
  end if;

  select company_id, true into existing, has_row
    from public.profiles where id = uid;

  if coalesce(has_row, false) and existing is not null then
    raise exception 'already belongs to a company' using errcode = '42501';
  end if;

  -- Starting allowance for a self-created company. These are the only business
  -- numbers in this file; change them to match your pricing.
  insert into public.companies (name, tariff, hours_limit, hours_used)
  values (clean_name, 'start', 10, 0)
  returning id into new_id;

  insert into public.profiles (id, company_id, role)
  values (uid, new_id, 'owner')
  on conflict (id) do update
    set company_id = excluded.company_id,
        role       = excluded.role;

  return new_id;
end;
$$;

revoke all on function public.create_company_for_current_user(text) from public, anon;
grant execute on function public.create_company_for_current_user(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Audio storage
--
-- Private bucket. Files are laid out as <company_id>/<call_id>.mp3, so the
-- first path segment is what decides who may read a recording. The processing
-- API writes here with the secret key and bypasses this policy.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('call-audio', 'call-audio', false)
on conflict (id) do nothing;

drop policy if exists "company audio read" on storage.objects;
create policy "company audio read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'call-audio'
    and (storage.foldername(name))[1] = public.my_company_id()::text
  );
