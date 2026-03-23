-- Enable RLS on all tables (done per table below)

-- profiles table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  nom text not null,
  prenom text not null,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can view all profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- presences table
create table if not exists presences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  created_at timestamptz default now(),
  unique(user_id, date)
);

alter table presences enable row level security;
create policy "Users can view all presences" on presences for select using (auth.role() = 'authenticated');
create policy "Users can manage own presences" on presences for insert with check (auth.uid() = user_id);
create policy "Users can delete own presences" on presences for delete using (auth.uid() = user_id);

-- salles table
create table if not exists salles (
  id uuid default gen_random_uuid() primary key,
  nom text not null,
  capacite integer not null,
  created_at timestamptz default now()
);

alter table salles enable row level security;
create policy "Users can view all salles" on salles for select using (auth.role() = 'authenticated');

-- reservations table
create table if not exists reservations (
  id uuid default gen_random_uuid() primary key,
  salle_id uuid references salles(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  heure_debut time not null,
  heure_fin time not null,
  titre text not null,
  created_at timestamptz default now()
);

alter table reservations enable row level security;
create policy "Users can view all reservations" on reservations for select using (auth.role() = 'authenticated');
create policy "Users can insert own reservations" on reservations for insert with check (auth.uid() = user_id);
create policy "Users can delete own reservations" on reservations for delete using (auth.uid() = user_id);

-- Insert sample rooms (update via Supabase dashboard as needed)
insert into salles (nom, capacite) values
  ('Salle A', 8),
  ('Salle B', 4),
  ('Salle C', 6),
  ('Salle D', 10),
  ('Salle E', 3)
on conflict do nothing;
