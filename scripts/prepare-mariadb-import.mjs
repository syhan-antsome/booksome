import { chmod, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const backupDirectory = path.join(projectRoot, 'data-backups');
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const mediaFilePattern = /^[0-9a-f-]{36}\.(jpg|png|webp)$/iu;

const tableColumns = {
  book_works: [
    'id', 'title', 'original_title', 'author', 'description', 'primary_language',
    'cover_path', 'external_cover_url', 'created_at', 'updated_at',
  ],
  book_editions: [
    'id', 'work_id', 'isbn13', 'isbn10', 'title', 'author', 'publisher',
    'published_date', 'language', 'cover_path', 'external_cover_url', 'source',
    'source_payload', 'created_at',
  ],
  rooms: [
    'id', 'work_id', 'edition_id', 'slug', 'title', 'subtitle', 'description',
    'accent_color', 'cover_path', 'external_cover_url', 'visibility',
    'default_spoiler_chapter', 'founder_id', 'created_at', 'updated_at',
  ],
  room_members: [
    'room_id', 'profile_id', 'role', 'reading_status', 'joined_at', 'muted_until',
  ],
  posts: [
    'id', 'room_id', 'author_id', 'kind', 'body', 'quote_text', 'chapter_label',
    'spoiler_chapter', 'pinned', 'classification_status', 'moderation_status',
    'visibility', 'ai_confidence', 'ai_reason', 'reviewed_at', 'hidden_at',
    'created_at', 'updated_at',
  ],
  comments: [
    'id', 'post_id', 'author_id', 'body', 'hidden_at', 'created_at', 'updated_at',
  ],
  reactions: ['post_id', 'profile_id', 'reaction', 'created_at'],
  reading_sessions: [
    'id', 'room_id', 'host_id', 'title', 'starts_at', 'ends_at', 'chapter_label',
    'description', 'created_at',
  ],
  reading_books: [
    'id', 'profile_id', 'isbn13', 'title', 'author', 'publisher', 'published_date',
    'description', 'external_cover_url', 'status', 'progress_percent', 'current_page',
    'total_pages', 'pinned_at', 'visibility', 'source', 'source_payload',
    'created_at', 'updated_at',
  ],
  reading_notes: [
    'id', 'reading_book_id', 'profile_id', 'kind', 'quote_text', 'body',
    'page_label', 'current_page_snapshot', 'progress_percent_snapshot',
    'total_pages_snapshot', 'media_path', 'media_url', 'visibility',
    'created_at', 'updated_at',
  ],
  meetups: [
    'id', 'room_id', 'host_id', 'title', 'description', 'starting_book_title',
    'starting_book_author', 'starting_book_publisher', 'starting_book_translator',
    'starting_book_isbn', 'starting_book_cover_url', 'status', 'starts_at', 'city',
    'country', 'venue_name', 'latitude', 'longitude', 'created_at', 'updated_at',
  ],
  media_assets: [
    'id', 'owner_id', 'room_id', 'bucket', 'object_path', 'mime_type', 'width',
    'height', 'created_at',
  ],
  push_tokens: [
    'id', 'profile_id', 'expo_push_token', 'device_platform', 'last_seen_at', 'created_at',
  ],
  notifications: ['id', 'profile_id', 'title', 'body', 'data', 'read_at', 'created_at'],
  reports: [
    'id', 'reporter_id', 'room_id', 'post_id', 'comment_id', 'reason', 'details',
    'resolved_at', 'created_at',
  ],
  market_listings: [
    'id', 'seller_id', 'type', 'title', 'author', 'isbn13', 'description',
    'condition_label', 'price', 'area_label', 'image_url', 'media_asset_id',
    'status', 'created_at', 'updated_at',
  ],
  market_threads: [
    'id', 'listing_id', 'buyer_id', 'seller_id', 'created_at', 'updated_at',
  ],
  market_messages: ['id', 'thread_id', 'sender_id', 'body', 'created_at'],
};

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

async function latestFile(prefix, suffix) {
  const names = (await readdir(backupDirectory))
    .filter((name) => name.startsWith(prefix) && name.endsWith(suffix))
    .sort();
  const name = names.at(-1);
  if (!name) throw new Error(`No ${prefix}*${suffix} file found`);
  return path.join(backupDirectory, name);
}

function remapProfileId(value, sourceProfileId, targetProfileId) {
  if (value === null || value === undefined) return null;
  if (value !== sourceProfileId) {
    throw new Error(`Unexpected source profile reference: ${value}`);
  }
  return targetProfileId;
}

function toMariaDbDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error(`Invalid timestamp: ${value}`);
  return `${date.toISOString().slice(0, 23).replace('T', ' ')}000`;
}

function sqlString(value) {
  if (value.length === 0) return "''";
  return `CONVERT(0x${Buffer.from(value, 'utf8').toString('hex')} USING utf8mb4)`;
}

