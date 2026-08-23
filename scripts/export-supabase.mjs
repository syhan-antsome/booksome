import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

const projectRoot = process.cwd();
const pageSize = 1_000;
const sourceTables = [
  'profiles',
  'book_works',
  'book_editions',
  'rooms',
  'room_members',
  'posts',
  'comments',
  'reactions',
  'reading_sessions',
  'reading_books',
  'reading_notes',
  'meetups',
  'media_assets',
  'push_tokens',
  'notifications',
  'reports',
  'market_listings',
  'market_threads',
  'market_messages',
];

async function loadLocalEnvironment(fileName) {
  let contents;

  try {
    contents = await readFile(path.join(projectRoot, fileName), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }

  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
}

await loadLocalEnvironment('.env');
await loadLocalEnvironment('.env.migration.local');

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const secretKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is missing from .env.migration.local');
}

if (!secretKey) {
  throw new Error(
    'Add SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY to .env.migration.local',
  );
}

if (secretKey === (process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)) {
  throw new Error('The migration key must not be the public anon key');
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

async function fetchAllRows(table) {
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1)
      .abortSignal(AbortSignal.timeout(30_000));

    if (error) throw new Error(`${table}: ${error.message}`);

    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

async function fetchAuthUsers() {
  const users = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });

    if (error) throw new Error(`auth.users: ${error.message}`);

    users.push(
      ...data.users.map((user) => ({
        id: user.id,
        email: user.email ?? null,
        created_at: user.created_at,
        updated_at: user.updated_at ?? null,
        last_sign_in_at: user.last_sign_in_at ?? null,
      })),
    );

    if (data.users.length < pageSize) return users;
  }
}

const tables = {};
for (const table of sourceTables) {
  tables[table] = await fetchAllRows(table);
  console.log(`${table}: ${tables[table].length}`);
}

const authUsers = await fetchAuthUsers();
console.log(`auth.users: ${authUsers.length}`);

const exportedAt = new Date();
const stamp = exportedAt.toISOString().replaceAll(':', '').replaceAll('.', '-');
const outputDirectory = path.join(projectRoot, 'data-backups');
const outputPath = path.join(outputDirectory, `supabase-export-${stamp}.json`);
const payload = {
  metadata: {
    format: 'booksome-supabase-export-v1',
    exported_at: exportedAt.toISOString(),
    source_table_counts: Object.fromEntries(
      Object.entries(tables).map(([table, rows]) => [table, rows.length]),
    ),
    auth_user_count: authUsers.length,
  },
  auth_users: authUsers,
  tables,
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, {
  encoding: 'utf8',
  mode: 0o600,
});
await chmod(outputPath, 0o600);

console.log(`Saved private export: ${path.relative(projectRoot, outputPath)}`);
