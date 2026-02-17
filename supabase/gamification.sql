-- 1. Public Profiles (Linked to Auth Users)
create table if not exists public.public_profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  display_name text,
  avatar_url text,
  points integer default 0,
  role text default 'user', -- 'user', 'admin'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.public_profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone."
  on public.public_profiles for select
  using ( true );

create policy "Users can update own profile."
  on public.public_profiles for update
  using ( auth.uid() = id );

-- 2. Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.public_profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$;

-- Drop trigger if exists to avoid conflicts during re-runs
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Pronosticos (Predictions)
create table if not exists public.pronosticos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.public_profiles(id) on delete cascade not null,
  match_id bigint references public.partidos(id) on delete cascade not null,
  goles_a integer not null,
  goles_b integer not null,
  puntos_ganados integer, -- NULL = Pending, 0/1/3 = Finalized
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, match_id) -- One prediction per match per user
);

-- Enable RLS
alter table public.pronosticos enable row level security;

create policy "Predictions are viewable by everyone"
    on public.pronosticos for select using (true);
    
create policy "Users can insert own predictions"
    on public.pronosticos for insert 
    with check (auth.uid() = user_id);

create policy "Users can update own predictions"
    on public.pronosticos for update 
    using (auth.uid() = user_id);
