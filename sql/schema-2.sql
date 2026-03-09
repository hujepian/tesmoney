-- 1. Create Wallets Table
create table public.wallets (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  type text not null default 'other', -- 'bank', 'ewallet', 'cash', 'other'
  initial_balance numeric not null default 0,
  color text default '#4f46e5', -- For UI customization
  created_at timestamp with time zone not null default now(),
  constraint wallets_pkey primary key (id),
  constraint wallets_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);
-- 2. Enable RLS
alter table public.wallets enable row level security;
-- 3. RLS Policies
create policy "Users can view their own wallets" on wallets
  for select using (auth.uid() = user_id);
create policy "Users can insert their own wallets" on wallets
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own wallets" on wallets
  for update using (auth.uid() = user_id);
create policy "Users can delete their own wallets" on wallets
  for delete using (auth.uid() = user_id);
-- 4. Update Transactions Table
alter table public.transactions 
add column wallet_id uuid references public.wallets(id) on delete set null;