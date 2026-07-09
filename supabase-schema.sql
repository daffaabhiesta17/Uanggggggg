create table if not exists public.categories (
  id text primary key,
  type text not null check (type in ('income', 'expense')),
  name text not null,
  color text not null default '#2563eb',
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id text primary key,
  type text not null check (type in ('income', 'expense')),
  category_id text not null references public.categories(id) on update cascade,
  title text not null,
  amount numeric not null check (amount >= 0),
  date date not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.investment_settings (
  id text primary key default 'default',
  horizon_years integer not null default 11 check (horizon_years between 1 and 50),
  simulator_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.investment_settings
add column if not exists simulator_config jsonb not null default '{}'::jsonb;

create table if not exists public.investment_tickers (
  symbol text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_purchases (
  id text primary key,
  ticker text not null references public.investment_tickers(symbol) on update cascade on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 1900 and 2200),
  lot_price numeric not null check (lot_price > 0),
  lots integer not null check (lots > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.rdpu_purchases (
  id text primary key,
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 1900 and 2200),
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.investment_settings enable row level security;
alter table public.investment_tickers enable row level security;
alter table public.stock_purchases enable row level security;
alter table public.rdpu_purchases enable row level security;

drop policy if exists "public categories read" on public.categories;
drop policy if exists "public categories write" on public.categories;
drop policy if exists "public transactions read" on public.transactions;
drop policy if exists "public transactions write" on public.transactions;
drop policy if exists "public investment settings read" on public.investment_settings;
drop policy if exists "public investment settings write" on public.investment_settings;
drop policy if exists "public investment tickers read" on public.investment_tickers;
drop policy if exists "public investment tickers write" on public.investment_tickers;
drop policy if exists "public stock purchases read" on public.stock_purchases;
drop policy if exists "public stock purchases write" on public.stock_purchases;
drop policy if exists "public rdpu purchases read" on public.rdpu_purchases;
drop policy if exists "public rdpu purchases write" on public.rdpu_purchases;

create policy "public categories read"
on public.categories for select
to anon
using (true);

create policy "public categories write"
on public.categories for all
to anon
using (true)
with check (true);

create policy "public transactions read"
on public.transactions for select
to anon
using (true);

create policy "public transactions write"
on public.transactions for all
to anon
using (true)
with check (true);

create policy "public investment settings read"
on public.investment_settings for select
to anon
using (true);

create policy "public investment settings write"
on public.investment_settings for all
to anon
using (true)
with check (true);

create policy "public investment tickers read"
on public.investment_tickers for select
to anon
using (true);

create policy "public investment tickers write"
on public.investment_tickers for all
to anon
using (true)
with check (true);

create policy "public stock purchases read"
on public.stock_purchases for select
to anon
using (true);

create policy "public stock purchases write"
on public.stock_purchases for all
to anon
using (true)
with check (true);

create policy "public rdpu purchases read"
on public.rdpu_purchases for select
to anon
using (true);

create policy "public rdpu purchases write"
on public.rdpu_purchases for all
to anon
using (true)
with check (true);

do $$
begin
  alter publication supabase_realtime add table public.categories;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.transactions;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.investment_settings;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.investment_tickers;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.stock_purchases;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.rdpu_purchases;
exception
  when duplicate_object then null;
end $$;

insert into public.investment_settings (id, horizon_years)
values ('default', 11)
on conflict (id) do nothing;

insert into public.investment_tickers (symbol)
values ('BMRI'), ('ICBP'), ('BBRI')
on conflict (symbol) do nothing;

create table if not exists public.tax_records (
  id text primary key,
  year integer not null check (year between 2026 and 2045),
  type text not null check (type in ('dividen_lokal', 'dividen_ln', 'penjualan')),
  asset text not null,
  platform text not null,
  gross_idr numeric not null default 0,
  gross_usd numeric not null default 0,
  kurs_kmk numeric not null default 0,
  reinvest_idr numeric not null default 0,
  is_reinvest boolean not null default false,
  withholding_usd numeric not null default 0,
  buy_price_idr numeric not null default 0,
  sell_price_idr numeric not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.tax_records enable row level security;

drop policy if exists "public tax records read" on public.tax_records;
drop policy if exists "public tax records write" on public.tax_records;

create policy "public tax records read"
on public.tax_records for select to anon using (true);

create policy "public tax records write"
on public.tax_records for all to anon using (true) with check (true);

do $$
begin
  alter publication supabase_realtime add table public.tax_records;
exception
  when duplicate_object then null;
end $$;
