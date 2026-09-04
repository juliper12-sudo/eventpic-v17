
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
for select to authenticated using (user_id = auth.uid());

-- Restringe CRM/casamentos/personalizações aos utilizadores presentes na allowlist.
drop policy if exists "staff leads" on public.leads;
drop policy if exists "staff weddings" on public.weddings;
drop policy if exists "staff personalizations" on public.personalizations;
create policy "authorized staff leads" on public.leads for all to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active))
with check (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active));
create policy "authorized staff weddings" on public.weddings for all to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active))
with check (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active));
create policy "authorized staff personalizations" on public.personalizations for all to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active))
with check (exists(select 1 from public.staff_users s where s.user_id=auth.uid() and s.active));

-- Entrada pública segura para a Landing Page (sem dar acesso anon à tabela).
create or replace function public.create_public_lead(
  p_names text, p_phone text default null, p_email text default null,
  p_wedding_date date default null, p_venue text default null, p_guests integer default null,
  p_origin text default 'Landing Page', p_source text default null,
  p_medium text default null, p_campaign text default null
) returns uuid language plpgsql security definer set search_path=public as $$
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
