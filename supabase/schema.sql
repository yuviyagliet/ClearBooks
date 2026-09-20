-- ClearBooks — Supabase schema (run in SQL editor, Postgres)
-- Production-ready with Row Level Security per user (user_id = auth.uid())

create extension if not exists "uuid-ossp";

-- CLIENTS
create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) >= 2),
  email text check (email is null or email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  notes text,
  created_at timestamp with time zone default now()
);
alter table public.clients enable row level security;
drop policy if exists "Users can manage own clients" on public.clients;
create policy "Users can manage own clients" on public.clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists clients_user_id_idx on public.clients(user_id);

-- INCOME
create table if not exists public.income (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_name text,
  date date not null,
  amount numeric not null check (amount > 0),
  description text not null check (char_length(description) >= 2),
  created_at timestamp with time zone default now()
);
alter table public.income enable row level security;
drop policy if exists "Users manage own income" on public.income;
create policy "Users manage own income" on public.income
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists income_user_id_idx on public.income(user_id);
create index if not exists income_date_idx on public.income(date);

-- EXPENSES
create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (char_length(category) >= 2),
  date date not null,
  amount numeric not null check (amount > 0),
  description text not null check (char_length(description) >= 2),
  receipt_url text,
  created_at timestamp with time zone default now()
);
alter table public.expenses enable row level security;
drop policy if exists "Users manage own expenses" on public.expenses;
create policy "Users manage own expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists expenses_user_id_idx on public.expenses(user_id);

-- INVOICES
create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_name text,
  invoice_number text not null,
  issue_date date not null,
  due_date date not null check (due_date >= issue_date),
  status text not null check (status in ('Paid','Unpaid','Overdue')),
  line_items jsonb not null default '[]'::jsonb,
  total_amount numeric not null check (total_amount > 0),
  created_at timestamp with time zone default now(),
  unique(user_id, invoice_number)
);
alter table public.invoices enable row level security;
drop policy if exists "Users manage own invoices" on public.invoices;
create policy "Users manage own invoices" on public.invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists invoices_user_id_idx on public.invoices(user_id);

-- STORAGE BUCKET for receipts (per-user scoped)
insert into storage.buckets (id, name, public) values ('receipts','receipts', true) on conflict (id) do nothing;

-- Storage RLS - scoped to receipts/{user_id}/...
-- Ensure storage.objects RLS is enabled (it is by default)
-- Drop old permissive policies if they exist
drop policy if exists "Users upload own receipts" on storage.objects;
drop policy if exists "Users view own receipts" on storage.objects;
drop policy if exists "Users delete own receipts" on storage.objects;
drop policy if exists "Public read receipts" on storage.objects;
drop policy if exists "Give users access to own folder receipts" on storage.objects;

-- Owner-scoped write: path must start with auth.uid()
create policy "Users upload own receipts"
on storage.objects for insert
with check (
  bucket_id = 'receipts'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users view own receipts"
on storage.objects for select
using (
  bucket_id = 'receipts'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or bucket_id = 'receipts' -- allow public read via URL (bucket is public); remove if you want private only
  )
);

create policy "Users update own receipts"
on storage.objects for update
using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own receipts"
on storage.objects for delete
using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- DELETE CURRENT USER — allows Settings > Delete my account and all data
-- Deletes the authenticated user (and via cascade, all their rows)
create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- only allow authenticated user to delete self
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
grant execute on function public.delete_current_user() to authenticated;
