import * as THREE from 'three';
import type { GameSnapshot, IRenderer } from '../core/types';

/**
 * Three.js r186+ renderer adapter:
 * - Uses THREE.Timer (replaces deprecated THREE.Clock)
 * - Keeps all Object3D scales at (1, 1, 1)
 * - Skips redundant renders when tab is hidden
 * - Explicitly traverses and disposes geometries + materials on teardown
 */
export class ThreeRenderer implements IRenderer {
  readonly engineName = 'three';

  private container: HTMLElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private timer = new THREE.Timer();

  private playerMesh: THREE.Mesh | null = null;
  private readonly collectibleMeshes = new Map<number, THREE.Mesh>();
  private readonly hazardMeshes = new Map<number, THREE.Mesh>();

  private collectibleGeo: THREE.OctahedronGeometry | null = null;
  private collectibleMat: THREE.MeshStandardMaterial | null = null;
  private hazardGeo: THREE.BoxGeometry | null = null;
  private hazardMat: THREE.MeshStandardMaterial | null = null;

  init(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x0b1020, 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 100);
    camera.position.set(0, 14, 13);
    camera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    const dirLight = new THREE.DirectionalLight(0xe0f2fe, 1.4);
    dirLight.position.set(6, 12, 8);
    scene.add(ambient, dirLight);

    const floorGeo = new THREE.PlaneGeometry(16, 9);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI * 0.5;
    scene.add(floor);

    const grid = new THREE.GridHelper(16, 16, 0x38bdf8, 0x1e293b);
    grid.position.y = 0.01;
    scene.add(grid);

    const playerGeo = new THREE.SphereGeometry(0.34, 20, 16);
    const playerMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
    });
    const playerMesh = new THREE.Mesh(playerGeo, playerMat);
    playerMesh.position.y = 0.36;
    scene.add(playerMesh);

    this.collectibleGeo = new THREE.OctahedronGeometry(0.24, 0);
    this.collectibleMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xca8a04,
      emissiveIntensity: 0.5,
    });

    this.hazardGeo = new THREE.BoxGeometry(0.46, 0.46, 0.46);
    this.hazardMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xbe123c,
      emissiveIntensity: 0.4,
    });

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.playerMesh = playerMesh;

    this.resize(container.clientWidth || 800, container.clientHeight || 450);
  }

  resize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    const aspect = 16 / 9;
    let targetW = Math.max(320, width);
    let targetH = Math.round(targetW / aspect);
    if (targetH > height && height >= 180) {
      targetH = height;
      targetW = Math.round(targetH * aspect);
    }

    this.camera.aspect = targetW / targetH;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(targetW, targetH, true);
  }

  render(snapshot: GameSnapshot, _alpha: number): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (!this.renderer || !this.scene || !this.camera || !this.playerMesh) return;

    this.timer.update();
    const toWorldX = (px: number): number => (px / snapshot.world.width - 0.5) * 16;
    const toWorldZ = (py: number): number => (py / snapshot.world.height - 0.5) * 9;

    const blinkHidden =
      snapshot.player.invulnTimer > 0 && Math.floor(snapshot.player.invulnTimer * 18) % 2 === 0;
    this.playerMesh.visible = !blinkHidden;
    this.playerMesh.position.set(toWorldX(snapshot.player.x), 0.36, toWorldZ(snapshot.player.y));

    const seenCollectibles = new Set<number>();
    for (const c of snapshot.collectibles) {
      seenCollectibles.add(c.id);
      let mesh = this.collectibleMeshes.get(c.id);
      if (!mesh && this.collectibleGeo && this.collectibleMat) {
        mesh = new THREE.Mesh(this.collectibleGeo, this.collectibleMat);
        this.collectibleMeshes.set(c.id, mesh);
        this.scene.add(mesh);
      }
      if (mesh) {
        mesh.position.set(toWorldX(c.x), 0.35 + Math.sin(c.pulsePhase) * 0.08, toWorldZ(c.y));
        mesh.rotation.y = c.pulsePhase;
      }
    }
    for (const [id, mesh] of this.collectibleMeshes) {
      if (!seenCollectibles.has(id)) {
        this.scene.remove(mesh);
        this.collectibleMeshes.delete(id);
      }
    }

    const seenHazards = new Set<number>();
    for (const h of snapshot.hazards) {
      seenHazards.add(h.id);
      let mesh = this.hazardMeshes.get(h.id);
      if (!mesh && this.hazardGeo && this.hazardMat) {
        mesh = new THREE.Mesh(this.hazardGeo, this.hazardMat);
        this.hazardMeshes.set(h.id, mesh);
        this.scene.add(mesh);
      }
      if (mesh) {
        mesh.position.set(toWorldX(h.x), 0.25, toWorldZ(h.y));
        mesh.rotation.y = h.angle;
      }
    }
    for (const [id, mesh] of this.hazardMeshes) {
      if (!seenHazards.has(id)) {
        this.scene.remove(mesh);
        this.hazardMeshes.delete(id);
      }
    }

    const shakeX = snapshot.shakeTimer > 0 ? Math.sin(snapshot.tick * 1.9) * 0.18 : 0;
    const shakeY = snapshot.shakeTimer > 0 ? Math.cos(snapshot.tick * 2.3) * 0.14 : 0;
    this.camera.position.set(shakeX, 14 + shakeY, 13);
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      this.scene.clear();
      this.scene = null;
    }

    this.collectibleGeo?.dispose();
    this.collectibleMat?.dispose();
    this.hazardGeo?.dispose();
    this.hazardMat?.dispose();
    this.collectibleMeshes.clear();
    this.hazardMeshes.clear();

    if (this.renderer) {
      const dom = this.renderer.domElement;
      if (dom.parentElement === this.container) {
        this.container?.removeChild(dom);
      }
      this.renderer.dispose();
      this.renderer = null;
    }

    this.camera = null;
    this.playerMesh = null;
    this.container = null;
  }
}

export function createRenderer(): IRenderer {
  return new ThreeRenderer();
}
