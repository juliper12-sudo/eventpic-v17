
-- EVENTPIC ONLINE V16
create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  names text not null,
  phone text,
  email text,
  wedding_date date,
  venue text,
  guests integer,
  origin text default 'Landing Page',
  source text,
  medium text,
  campaign text,
  status text not null default 'Novo lead'
    check (status in ('Novo lead','Contactado','Convertido','Fechado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weddings (
  id uuid primary key default gen_random_uuid(),
  names text not null,
  contact text,
  email text,
  wedding_date date,
  venue text,
  address text,
  guests integer,
  conditions text,
  team text,
  origin text,
  contract_date date,
  status text not null default 'Por preencher',
  notes text,
  start_time time,
  arrival_time time,
  social_permission boolean,
  crop_x numeric default 50,
  private_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.personalizations (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  original_photo_url text,
  vertical_photo_url text,
  logo_color_url text,
  logo_white_url text,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;
alter table public.weddings enable row level security;
alter table public.personalizations enable row level security;

-- Dashboard: só utilizadores autenticados.
grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.weddings to authenticated;
grant select, insert, update, delete on public.personalizations to authenticated;

create policy "staff leads" on public.leads
for all to authenticated using (true) with check (true);

create policy "staff weddings" on public.weddings
for all to authenticated using (true) with check (true);

create policy "staff personalizations" on public.personalizations
for all to authenticated using (true) with check (true);

-- Não damos leitura pública das tabelas.
revoke all on public.leads from anon;
revoke all on public.weddings from anon;
revoke all on public.personalizations from anon;

-- A Landing Page pública NÃO deve receber acesso direto geral às tabelas.
-- Na fase de ligação, o formulário chama uma função/endpoint seguro que valida
-- os campos e cria apenas um lead. O segredo administrativo fica no servidor.

-- EVENTPIC V17 — acesso ao Dashboard apenas por emails autorizados
create table if not exists public.staff_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'staff' check (role in ('admin','staff')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.staff_users enable row level security;
grant select on public.staff_users to authenticated;
create policy "staff sees own authorization" on public.staff_users
for select to authenticated using (user_id = (select auth.uid()));

-- Restringe CRM/casamentos/personalizações aos utilizadores presentes na allowlist.
drop policy if exists "staff leads" on public.leads;
drop policy if exists "staff weddings" on public.weddings;
drop policy if exists "staff personalizations" on public.personalizations;
create policy "authorized staff leads" on public.leads for all to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=(select auth.uid()) and s.active))
with check (exists(select 1 from public.staff_users s where s.user_id=(select auth.uid()) and s.active));
create policy "authorized staff weddings" on public.weddings for all to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=(select auth.uid()) and s.active))
with check (exists(select 1 from public.staff_users s where s.user_id=(select auth.uid()) and s.active));
create policy "authorized staff personalizations" on public.personalizations for all to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=(select auth.uid()) and s.active))
with check (exists(select 1 from public.staff_users s where s.user_id=(select auth.uid()) and s.active));

-- Entrada pública segura para a Landing Page (sem dar acesso anon à tabela).
create or replace function public.create_public_lead(
  p_names text, p_phone text default null, p_email text default null,
  p_wedding_date date default null, p_venue text default null, p_guests integer default null,
  p_origin text default 'Landing Page', p_source text default null,
  p_medium text default null, p_campaign text default null
) returns uuid language plpgsql security definer set search_path='' as $
declare new_id uuid;
begin
  if p_names is null or length(trim(p_names)) < 2 then raise exception 'Nome inválido'; end if;
  if length(coalesce(p_names,'')) > 160 or length(coalesce(p_phone,'')) > 40 or length(coalesce(p_email,'')) > 254 then raise exception 'Dados inválidos'; end if;
  insert into public.leads(names,phone,email,wedding_date,venue,guests,origin,source,medium,campaign,status)
  values(trim(p_names),nullif(trim(p_phone),''),nullif(trim(p_email),''),p_wedding_date,nullif(trim(p_venue),''),p_guests,coalesce(nullif(trim(p_origin),''),'Landing Page'),p_source,p_medium,p_campaign,'Novo lead') returning id into new_id;
  return new_id;
