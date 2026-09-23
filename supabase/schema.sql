-- ClearBooks — Supabase schema (run in SQL editor, Postgres)
-- Production-ready with Row Level Security per user (user_id = auth.uid())

create extension if not exists "uuid-ossp";

-- CLIENTS — enriched for post-production freelancers (company, phone, billing, GSTIN)
create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) >= 2),
  email text check (email is null or email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  company text,
  phone text,
  billing_address text,
  gstin text,
  notes text,
  created_at timestamp with time zone default now()
);
alter table public.clients add column if not exists company text;
alter table public.clients add column if not exists phone text;
alter table public.clients add column if not exists billing_address text;
alter table public.clients add column if not exists gstin text;
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

-- INVOICES — tax_rate is snapshotted per invoice (e.g. 18 for 18% GST/VAT) so old invoices never recalc when global rate changes
-- Plus payment workflow: payments[] jsonb (partial payments), payment_date, sent_at
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
  tax_rate numeric not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  tax_type text not null default 'none' check (tax_type in ('none','gst','vat','custom','exempt')),
  payments jsonb not null default '[]'::jsonb,
  payment_date date,
  sent_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(user_id, invoice_number)
);
alter table public.invoices add column if not exists payment_date date;
alter table public.invoices add column if not exists sent_at timestamp with time zone;
alter table public.invoices add column if not exists payments jsonb not null default '[]'::jsonb;
alter table public.invoices add column if not exists tax_type text not null default 'none' check (tax_type in ('none','gst','vat','custom','exempt'));
-- Migration: add tax_rate if table already existed without it
alter table public.invoices add column if not exists tax_rate numeric not null default 0 check (tax_rate >= 0 and tax_rate <= 100);
alter table public.invoices add column if not exists subtotal numeric check (subtotal >= 0);
alter table public.invoices add column if not exists tax_amount numeric check (tax_amount >= 0);
-- Revision Guard: stop revision creep — contract-style milestone term
alter table public.invoices add column if not exists revisions_included integer not null default 2 check (revisions_included >= 0 and revisions_included <= 100);
alter table public.invoices add column if not exists revisions_used integer not null default 0 check (revisions_used >= 0 and revisions_used <= 100);
-- Backfill: existing invoices without a meaningful rate get 0 and should be reviewed; set to current default (e.g. 18) if you prefer:
-- update public.invoices set tax_rate = 18 where tax_rate is null or tax_rate = 0;
-- update public.invoices set subtotal = total_amount / (1 + tax_rate/100.0), tax_amount = total_amount - subtotal where subtotal is null;
-- To flag historical rows needing review:
-- alter table public.invoices add column if not exists tax_rate_migrated boolean default false;
-- update public.invoices set tax_rate_migrated = true where tax_rate = 0;
alter table public.invoices enable row level security;
drop policy if exists "Users manage own invoices" on public.invoices;
create policy "Users manage own invoices" on public.invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists invoices_user_id_idx on public.invoices(user_id);

-- STORAGE BUCKET for receipts (per-user scoped, private recommended for production)
-- For maximal privacy, set public = false and use signed URLs (requires code change to createSignedUrl)
insert into storage.buckets (id, name, public) values ('receipts','receipts', true) on conflict (id) do nothing;
-- To enforce private: update storage.buckets set public = false where id = 'receipts';

-- Storage RLS - scoped to receipts/{user_id}/...
-- Ensure storage.objects RLS is enabled (it is by default)
-- Drop old permissive policies if they exist
drop policy if exists "Users upload own receipts" on storage.objects;
drop policy if exists "Users view own receipts" on storage.objects;
drop policy if exists "Users update own receipts" on storage.objects;
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
  and (storage.foldername(name))[1] = auth.uid()::text
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
