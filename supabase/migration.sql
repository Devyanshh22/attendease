-- ============================================================
-- AttendEase — Supabase migration
-- Run this in the Supabase SQL Editor (or via supabase db push)
-- ============================================================

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. semesters
-- ------------------------------------------------------------
create table if not exists public.semesters (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  start_date        date not null,
  end_date          date not null,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

alter table public.semesters enable row level security;

create policy "semesters_select" on public.semesters
  for select using (auth.uid() = user_id);
create policy "semesters_insert" on public.semesters
  for insert with check (auth.uid() = user_id);
create policy "semesters_update" on public.semesters
  for update using (auth.uid() = user_id);
create policy "semesters_delete" on public.semesters
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2. subjects
-- ------------------------------------------------------------
create table if not exists public.subjects (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  semester_id               uuid not null references public.semesters(id) on delete cascade,
  name                      text not null,
  short_code                text not null,
  total_hours               integer not null,
  attendance_target_percent integer not null default 80,
  color                     text not null,
  created_at                timestamptz not null default now()
);

alter table public.subjects enable row level security;

create policy "subjects_select" on public.subjects
  for select using (auth.uid() = user_id);
create policy "subjects_insert" on public.subjects
  for insert with check (auth.uid() = user_id);
create policy "subjects_update" on public.subjects
  for update using (auth.uid() = user_id);
create policy "subjects_delete" on public.subjects
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. timetable_slots
-- ------------------------------------------------------------
create table if not exists public.timetable_slots (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  semester_id  uuid not null references public.semesters(id) on delete cascade,
  subject_id   uuid not null references public.subjects(id) on delete cascade,
  day_of_week  integer not null check (day_of_week between 1 and 6),
  start_time   time not null,
  end_time     time not null,
  room         text,
  faculty      text
);

alter table public.timetable_slots enable row level security;

create policy "timetable_slots_select" on public.timetable_slots
  for select using (auth.uid() = user_id);
create policy "timetable_slots_insert" on public.timetable_slots
  for insert with check (auth.uid() = user_id);
create policy "timetable_slots_update" on public.timetable_slots
  for update using (auth.uid() = user_id);
create policy "timetable_slots_delete" on public.timetable_slots
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. special_days
-- ------------------------------------------------------------
create table if not exists public.special_days (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  semester_id  uuid not null references public.semesters(id) on delete cascade,
  date         date not null,
  type         text not null check (type in ('holiday', 'no_college', 'extra_working')),
  label        text not null
);

alter table public.special_days enable row level security;

create policy "special_days_select" on public.special_days
  for select using (auth.uid() = user_id);
create policy "special_days_insert" on public.special_days
  for insert with check (auth.uid() = user_id);
create policy "special_days_update" on public.special_days
  for update using (auth.uid() = user_id);
create policy "special_days_delete" on public.special_days
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 5. extra_lectures
-- ------------------------------------------------------------
create table if not exists public.extra_lectures (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references auth.users(id) on delete cascade,
  semester_id                uuid not null references public.semesters(id) on delete cascade,
  subject_id                 uuid not null references public.subjects(id) on delete cascade,
  date                       date not null,
  start_time                 time not null,
  end_time                   time not null,
  reason                     text,
  original_timetable_slot_id uuid references public.timetable_slots(id) on delete set null
);

alter table public.extra_lectures enable row level security;

create policy "extra_lectures_select" on public.extra_lectures
  for select using (auth.uid() = user_id);
create policy "extra_lectures_insert" on public.extra_lectures
  for insert with check (auth.uid() = user_id);
create policy "extra_lectures_update" on public.extra_lectures
  for update using (auth.uid() = user_id);
create policy "extra_lectures_delete" on public.extra_lectures
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. attendance_records
-- ------------------------------------------------------------
create table if not exists public.attendance_records (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  date                date not null,
  timetable_slot_id   uuid references public.timetable_slots(id) on delete set null,
  extra_lecture_id    uuid references public.extra_lectures(id) on delete set null,
  status              text not null check (status in ('attended', 'missed', 'cancelled')),
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.attendance_records enable row level security;

create policy "attendance_records_select" on public.attendance_records
  for select using (auth.uid() = user_id);
create policy "attendance_records_insert" on public.attendance_records
  for insert with check (auth.uid() = user_id);
create policy "attendance_records_update" on public.attendance_records
  for update using (auth.uid() = user_id);
create policy "attendance_records_delete" on public.attendance_records
  for delete using (auth.uid() = user_id);

-- Auto-update updated_at on attendance_records
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger attendance_records_updated_at
  before update on public.attendance_records
  for each row execute procedure public.set_updated_at();