function sqlValue(value, column) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Invalid number for ${column}`);
    return String(value);
  }
  if (typeof value === 'object') return sqlString(JSON.stringify(value));
  if (column.endsWith('_at')) return sqlString(toMariaDbDateTime(value));
  return sqlString(String(value));
}

await loadLocalEnvironment('.env');
await loadLocalEnvironment('.env.migration.local');

const targetProfileId = process.env.BOOKSOME_TARGET_USER_ID;
if (!targetProfileId || !uuidPattern.test(targetProfileId)) {
  throw new Error('BOOKSOME_TARGET_USER_ID must be a valid UUID');
}

const exportPath = await latestFile('supabase-export-', '.json');
const source = JSON.parse(await readFile(exportPath, 'utf8'));
const sourceProfiles = source.tables.profiles;
if (sourceProfiles.length !== 1 || source.auth_users.length !== 1) {
  throw new Error('This migration expects exactly one source profile and auth user');
}

const sourceProfileId = sourceProfiles[0].id;
if (source.auth_users[0].id !== sourceProfileId) {
  throw new Error('Source profile does not match the source auth user');
}

const mediaPathMap = new Map();
const mediaManifest = [];
let skippedSupersededProfileMedia = 0;
for (const asset of source.tables.media_assets) {
  if (
    asset.object_path === sourceProfiles[0].avatar_path &&
    asset.object_path.startsWith('avatars/')
  ) {
    skippedSupersededProfileMedia += 1;
    continue;
  }

  const parts = asset.object_path.split('/');
  const directory = parts[0];
  const fileName = parts.at(-1);
  if (!['avatars', 'room-covers', 'meetups', 'post-media'].includes(directory)) {
    throw new Error(`Unsupported media directory: ${directory}`);
  }
  if (!fileName || !mediaFilePattern.test(fileName)) {
    throw new Error(`Unsupported media file name for asset ${asset.id}`);
  }

  const containerId = directory === 'room-covers' && asset.room_id
    ? asset.room_id
    : targetProfileId;
  const targetObjectPath = `${directory}/${containerId}/${fileName}`;
  if ([...mediaPathMap.values()].includes(targetObjectPath)) {
    throw new Error(`Duplicate target media path: ${targetObjectPath}`);
  }

  mediaPathMap.set(asset.object_path, targetObjectPath);
  mediaManifest.push({
    id: asset.id,
    source_object_path: asset.object_path,
    target_object_path: targetObjectPath,
    mime_type: asset.mime_type,
    size: null,
    sha256: null,
  });
}

const apiBaseUrl = (process.env.BOOKSOME_API_BASE_URL ?? 'https://api.booksome.top').replace(/\/$/u, '');

function rewriteObjectPath(value) {
  if (!value) return value;
  const mapped = mediaPathMap.get(value);
  if (mapped) return mapped;
  const directory = value.split('/')[0];
  if (['avatars', 'room-covers', 'meetups', 'post-media'].includes(directory)) {
    throw new Error(`Media path has no metadata row: ${value}`);
  }
  return value;
}

function rewriteMediaUrl(value, preferredPath = null) {
  if (!value) return value;
  if (preferredPath && mediaPathMap.has(preferredPath)) {
    return `${apiBaseUrl}/api/media/${mediaPathMap.get(preferredPath)}`;
  }
  for (const [sourcePath, targetPath] of mediaPathMap) {
    const encodedSource = sourcePath.split('/').map(encodeURIComponent).join('/');
    if (value.includes(sourcePath) || value.includes(encodedSource)) {
      return `${apiBaseUrl}/api/media/${targetPath}`;
    }
  }
  return value;
}

const transformed = structuredClone(source.tables);
transformed.media_assets = transformed.media_assets.filter((row) =>
  mediaPathMap.has(row.object_path),
);
let remappedReadingBookStatuses = 0;
for (const row of transformed.book_works) {
  row.cover_path = rewriteObjectPath(row.cover_path);
  row.external_cover_url = rewriteMediaUrl(row.external_cover_url, row.cover_path);
}
for (const row of transformed.book_editions) {
  row.cover_path = rewriteObjectPath(row.cover_path);
  row.external_cover_url = rewriteMediaUrl(row.external_cover_url, row.cover_path);
}
for (const row of transformed.rooms) {
  row.founder_id = remapProfileId(row.founder_id, sourceProfileId, targetProfileId);
  row.cover_path = rewriteObjectPath(row.cover_path);
  row.external_cover_url = rewriteMediaUrl(row.external_cover_url, row.cover_path);
}
for (const row of transformed.room_members) {
  row.profile_id = remapProfileId(row.profile_id, sourceProfileId, targetProfileId);
}
for (const row of transformed.posts) {
  row.author_id = remapProfileId(row.author_id, sourceProfileId, targetProfileId);
}
for (const row of transformed.comments) {
  row.author_id = remapProfileId(row.author_id, sourceProfileId, targetProfileId);
}
for (const row of transformed.reactions) {
  row.profile_id = remapProfileId(row.profile_id, sourceProfileId, targetProfileId);
}
for (const row of transformed.reading_sessions) {
  row.host_id = remapProfileId(row.host_id, sourceProfileId, targetProfileId);
}
for (const row of transformed.reading_books) {
  row.profile_id = remapProfileId(row.profile_id, sourceProfileId, targetProfileId);
  if (row.status === 'want_to_read' || row.status === 'paused') {
    row.status = 'reading';
    remappedReadingBookStatuses += 1;
  }
  row.external_cover_url = rewriteMediaUrl(row.external_cover_url);
}
for (const row of transformed.reading_notes) {
  row.profile_id = remapProfileId(row.profile_id, sourceProfileId, targetProfileId);
  const sourceMediaPath = row.media_path;
  row.media_path = rewriteObjectPath(sourceMediaPath);
  row.media_url = rewriteMediaUrl(row.media_url, sourceMediaPath);
}
for (const row of transformed.meetups) {
  row.host_id = remapProfileId(row.host_id, sourceProfileId, targetProfileId);
  row.starting_book_cover_url = rewriteMediaUrl(row.starting_book_cover_url);
}
for (const row of transformed.media_assets) {
  row.owner_id = remapProfileId(row.owner_id, sourceProfileId, targetProfileId);
  row.bucket = 'local';
  row.object_path = mediaPathMap.get(row.object_path);
}
for (const row of transformed.push_tokens) {
  row.profile_id = remapProfileId(row.profile_id, sourceProfileId, targetProfileId);
}
for (const row of transformed.notifications) {
  row.profile_id = remapProfileId(row.profile_id, sourceProfileId, targetProfileId);
}
for (const row of transformed.reports) {
  row.reporter_id = remapProfileId(row.reporter_id, sourceProfileId, targetProfileId);
}
for (const row of transformed.market_listings) {
  row.seller_id = remapProfileId(row.seller_id, sourceProfileId, targetProfileId);
  row.image_url = rewriteMediaUrl(row.image_url);
}
for (const row of transformed.market_threads) {
  row.buyer_id = remapProfileId(row.buyer_id, sourceProfileId, targetProfileId);
  row.seller_id = remapProfileId(row.seller_id, sourceProfileId, targetProfileId);
}
for (const row of transformed.market_messages) {
  row.sender_id = remapProfileId(row.sender_id, sourceProfileId, targetProfileId);
}

const sql = [
  '-- Generated BookSome Supabase-to-MariaDB import',
  `-- Source: ${path.basename(exportPath)}`,
  `-- Target profile: ${targetProfileId}`,
  'SET NAMES utf8mb4;',
  "SET time_zone = '+00:00';",
  "SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION';",
  'START TRANSACTION;',
];

for (const [table, columns] of Object.entries(tableColumns)) {
  for (const row of transformed[table]) {
    const values = columns.map((column) => sqlValue(row[column], column));
    sql.push(
      `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(', ')})`,
      `VALUES (${values.join(', ')});`,
    );
  }
}
sql.push('COMMIT;', '');

const sourceStamp = path.basename(exportPath).slice('supabase-export-'.length, -'.json'.length);
const sqlPath = path.join(backupDirectory, `mariadb-import-${sourceStamp}.sql`);
const manifestPath = path.join(backupDirectory, `media-manifest-${sourceStamp}.json`);

await mkdir(backupDirectory, { recursive: true });
await writeFile(sqlPath, `${sql.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
await writeFile(
  manifestPath,
  `${JSON.stringify({
    format: 'booksome-media-manifest-v1',
    source_export: path.basename(exportPath),
    target_profile_id: targetProfileId,
    assets: mediaManifest,
  }, null, 2)}\n`,
  { encoding: 'utf8', mode: 0o600 },
);
await chmod(sqlPath, 0o600);
await chmod(manifestPath, 0o600);

for (const [table, rows] of Object.entries(transformed)) {
  if (table in tableColumns) console.log(`${table}: ${rows.length}`);
}
console.log(`media_paths_rewritten: ${mediaPathMap.size}`);
console.log(`superseded_profile_media_skipped: ${skippedSupersededProfileMedia}`);
console.log(`reading_book_statuses_remapped: ${remappedReadingBookStatuses}`);
console.log(`profile_rows_preserved_on_target: ${sourceProfiles.length}`);
console.log(`Saved SQL: ${path.relative(projectRoot, sqlPath)}`);
console.log(`Saved media manifest: ${path.relative(projectRoot, manifestPath)}`);
