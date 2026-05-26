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

alter table public.categories enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "public categories read" on public.categories;
drop policy if exists "public categories write" on public.categories;
drop policy if exists "public transactions read" on public.transactions;
drop policy if exists "public transactions write" on public.transactions;

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
