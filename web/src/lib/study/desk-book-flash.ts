import * as THREE from 'three';

/** A single warm pulse, using private materials so nearby objects never flash. */
export class DeskBookFlash {
  readonly duration = 420;
  strength = 0;
  private readonly originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private readonly glowing: THREE.MeshStandardMaterial[] = [];
  private readonly sparkles = new THREE.Group();
  private readonly starMaterial = new THREE.MeshBasicMaterial({ color: '#fff2ba', transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  private readonly starGeometry: THREE.ShapeGeometry;

  constructor(object: THREE.Object3D, parent: THREE.Group, readonly started: number) {
    object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      const original = child.material as THREE.Material | THREE.Material[];
      const copy = (material: THREE.Material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return material;
        const clone = material.clone();
        clone.emissive.set('#ffe4a1'); clone.emissiveIntensity = 0;
        this.glowing.push(clone); return clone;
      };
      this.originals.set(child, original);
      child.material = Array.isArray(original) ? original.map(copy) : copy(original);
    });
    const star = new THREE.Shape();
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4, radius = i % 2 ? .037 : .16;
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (i === 0) star.moveTo(x, y); else star.lineTo(x, y);
    }
    star.closePath(); this.starGeometry = new THREE.ShapeGeometry(star);
    const bounds = new THREE.Box3().setFromObject(object), center = bounds.getCenter(new THREE.Vector3());
    const width = bounds.max.x - bounds.min.x;
    for (const [x, z, size] of [[-.32, .1, .7], [0, -.18, 1], [.32, .15, .6]]) {
      const mesh = new THREE.Mesh(this.starGeometry, this.starMaterial);
      // Feedback must not intercept a second click on the book underneath.
      mesh.raycast = () => {};
      mesh.position.set(center.x + width * x, bounds.max.y + .17, center.z + z);
      mesh.userData.size = size; this.sparkles.add(mesh);
    }
    parent.add(this.sparkles);
  }

  update(now: number, camera: THREE.Camera) {
    const t = THREE.MathUtils.clamp((now - this.started) / this.duration, 0, 1);
    const pulse = Math.sin(t * Math.PI);
    this.strength = pulse;
    this.glowing.forEach(material => { material.emissiveIntensity = pulse * .85; });
    this.starMaterial.opacity = pulse;
    this.sparkles.children.forEach(star => {
      star.quaternion.copy(camera.quaternion);
      star.scale.setScalar((.6 + pulse * .4) * star.userData.size);
    });
    return t < 1;
  }

  dispose() {
    for (const [mesh, material] of this.originals) mesh.material = material;
    this.originals.clear(); this.glowing.forEach(material => material.dispose());
    this.sparkles.removeFromParent(); this.starGeometry.dispose(); this.starMaterial.dispose();
  }
}
