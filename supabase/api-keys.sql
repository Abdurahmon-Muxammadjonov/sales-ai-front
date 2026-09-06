-- Customer-facing API keys.
--
-- Lets a company call SalesPulse from their own backend: post a recording,
-- poll for the transcript. Run after schema.sql. Idempotent.
--
-- The plaintext key is never stored and never travels to the database. The
-- browser generates it, hashes it with SHA-256, and sends only the hash. That
-- is why the key can be shown exactly once — nobody, including us, can recover
-- it afterwards. A lost key is replaced, not looked up.

create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  name         text not null,
  -- First few characters, kept in the clear so a person can tell two keys
  -- apart in the list without the secret being recoverable.
  prefix       text not null,
  key_hash     text not null unique,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null,
  last_used_at timestamptz,
  revoked_at   timestamptz
);

create index if not exists api_keys_company_idx on public.api_keys (company_id);

alter table public.api_keys enable row level security;

create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Keys are owner-only. A manager who can see every call still should not be
-- able to mint credentials that outlive their access.
drop policy if exists "owner api keys" on public.api_keys;
create policy "owner api keys" on public.api_keys
  for all to authenticated
  using (company_id = public.my_company_id() and public.my_role() = 'owner')
  with check (company_id = public.my_company_id() and public.my_role() = 'owner');

-- ---------------------------------------------------------------------------
-- What the gateway calls
--
-- These run as their definer so the gateway needs no service key at all — it
-- authenticates the caller by hash and gets back only that company's data.
-- Presenting a hash you do not have is the same problem as guessing the key.
-- ---------------------------------------------------------------------------

create or replace function public.company_for_api_key(p_key_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  update public.api_keys
     set last_used_at = now()
   where key_hash = p_key_hash
     and revoked_at is null
  returning company_id into cid;

  return cid;
end;
$$;

-- One call, one company: the key's company must own the call, or nothing comes
-- back. Shaped like GET /calls/{id}/result so the two are interchangeable.
create or replace function public.api_call_result(p_key_hash text, p_call_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cid    uuid;
  result jsonb;
begin
  select company_id into cid
    from public.api_keys
   where key_hash = p_key_hash and revoked_at is null;

  if cid is null then
    return null;
  end if;

  select jsonb_build_object(
           'call', to_jsonb(c) - 'company_id',
           'transcript', to_jsonb(t),
           'analysis', to_jsonb(a)
         )
    into result
    from public.calls c
    left join public.transcripts t on t.call_id = c.id
    left join public.analyses    a on a.call_id = c.id
   where c.id = p_call_id
     and c.company_id = cid;

  return result;
end;
$$;

revoke all on function public.company_for_api_key(text) from public;
revoke all on function public.api_call_result(text, uuid) from public;
grant execute on function public.company_for_api_key(text) to anon, authenticated;
grant execute on function public.api_call_result(text, uuid) to anon, authenticated;
