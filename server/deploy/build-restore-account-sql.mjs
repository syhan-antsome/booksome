#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const [exportPath, importPath] = process.argv.slice(2);
if (!exportPath || !importPath) throw new Error('Usage: node build-restore-account-sql.mjs <supabase-export.json> <mariadb-import.sql>');

const backup = JSON.parse(readFileSync(exportPath, 'utf8'));
const importSql = readFileSync(importPath, 'utf8');
const targetId = importSql.match(/^-- Target profile: ([0-9a-f-]{36})$/m)?.[1];
const auth = backup.auth_users;
const profiles = backup.tables?.profiles;
if (!targetId || auth?.length !== 1 || profiles?.length !== 1 || auth[0].id !== profiles[0].id || !auth[0].email) {
  throw new Error('Backup account metadata does not match the one-profile import');
}

const value = (input) => input == null ? 'NULL' : `CONVERT(0x${Buffer.from(String(input), 'utf8').toString('hex')} USING utf8mb4)`;
const date = (input) => {
  if (input == null) return 'UTC_TIMESTAMP(6)';
  const normalized = new Date(input);
  if (Number.isNaN(normalized.getTime())) throw new Error('Invalid backup timestamp');
  return value(normalized.toISOString().replace('T', ' ').replace('Z', '000'));
};

const profile = profiles[0];
const sql = [
  '-- Restores the profile ID referenced by the BookSome data-only import.',
  '-- Requires exactly one newly signed-up account and no other user data.',
  'START TRANSACTION;',
  `SET @restored_email = ${value(auth[0].email.toLowerCase())} COLLATE utf8mb4_unicode_ci;`,
  `SET @restored_id = ${value(targetId)};`,
  'SET @signup_id = (SELECT id FROM users WHERE email = @restored_email);',
  'SET @signup_hash = (SELECT password_hash FROM users WHERE id = @signup_id);',
  'DELETE FROM auth_refresh_tokens WHERE user_id = @signup_id;',
  'DELETE FROM profiles WHERE id = @signup_id;',
  'DELETE FROM users WHERE id = @signup_id;',
  'INSERT INTO users (id, email, password_hash, status, email_verified_at, created_at, updated_at)',
  `VALUES (@restored_id, @restored_email, @signup_hash, 'active', UTC_TIMESTAMP(6), ${date(auth[0].created_at)}, ${date(auth[0].updated_at)});`,
  'INSERT INTO profiles (id, display_name, username, avatar_path, bio, preferred_language, city, country, created_at, updated_at)',
  `VALUES (@restored_id, ${value(profile.display_name)}, ${value(profile.username)}, ${value(profile.avatar_path)}, ${value(profile.bio)}, ${value(profile.preferred_language || 'ko')}, ${value(profile.city)}, ${value(profile.country)}, ${date(profile.created_at)}, ${date(profile.updated_at)});`,
  'COMMIT;',
  '',
];
process.stdout.write(sql.join('\n'));
