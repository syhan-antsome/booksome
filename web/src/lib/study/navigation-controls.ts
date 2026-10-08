import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TrackballControls} from 'three/addons/controls/TrackballControls.js';
import type {StudyBackdrop} from './types';

// Positive elevation looks down into the room; negative elevation looks up at the sky.
export const PENTHOUSE_ELEVATION = {min:-45,max:30} as const;

export function createStudyControls(camera:THREE.PerspectiveCamera,element:HTMLElement|null,backdrop:StudyBackdrop,target:THREE.Vector3) {
  if(backdrop==='new-york')camera.up.set(0,1,0);
  const controls=backdrop==='new-york'?new OrbitControls(camera,element):new TrackballControls(camera,element);
  controls.target.copy(target);
  controls.minZoom=.65;controls.maxZoom=3.6;
  // The scene owns optical zoom and screen-space mouse/touch pan.
  if(controls instanceof OrbitControls){
    controls.enablePan=false;controls.enableZoom=false;controls.rotateSpeed=.7;
    controls.minPolarAngle=THREE.MathUtils.degToRad(90-PENTHOUSE_ELEVATION.max);
    controls.maxPolarAngle=THREE.MathUtils.degToRad(90-PENTHOUSE_ELEVATION.min);
  }else{
    controls.staticMoving=true;controls.rotateSpeed=2;controls.panSpeed=1;
    controls.keys=['','',''];controls.noPan=true;controls.noZoom=true;
  }
  controls.update();
  return controls;
}

export function setStudyNavigation(controls:OrbitControls|TrackballControls,mode:'orbit'|'pan') {
  if(controls instanceof OrbitControls)controls.enableRotate=mode==='orbit';
  else controls.noRotate=mode==='pan';
  controls.mouseButtons.LEFT=mode==='pan'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;
}

export function resizeStudyControls(controls:OrbitControls|TrackballControls) {
  if(controls instanceof TrackballControls&&controls.domElement)controls.handleResize();
}
