import * as THREE from 'three';
import type {StudyBackdrop} from './types';

// A restrained perspective keeps the miniature composition while showing real
// near/far scale. Zoom changes the lens, not the eye's distance to the room.
export const STUDY_VIEW_DISTANCE = 32;

export function createStudyCamera() {
  return new THREE.PerspectiveCamera(20, 1, .1, 160);
}

export function studyCameraPose(direction: [number, number, number], focus: [number, number, number], zoom: number) {
  const target = new THREE.Vector3(...focus);
  const eye = new THREE.Vector3(...direction).normalize().multiplyScalar(STUDY_VIEW_DISTANCE).add(target);
  return { eye, target, zoom };
}

export function studyRoomPose(backdrop:StudyBackdrop) {
  return studyCameraPose([-16,backdrop==='forest'?4.0:3.0,22],[-1.3,1.6,.3],.79);
}

export function resizeStudyCamera(camera: THREE.PerspectiveCamera, width: number, height: number) {
  camera.aspect = width / height;
  const vertical = Math.max(11.3, 15.7 / camera.aspect);
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(vertical / (2 * STUDY_VIEW_DISTANCE)));
  camera.updateProjectionMatrix();
}

export function studyViewSize(camera: THREE.PerspectiveCamera, distance: number) {
  const height = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()) / 2);
  return { width: height * camera.aspect, height };
}
