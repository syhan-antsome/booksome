import * as THREE from 'three';

/** Rest the lowest transformed corner on a world-space support plane. */
export function groundStudyObject(object: THREE.Object3D, height = 0, clearance = .003, contactObject: THREE.Object3D = object) {
  object.updateWorldMatrix(true, true);
  // Rotating a mesh's cached box can create an empty corner below its actual
  // feet. Exact vertices are needed for grounding imported furniture.
  const bounds = new THREE.Box3().setFromObject(contactObject, true);
  if (bounds.isEmpty()) return;
  const worldPosition = object.getWorldPosition(new THREE.Vector3());
  worldPosition.y += height + clearance - bounds.min.y;
  if (object.parent) object.parent.worldToLocal(worldPosition);
  object.position.copy(worldPosition);
  object.updateWorldMatrix(true, true);
}
