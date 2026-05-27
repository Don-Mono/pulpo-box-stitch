-- Pulpo Box - esquema inicial para sistema de gestion
-- Revisar antes de ejecutar en Supabase.
-- Este archivo no modifica la landing por si solo.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'pb_user_role') then
    create type public.pb_user_role as enum ('admin', 'coach', 'student');
  end if;

  if not exists (select 1 from pg_type where typname = 'pb_assignment_status') then
    create type public.pb_assignment_status as enum ('assigned', 'completed', 'skipped');
  end if;
end $$;

create table if not exists public.pb_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  whatsapp_number text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pb_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.pb_user_role not null default 'student',
  full_name text not null,
  email text,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pb_coaches (
  profile_id uuid primary key references public.pb_profiles(id) on delete cascade,
  specialty text,
  bio text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pb_students (
  profile_id uuid primary key references public.pb_profiles(id) on delete cascade,
  location_id uuid references public.pb_locations(id) on delete set null,
  primary_coach_id uuid references public.pb_coaches(profile_id) on delete set null,
  goal text,
  height_cm numeric(5,2),
  current_weight_kg numeric(5,2),
  emergency_contact_name text,
  emergency_contact_phone text,
  medical_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pb_exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  movement_type text,
  video_url text,
  created_by uuid references public.pb_profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pb_workouts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  workout_date date,
  level text,
  notes text,
  created_by uuid references public.pb_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pb_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.pb_workouts(id) on delete cascade,
  exercise_id uuid references public.pb_exercises(id) on delete set null,
  position integer not null default 0,
  prescription text,
  sets integer,
  reps text,
  time_cap_seconds integer,
  created_at timestamptz not null default now()
);

create table if not exists public.pb_workout_assignments (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.pb_workouts(id) on delete cascade,
  student_id uuid not null references public.pb_students(profile_id) on delete cascade,
  assigned_by uuid references public.pb_profiles(id) on delete set null,
  status public.pb_assignment_status not null default 'assigned',
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (workout_id, student_id)
);

create table if not exists public.pb_performance_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.pb_students(profile_id) on delete cascade,
  workout_id uuid references public.pb_workouts(id) on delete set null,
  exercise_id uuid references public.pb_exercises(id) on delete set null,
  logged_at timestamptz not null default now(),
  weight_kg numeric(6,2),
  reps integer,
  rounds numeric(6,2),
  time_seconds integer,
  score_text text,
  student_notes text,
  coach_notes text,
  created_by uuid references public.pb_profiles(id) on delete set null
);

create table if not exists public.pb_body_measurements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.pb_students(profile_id) on delete cascade,
  measured_at timestamptz not null default now(),
  body_weight_kg numeric(5,2),
  height_cm numeric(5,2),
  waist_cm numeric(5,2),
  chest_cm numeric(5,2),
  hip_cm numeric(5,2),
  notes text,
  created_by uuid references public.pb_profiles(id) on delete set null
);

create table if not exists public.pb_medical_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.pb_students(profile_id) on delete cascade,
  note_type text not null,
  description text not null,
  visible_to_coach boolean not null default false,
  created_by uuid references public.pb_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pb_locations enable row level security;
alter table public.pb_profiles enable row level security;
alter table public.pb_coaches enable row level security;
alter table public.pb_students enable row level security;
alter table public.pb_exercises enable row level security;
alter table public.pb_workouts enable row level security;
alter table public.pb_workout_exercises enable row level security;
alter table public.pb_workout_assignments enable row level security;
alter table public.pb_performance_logs enable row level security;
alter table public.pb_body_measurements enable row level security;
alter table public.pb_medical_notes enable row level security;

create index if not exists pb_profiles_role_idx on public.pb_profiles(role);
create index if not exists pb_students_coach_idx on public.pb_students(primary_coach_id);
create index if not exists pb_workout_assignments_student_idx on public.pb_workout_assignments(student_id);
create index if not exists pb_performance_logs_student_idx on public.pb_performance_logs(student_id, logged_at desc);
create index if not exists pb_body_measurements_student_idx on public.pb_body_measurements(student_id, measured_at desc);
create index if not exists pb_medical_notes_student_idx on public.pb_medical_notes(student_id, created_at desc);

