create table profiles  (platform text primary key, handle text not null);
create table snapshots (date date, platform text, total int not null, primary key (date, platform));
create table tasks     (id uuid primary key default gen_random_uuid(), title text not null,
                        date date not null default current_date, done boolean not null default false);
create table gym_logs  (date date primary key);

-- Single-user setup: open policies for the anon key. Replace with auth + per-user policies before sharing the app.
alter table snapshots enable row level security;
alter table tasks     enable row level security;
alter table gym_logs  enable row level security;
create policy "open" on snapshots for all using (true) with check (true);
create policy "open" on tasks     for all using (true) with check (true);
create policy "open" on gym_logs  for all using (true) with check (true);

-- insert into profiles values ('leetcode','your_handle'),('codechef','...'),('gfg','...'),('codingninjas','...'),('tuf','...');