end $$;
revoke all on function public.create_public_lead(text,text,text,date,text,integer,text,text,text,text) from public;
grant execute on function public.create_public_lead(text,text,text,date,text,integer,text,text,text,text) to anon, authenticated;

create table if not exists public.meta_webhook_events (
 id bigint generated by default as identity primary key,
 leadgen_id text not null unique,
 page_id text,
 form_id text,
 raw jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.meta_webhook_events enable row level security;
revoke all on public.meta_webhook_events from anon, authenticated;

-- EVENTPIC V17 — hardening e alinhamento com o dashboard/portal

alter table public.weddings
  add column if not exists portal_status text not null default 'Por preencher',
  add column if not exists preparation_status text not null default 'Por iniciar',
  add column if not exists checklist jsonb not null default '{}'::jsonb,
  add column if not exists estimated_value numeric,
  add column if not exists personalization_approved boolean not null default false,
  add column if not exists total_value numeric,
  add column if not exists deposit_value numeric not null default 0,
  add column if not exists paid_value numeric not null default 0,
  add column if not exists payment_status text not null default 'Por pagar',
  add column if not exists personalization_preview_url text,
  add column if not exists personalization_approval_status text not null default 'Pendente',
  add column if not exists personalization_approved_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists review_requested_at timestamptz;

create index if not exists weddings_wedding_date_idx on public.weddings (wedding_date);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create unique index if not exists personalizations_wedding_id_uidx on public.personalizations (wedding_id);

create table if not exists public.wedding_timeline (
  id bigint generated by default as identity primary key,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  event_type text not null default 'system',
  title text not null,
  details text,
  created_at timestamptz not null default now()
);
create index if not exists wedding_timeline_wedding_created_idx
  on public.wedding_timeline (wedding_id, created_at desc);
alter table public.wedding_timeline enable row level security;
grant select, insert, update, delete on public.wedding_timeline to authenticated;
do $grant$
begin
  if to_regclass('public.wedding_timeline_id_seq') is not null then
    execute 'grant usage, select on sequence public.wedding_timeline_id_seq to authenticated';
  end if;
end
$grant$;
drop policy if exists "active staff manage wedding timeline" on public.wedding_timeline;
drop policy if exists "authorized staff wedding timeline" on public.wedding_timeline;
create policy "authorized staff wedding timeline" on public.wedding_timeline
for all to authenticated
using (
  exists (
    select 1 from public.staff_users s
    where s.user_id = (select auth.uid()) and s.active
  )
)
with check (
  exists (
    select 1 from public.staff_users s
    where s.user_id = (select auth.uid()) and s.active
  )
);

-- Funções públicas do portal. O token UUID funciona como credencial do convite.
create or replace function public.get_wedding_by_token(p_token uuid)
returns table (
  id uuid,
  names text,
  wedding_date date,
  venue text,
  address text,
  guests integer,
  start_time time,
  arrival_time time,
  social_permission boolean,
  crop_x numeric,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.names, w.wedding_date, w.venue, w.address, w.guests,
         w.start_time, w.arrival_time, w.social_permission, w.crop_x, w.status
  from public.weddings w
  where w.private_token = p_token
  limit 1
$$;
revoke all on function public.get_wedding_by_token(uuid) from public;
grant execute on function public.get_wedding_by_token(uuid) to anon, authenticated;

create or replace function public.submit_wedding_by_token(
  p_token uuid,
  p_names text default null,
  p_wedding_date date default null,
  p_venue text default null,
  p_address text default null,
  p_guests integer default null,
  p_start_time time default null,
  p_arrival_time time default null,
  p_social_permission boolean default null,
  p_crop_x numeric default 50
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_count integer;
begin
  if p_names is not null and (length(trim(p_names)) < 2 or length(p_names) > 160) then
    raise exception 'Nome inválido';
  end if;
  if p_guests is not null and (p_guests < 1 or p_guests > 5000) then
    raise exception 'Número de convidados inválido';
  end if;
  if p_crop_x is not null and (p_crop_x < 0 or p_crop_x > 100) then
    raise exception 'Enquadramento inválido';
  end if;

  update public.weddings w
  set names = coalesce(nullif(trim(p_names), ''), w.names),
      wedding_date = coalesce(p_wedding_date, w.wedding_date),
      venue = coalesce(nullif(trim(p_venue), ''), w.venue),
      address = coalesce(nullif(trim(p_address), ''), w.address),
      guests = coalesce(p_guests, w.guests),
      start_time = coalesce(p_start_time, w.start_time),
      arrival_time = coalesce(p_arrival_time, w.arrival_time),
      social_permission = coalesce(p_social_permission, w.social_permission),
      crop_x = coalesce(p_crop_x, w.crop_x),
      portal_status = 'Concluído',
      status = 'Concluído',
      updated_at = now()
  where w.private_token = p_token;
  get diagnostics changed_count = row_count;
  return changed_count = 1;
end
$$;
revoke all on function public.submit_wedding_by_token(uuid,text,date,text,text,integer,time,time,boolean,numeric) from public;
grant execute on function public.submit_wedding_by_token(uuid,text,date,text,text,integer,time,time,boolean,numeric) to anon, authenticated;

create or replace function public.record_wedding_assets_by_token(
  p_token uuid,
  p_original text default null,
  p_logo_color text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_wedding uuid;
begin
  select w.id into target_wedding
  from public.weddings w
  where w.private_token = p_token
  limit 1;

  if target_wedding is null then return false; end if;
  if p_original is not null and p_original not like p_token::text || '/original-photo-%' then
    raise exception 'Caminho de fotografia inválido';
  end if;
  if p_logo_color is not null and p_logo_color not like p_token::text || '/logo-color-%' then
    raise exception 'Caminho de símbolo inválido';
  end if;

  update public.personalizations
  set original_photo_url = coalesce(p_original, original_photo_url),
      logo_color_url = coalesce(p_logo_color, logo_color_url),
      submitted_at = now()
  where wedding_id = target_wedding;

  if not found then
    insert into public.personalizations (
      wedding_id, original_photo_url, logo_color_url, submitted_at
    ) values (
      target_wedding, p_original, p_logo_color, now()
    );
  end if;
  return true;
end
$$;
revoke all on function public.record_wedding_assets_by_token(uuid,text,text) from public;
grant execute on function public.record_wedding_assets_by_token(uuid,text,text) to anon, authenticated;

-- Bucket privado. O portal só pode criar imagens numa pasta cujo nome é um token válido.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-assets',
  'wedding-assets',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "portal_update_wedding_assets" on storage.objects;
drop policy if exists "portal_upload_wedding_assets" on storage.objects;
drop policy if exists "staff_read_wedding_assets" on storage.objects;
drop policy if exists "portal uploads wedding assets" on storage.objects;
create policy "portal uploads wedding assets" on storage.objects
for insert to anon
with check (
  bucket_id = 'wedding-assets'
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
  and exists (
    select 1
    from public.weddings w
    where w.private_token::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "authorized staff reads wedding assets" on storage.objects;
create policy "authorized staff reads wedding assets" on storage.objects
for select to authenticated
using (
  bucket_id = 'wedding-assets'
  and exists (
    select 1 from public.staff_users s
    where s.user_id = (select auth.uid()) and s.active
  )
);

drop policy if exists "authorized staff manages wedding assets" on storage.objects;
create policy "authorized staff manages wedding assets" on storage.objects
for all to authenticated
using (
  bucket_id = 'wedding-assets'
  and exists (
    select 1 from public.staff_users s
    where s.user_id = (select auth.uid()) and s.active
  )
)
with check (
  bucket_id = 'wedding-assets'
  and exists (
    select 1 from public.staff_users s
    where s.user_id = (select auth.uid()) and s.active
  )
);

