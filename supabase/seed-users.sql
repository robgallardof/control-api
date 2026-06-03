-- Seed initial Control API panel users.
-- This file is safe to run even if supabase/schema.sql has not been applied yet.
-- Replace every placeholder before executing this file in your private database console.
-- Do not commit real usernames, emails, passwords, or generated hashes.
--
-- Password hashes use this server-side format:
--   pbkdf2_sha256$<iterations>$<base64url-salt>$<base64url-hash>
--
-- You can generate a hash locally from control-api with:
--   pnpm tsx -e "import { createPbkdf2PasswordHash } from './lib/userAuth'; console.log(createPbkdf2PasswordHash(process.argv[1]));" "YOUR_PASSWORD"

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text unique,
  password_hash text not null check (password_hash like 'pbkdf2_sha256$%'),
  role text not null default 'viewer' check (role in ('viewer', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_username on public.users(username);
create index if not exists idx_users_email on public.users(email);

alter table public.users enable row level security;

insert into public.users (id, username, email, password_hash, role, is_active, created_at, updated_at)
values
  (
    gen_random_uuid(),
    '<admin-username>',
    '<admin-email@example.com>',
    'pbkdf2_sha256$210000$<base64url-salt>$<base64url-hash>',
    'admin',
    true,
    now(),
    now()
  )
on conflict (username) do update set
  email = excluded.email,
  password_hash = excluded.password_hash,
  role = excluded.role,
  is_active = excluded.is_active,
  updated_at = now();
