export type DeskBody = { id: string; x: number; z: number; width: number; depth: number; bottom: number; top: number };
export type DeskBounds = { minX: number; maxX: number; minZ: number; maxZ: number };

// Furniture supports books intentionally. Only independent tabletop props are
// movable; vertically separated objects (including stacked books) do not collide.
export function deskBodiesOverlap(a: DeskBody, b: DeskBody, gap = .045) {
  return a.top > b.bottom + .003 && b.top > a.bottom + .003
    && Math.abs(a.x - b.x) < (a.width + b.width) / 2 + gap - 1e-6
    && Math.abs(a.z - b.z) < (a.depth + b.depth) / 2 + gap - 1e-6;
}

/** Move props the shortest available distance, including pushes along the table edge. */
export function resolveDeskCollisions(props: DeskBody[], obstacles: DeskBody[], bounds: DeskBounds, gap = .045) {
  const placed: DeskBody[] = [];
  for (const prop of props) {
    const blockers = [...obstacles, ...placed].filter(other => prop.top > other.bottom + .003 && other.top > prop.bottom + .003);
    const minX = bounds.minX + prop.width / 2, maxX = bounds.maxX - prop.width / 2;
    const minZ = bounds.minZ + prop.depth / 2, maxZ = bounds.maxZ - prop.depth / 2;
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const current = { ...prop, x: clamp(prop.x, minX, maxX), z: clamp(prop.z, minZ, maxZ) };
    if (!blockers.some(other => deskBodiesOverlap(current, other, gap))) { placed.push(current); continue; }
    const xs = [clamp(prop.x, minX, maxX), minX, maxX];
    const zs = [clamp(prop.z, minZ, maxZ), minZ, maxZ];
    for (const other of blockers) {
      xs.push(other.x - (prop.width + other.width) / 2 - gap, other.x + (prop.width + other.width) / 2 + gap);
      zs.push(other.z - (prop.depth + other.depth) / 2 - gap, other.z + (prop.depth + other.depth) / 2 + gap);
    }
    let best: DeskBody | null = null, distance = Infinity;
    for (const x of xs) for (const z of zs) {
      if (x < minX - 1e-6 || x > maxX + 1e-6 || z < minZ - 1e-6 || z > maxZ + 1e-6) continue;
      const candidate = { ...prop, x, z }, score = (x - prop.x) ** 2 + (z - prop.z) ** 2;
      if (score < distance && !blockers.some(other => deskBodiesOverlap(candidate, other, gap))) { best = candidate; distance = score; }
    }
    // Report unresolved occupancy instead of hiding a prop or pushing it off-table.
    placed.push(best ?? { ...prop, x: clamp(prop.x, minX, maxX), z: clamp(prop.z, minZ, maxZ) });
  }
  return placed;
}
