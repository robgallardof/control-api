-- Seed initial Control API users. Run this after supabase/schema.sql.
-- Replace every placeholder before executing this file in your private database console.
-- Do not commit real usernames, emails, passwords, or generated hashes.
--
-- Password hashes use this server-side format:
--   pbkdf2_sha256$<iterations>$<base64url-salt>$<base64url-hash>
--
-- You can generate a hash locally from control-api with:
--   pnpm tsx -e "import { createPbkdf2PasswordHash } from './lib/userAuth'; console.log(createPbkdf2PasswordHash(process.argv[1]));" "YOUR_PASSWORD"

insert into users (id, username, email, password_hash, role, is_active, created_at, updated_at)
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
