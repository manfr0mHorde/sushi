-- SushiDay Astana: run this SQL once in Supabase SQL Editor.
-- Never expose the Supabase service_role key or a database password in GitHub Pages.
-- The public can read visible products/settings. Only whitelisted auth users may edit.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.products (
  id text primary key,
  name text not null check (char_length(name) between 2 and 120),
  category text not null check (category in ('sets','rolls','baked','fried','pizza','snacks','drinks','sauces')),
  price integer not null check (price >= 0),
  description text not null default '',
  composition text not null default '',
  pieces integer check (pieces is null or (pieces between 1 and 400)),
  image text not null default '',
  badge text not null default '',
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
-- Safe additive migration for installations created before set composition was added.
alter table public.products add column if not exists composition text not null default '';
alter table public.products add column if not exists pieces integer;

create table if not exists public.settings (
  id integer primary key check (id = 1),
  whatsapp text not null default '',
  phone text not null default '',
  address text not null default '',
  kaspi_receiver text not null default '',
  delivery_fee integer check (delivery_fee is null or delivery_fee >= 0),
  min_order integer not null default 0 check (min_order >= 0),
  demo_mode boolean not null default true,
  delivery_note text not null default '',
  hero_title text not null default ''
);
insert into public.settings (id, phone, address, demo_mode, delivery_note)
values (1, '+7 (701) 844-56-40', 'ул. Санжара Асфендиярова, 5, Астана', true, 'Условия доставки уточняются оператором.')
on conflict (id) do nothing;

-- Security-definer helper prevents recursion and hides the admin membership table.
create or replace function public.is_sushiday_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins a where a.user_id = (select auth.uid())); $$;
revoke all on function public.is_sushiday_admin() from public;
grant execute on function public.is_sushiday_admin() to authenticated;

alter table public.admins enable row level security;
alter table public.products enable row level security;
alter table public.settings enable row level security;

drop policy if exists "admins can view own membership" on public.admins;
create policy "admins can view own membership" on public.admins for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "public sees visible catalog" on public.products;
create policy "public sees visible catalog" on public.products for select to anon, authenticated
using (visible = true);
drop policy if exists "admins see all catalog" on public.products;
create policy "admins see all catalog" on public.products for select to authenticated
using ((select public.is_sushiday_admin()));
drop policy if exists "admins insert catalog" on public.products;
create policy "admins insert catalog" on public.products for insert to authenticated
with check ((select public.is_sushiday_admin()));
drop policy if exists "admins update catalog" on public.products;
create policy "admins update catalog" on public.products for update to authenticated
using ((select public.is_sushiday_admin())) with check ((select public.is_sushiday_admin()));
drop policy if exists "admins delete catalog" on public.products;
create policy "admins delete catalog" on public.products for delete to authenticated
using ((select public.is_sushiday_admin()));

drop policy if exists "public reads restaurant settings" on public.settings;
create policy "public reads restaurant settings" on public.settings for select to anon, authenticated
using (id = 1);
drop policy if exists "admins update settings" on public.settings;
create policy "admins update settings" on public.settings for update to authenticated
using ((select public.is_sushiday_admin())) with check ((select public.is_sushiday_admin()));
drop policy if exists "admins insert settings" on public.settings;
create policy "admins insert settings" on public.settings for insert to authenticated
with check ((select public.is_sushiday_admin()));

revoke all on table public.admins from anon;
grant select on public.admins to authenticated;
grant select on public.products,public.settings to anon;
grant select,insert,update,delete on public.products to authenticated;
grant select,insert,update on public.settings to authenticated;
-- Admin rows must be managed manually in SQL Editor (not writable from the browser).

-- After creating an admin in Authentication -> Users, add their user_id here:
-- insert into public.admins(user_id) values ('PASTE-ADMIN-AUTH-USER-UUID-HERE');
-- IMPORTANT: disable public signups in Authentication settings if this is a closed staff account.
