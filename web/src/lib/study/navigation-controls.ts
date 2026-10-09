import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import type {StudyBackdrop} from './types';
import {TREEHOUSE_HEIGHT} from './scenery-options';

// Positive elevation looks down into the room; negative elevation looks up at the sky.
export const PENTHOUSE_ELEVATION = {min:-45,max:30} as const;
export const FOREST_ELEVATION={min:-45,max:30} as const;
export const FOREST_MIN_EYE_Y=-TREEHOUSE_HEIGHT+.9;

export function setStudyControlLimits(controls:OrbitControls,backdrop:StudyBackdrop){
  const limits=backdrop==='forest'?FOREST_ELEVATION:PENTHOUSE_ELEVATION;
  controls.minPolarAngle=THREE.MathUtils.degToRad(90-limits.max);
  controls.maxPolarAngle=THREE.MathUtils.degToRad(90-limits.min);
  if(backdrop==='forest'){
    // The treehouse can be viewed from below. Keep the eye above the forest
    // ground, rather than above the deck, so the skyward view remains available.
    const distance=Math.max(.1,controls.object.position.distanceTo(controls.target));
    const heightLimit=Math.acos(THREE.MathUtils.clamp((FOREST_MIN_EYE_Y-controls.target.y)/distance,-1,1));
    controls.maxPolarAngle=Math.min(controls.maxPolarAngle,heightLimit);
  }
}

export function createStudyControls(camera:THREE.PerspectiveCamera,element:HTMLElement|null,backdrop:StudyBackdrop,target:THREE.Vector3) {
  camera.up.set(0,1,0);
  const controls=new OrbitControls(camera,element);
  controls.target.copy(target);
  controls.minZoom=.65;controls.maxZoom=3.6;
  // The scene owns optical zoom and screen-space mouse/touch pan.
  controls.enablePan=false;controls.enableZoom=false;controls.rotateSpeed=.7;
  setStudyControlLimits(controls,backdrop);
  controls.update();
  return controls;
}

export function setStudyNavigation(controls:OrbitControls,mode:'orbit'|'pan') {
  controls.enableRotate=mode==='orbit';
  controls.mouseButtons.LEFT=mode==='pan'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;
}

export function resizeStudyControls(controls:OrbitControls) {
  // OrbitControls reads the current element dimensions for every gesture.
  controls.update();
}
