-- Seed licenses for testing. Run this after supabase/schema.sql.
-- All licenses are active, allow 10 devices, and expire on 2027-06-01 UTC.

insert into licenses (owner_name, username, token_plain, status, max_devices, expires_at)
values
  ('Roberto', 'Gallardeus', 'KGM-yYR8S1o5lHUzecKTE0HqEPx9Qdr81hEs', 'active', 10, '2027-06-01T00:00:00Z'),
  ('Friend 01', 'friend_01', 'KGM-ePrSpKrOkH4c7hYthd3Rb7P37JBeQ7QXGZO1', 'active', 10, '2027-06-01T00:00:00Z'),
  ('Friend 02', 'friend_02', 'KGM-HZ0gnQbHPMXRyzUpuXLr2wlElIBQbABBABzt', 'active', 10, '2027-06-01T00:00:00Z'),
  ('Friend 03', 'friend_03', 'KGM-GjhiC8i4zZJo4HrWyLz4gbYkRzftoSExpaUs', 'active', 10, '2027-06-01T00:00:00Z'),
  ('Friend 04', 'friend_04', 'KGM-UnbsxhXRh24m3SdJb38mhhZCVhCRyBim32FD', 'active', 10, '2027-06-01T00:00:00Z'),
  ('Friend 05', 'friend_05', 'KGM-tDgXAwfUyry3dLAPnsfsaQuzS5JA887ICDVt', 'active', 10, '2027-06-01T00:00:00Z'),
  ('Friend 06', 'friend_06', 'KGM-J4N4JCsg16bQ9RgMpWeWpusfWEytUiJNg1YD', 'active', 10, '2027-06-01T00:00:00Z'),
  ('Friend 07', 'friend_07', 'KGM-vps4cI5hFBXaXIFk0WlPL3UqH89dnltg4mbf', 'active', 10, '2027-06-01T00:00:00Z'),
  ('Friend 08', 'friend_08', 'KGM-CCNUlUVEAzXjNbwf05XzhxChx6iWhekZleG7', 'active', 10, '2027-06-01T00:00:00Z'),
  ('Friend 09', 'friend_09', 'KGM-2WSzAoTxDTvzDhZErTblpMH6oD0bxnGbnkpK', 'active', 10, '2027-06-01T00:00:00Z'),
  ('Friend 10', 'friend_10', 'KGM-Y5UNotdGFE4VVtv2eYzFJy6wKDBefz4IKMNL', 'active', 10, '2027-06-01T00:00:00Z')
on conflict (token_plain) do update set
  owner_name = excluded.owner_name,
  username = excluded.username,
  status = excluded.status,
  max_devices = excluded.max_devices,
  expires_at = excluded.expires_at;
