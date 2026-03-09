-- Create transactions table
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  type text check (type in ('income', 'expense')) not null,
  amount numeric not null,
  category text not null,
  description text,
  date date default current_date,
  source text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Create budgets table
create table public.budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  category text not null,
  limit_amount numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Create goals table
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  deadline date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Enable Row Level Security (RLS)
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
-- Create Policies (Security Rules)
-- Transactions
create policy "Users can view their own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);
create policy "Users can insert their own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);
create policy "Users can update their own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);
create policy "Users can delete their own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);
-- Budgets
create policy "Users can view their own budgets"
  on public.budgets for select
  using (auth.uid() = user_id);
create policy "Users can insert their own budgets"
  on public.budgets for insert
  with check (auth.uid() = user_id);
create policy "Users can update their own budgets"
  on public.budgets for update
  using (auth.uid() = user_id);
create policy "Users can delete their own budgets"
  on public.budgets for delete
  using (auth.uid() = user_id);
-- Goals
create policy "Users can view their own goals"
  on public.goals for select
  using (auth.uid() = user_id);
create policy "Users can insert their own goals"
  on public.goals for insert
  with check (auth.uid() = user_id);
create policy "Users can update their own goals"
  on public.goals for update
  using (auth.uid() = user_id);
create policy "Users can delete their own goals"
  on public.goals for delete
  using (auth.uid() = user_id);