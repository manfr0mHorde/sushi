-- Run once in Supabase SQL Editor if SushiDay's products table already exists.
-- Stores set ingredients exactly as entered by the restaurant administrator.
alter table public.products
  add column if not exists composition text not null default '';
alter table public.products
  add column if not exists pieces integer;
-- Do not infer or import ingredients when official data is missing.
