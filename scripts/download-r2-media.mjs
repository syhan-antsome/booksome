import { createHash } from 'node:crypto';
import { chmod, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const backupDirectory = path.join(projectRoot, 'data-backups');

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

function detectContentType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

await loadLocalEnvironment('.env');

const mediaApiUrl = (
  process.env.CLOUDFLARE_MEDIA_API_URL ?? process.env.EXPO_PUBLIC_MEDIA_API_URL
)?.replace(/\/$/u, '');
if (!mediaApiUrl) throw new Error('CLOUDFLARE_MEDIA_API_URL is missing from .env.migration.local');

const manifestName = (await readdir(backupDirectory))
  .filter((name) => name.startsWith('media-manifest-') && name.endsWith('.json'))
  .sort()
  .at(-1);
if (!manifestName) throw new Error('No media manifest found');

const manifestPath = path.join(backupDirectory, manifestName);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const stamp = manifestName.slice('media-manifest-'.length, -'.json'.length);
const mediaRoot = path.resolve(backupDirectory, `media-${stamp}`);
const checksumLines = [];

for (const [index, asset] of manifest.assets.entries()) {
  const encodedPath = asset.source_object_path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${mediaApiUrl}/v1/media/${encodedPath}`, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Media asset ${asset.id} returned HTTP ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const detectedContentType = detectContentType(bytes);
  if (!detectedContentType || (asset.mime_type && detectedContentType !== asset.mime_type)) {
    throw new Error(`Media asset ${asset.id} failed content validation`);
  }

  const targetPath = path.resolve(mediaRoot, asset.target_object_path);
  if (!targetPath.startsWith(`${mediaRoot}${path.sep}`)) {
    throw new Error(`Media asset ${asset.id} has an unsafe target path`);
  }

  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, bytes, { mode: 0o600 });
  await chmod(targetPath, 0o600);

  asset.size = bytes.length;
  asset.sha256 = createHash('sha256').update(bytes).digest('hex');
  asset.detected_mime_type = detectedContentType;
  checksumLines.push(`${asset.sha256}  ${asset.target_object_path}`);
  console.log(`downloaded: ${index + 1}/${manifest.assets.length}`);
}

const checksumPath = path.join(mediaRoot, 'SHA256SUMS');
await writeFile(checksumPath, `${checksumLines.join('\n')}\n`, {
  encoding: 'utf8',
  mode: 0o600,
});
await chmod(checksumPath, 0o600);

manifest.downloaded_at = new Date().toISOString();
manifest.media_directory = path.relative(projectRoot, mediaRoot);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
  encoding: 'utf8',
  mode: 0o600,
});
await chmod(manifestPath, 0o600);

console.log(`Saved media files: ${path.relative(projectRoot, mediaRoot)}`);
console.log(`Verified media files: ${manifest.assets.length}`);
