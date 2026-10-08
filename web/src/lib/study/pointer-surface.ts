import type {Object3D} from 'three';

/** Window glass is a visual surface, while opaque furniture still occludes a
 * book. Check ancestors as well as the hit mesh so hidden themes cannot block. */
export function blocksStudyPointer(surface:Object3D) {
  for(let object:Object3D|null=surface;object;object=object.parent) {
    if(!object.visible||object.userData.pointerPassThrough)return false;
  }
  return true;
}
