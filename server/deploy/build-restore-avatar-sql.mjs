#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [exportPath, importPath, mediaRoot] = process.argv.slice(2);
if (!exportPath || !importPath || !mediaRoot) {
  throw new Error('Usage: node build-restore-avatar-sql.mjs <supabase-export.json> <mariadb-import.sql> <media-root>');
}
const backup = JSON.parse(readFileSync(exportPath, 'utf8'));
const targetId = readFileSync(importPath, 'utf8').match(/^-- Target profile: ([0-9a-f-]{36})$/m)?.[1];
const oldId = backup.auth_users?.[0]?.id;
const sourcePath = backup.tables?.profiles?.[0]?.avatar_path;
if (!targetId || !oldId || !sourcePath?.startsWith(`avatars/${oldId}/`)) {
  throw new Error('The source avatar cannot be mapped to the restored profile');
}
const objectPath = sourcePath.replace(`avatars/${oldId}/`, `avatars/${targetId}/`);
if (!/^[a-z0-9/_-]+\.(jpg|png|webp)$/.test(objectPath) || !existsSync(join(mediaRoot, objectPath))) {
  throw new Error('The mapped avatar file is missing from the backup');
}
process.stdout.write(`UPDATE profiles SET avatar_path = CONVERT(0x${Buffer.from(objectPath).toString('hex')} USING utf8mb4) WHERE id = '${targetId}';\n`);
