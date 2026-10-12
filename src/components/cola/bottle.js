// The HYPER soda bottle, built in three.js. A classic 330 ml glass soda bottle: slim straight body,
// long tapering shoulder, ringed neck and a crown cap, with see-through reddish-brown cola that can
// be filled to any level and 'HYPER' embossed into a frosted band on the glass.
// Used by the boot screen (BootBottle.jsx) and the desktop wallpaper (PlanetWallpaper.jsx).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// HYPER brand colour: the crown cap.
export const HYPER_COLORS = { cap: '#2c1a63' };

// Outline of the glass, from the base (y = 0) to the lip (y = 1). [radius, height]
const OUTER = [
  [0, 0], [0.108, 0], [0.124, 0.006], [0.131, 0.025], [0.133, 0.06], [0.133, 0.54], [0.13, 0.585], [0.121, 0.635],
  [0.106, 0.69], [0.089, 0.745], [0.074, 0.8], [0.064, 0.85], [0.06, 0.89], [0.063, 0.897], [0.063, 0.91],
  [0.059, 0.917], [0.059, 0.94], [0.066, 0.948], [0.068, 0.972], [0.064, 0.988], [0.056, 1],
];
// The cola follows the glass a wall's thickness in, from the thick base up to just under the lip.
const INNER = OUTER.filter(([, y]) => y > 0.03 && y < 0.985).map(([r, y]) => [Math.max(0, r - 0.0095), y]);
INNER.unshift([0, 0.045], [0.11, 0.045]);
INNER.push([0.045, 0.99], [0, 0.99]);
const BAND = { radius: 0.1338, height: 0.2, y: 0.33 };

const lathe = (points, segments) => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);

// The embossed band: 'HYPER' pressed into the glass (front and back) between two raised rings.
// Drawn as a height map, then turned into a normal map for the lighting and an alpha map that
// frosts the raised glass, so the lettering reads clearly against the dark cola.
function embossMaps() {
  const W = 2048, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.filter = 'blur(3px)'; // rounded edges on the raised glass
  g.fillStyle = '#fff';
  g.fillRect(0, 30, W, 16); g.fillRect(0, H - 46, W, 16); // raised rings
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const center of [512, 1536]) { // the front and the back of the bottle
    g.font = '700 165px "Didot", "Bodoni 72", "Playfair Display", Georgia, "Times New Roman", serif';
    if ('letterSpacing' in g) g.letterSpacing = '20px';
    g.fillText('HYPER', center + 10, H / 2 + 4);
  }
  g.filter = 'none';
  const height = g.getImageData(0, 0, W, H).data;
  const at = (x, y) => height[(((y + H) % H) * W + ((x + W) % W)) * 4] / 255;

  const normal = g.createImageData(W, H);
  const alpha = g.createImageData(W, H);
  const strength = 9;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * W + x) * 4;
      normal.data[i] = (-dx / len * 0.5 + 0.5) * 255;
      normal.data[i + 1] = (dy / len * 0.5 + 0.5) * 255;
      normal.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      normal.data[i + 3] = 255;
      // Clear ground, frosted raised letters and rings, like etched-and-pressed glass.
      const frost = 0.05 + 0.55 * at(x, y);
      alpha.data[i] = alpha.data[i + 1] = alpha.data[i + 2] = frost * 255;
      alpha.data[i + 3] = 255;
    }
  }
  const toTexture = (image, color) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    c.getContext('2d').putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = 8;
    return texture;
  };
  return { normalMap: toTexture(normal, false), alphaMap: toTexture(alpha, false) };
}

function crownCap() {
  const geometry = new THREE.CylinderGeometry(0.066, 0.071, 0.032, 48, 2, false);
  const position = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    const crimp = v.y < 0.01 ? 1 + 0.06 * Math.cos(Math.atan2(v.z, v.x) * 21) : 1; // the fluted skirt
    position.setXYZ(i, v.x * crimp, v.y, v.z * crimp);
  }
  geometry.computeVertexNormals();
  const cap = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({ color: HYPER_COLORS.cap, metalness: 0.75, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 }));
  cap.position.y = 0.992;
  return cap;
}

// Returns { group, setFill(0..1), update() }. Call update() after moving the bottle, so the cola
// surface stays level with the world while the bottle is tilted or turning.
export function createBottle({ fill = 0, capped = false } = {}) {
  const group = new THREE.Group();

  // Cola: deep reddish brown, with a warm red glow toward the edges where it's thin (the sheen),
  // like backlit cola in a glass bottle.
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const cola = new THREE.Mesh(lathe(INNER, 72), new THREE.MeshPhysicalMaterial({
    color: '#1e0501', emissive: '#3a0b03', emissiveIntensity: 0.55, roughness: 0.08, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.75, sheenColor: '#d23a16', sheenRoughness: 0.28,
    side: THREE.DoubleSide, clippingPlanes: [clip],
  }));

  // Clear glass: refracts what's behind it, with crisp reflections and bright edges.
  const glass = new THREE.Mesh(lathe(OUTER, 96), new THREE.MeshPhysicalMaterial({
    color: '#ffffff', transmission: 1, thickness: 0.03, roughness: 0.015, ior: 1.5,
    attenuationColor: '#e9f5ee', attenuationDistance: 2, clearcoat: 1, clearcoatRoughness: 0.02,
    specularIntensity: 1, envMapIntensity: 1.4,
  }));
  glass.renderOrder = 2;

  // Embossed band: a thin frosted skin just outside the straight part of the glass.
  const { normalMap, alphaMap } = embossMaps();
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(BAND.radius, BAND.radius, BAND.height, 128, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: '#eef3ff', normalMap, normalScale: new THREE.Vector2(2.2, 2.2), alphaMap, transparent: true,
      roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.03, clearcoatNormalMap: normalMap,
      specularIntensity: 1, envMapIntensity: 2, depthWrite: false,
    }),
  );
  band.position.y = BAND.y;
  band.rotation.y = Math.PI / 2 - 0.35; // the HYPER lettering faces the viewer (+z)
  band.renderOrder = 3;

  group.add(cola, glass, band);
  if (capped) group.add(crownCap());

  let level = fill;
  const box = new THREE.Box3();
  const update = () => {
    group.updateMatrixWorld(true);
    box.setFromObject(cola, true);
    clip.constant = box.min.y + (box.max.y - box.min.y) * level; // keep cola below this height
    cola.visible = level > 0.001;
  };
  const setFill = value => { level = Math.max(0, Math.min(1, value)); update(); };
  setFill(fill);
  return { group, setFill, update };
}

// Renderer, camera and soft studio reflections for a small scene inside a DOM element.
// Returns { renderer, scene, camera, render(), dispose() }. Keeps itself sized to `container`.
// `background` (a color or texture) is drawn by the scene itself, so the glass can refract it.
export function createStage(container, { fov = 30, pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5), background = null } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(pixelRatio);
  renderer.localClippingEnabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  if (background) scene.background = background;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose?.();
  pmrem.dispose();
  const key = new THREE.DirectionalLight('#ffffff', 1.4); key.position.set(-2, 3, 4);
  const rim = new THREE.DirectionalLight('#9fd6ff', 1.1); rim.position.set(3, 1, -2);
  scene.add(key, rim, new THREE.AmbientLight('#ffffff', 0.25));

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.01, 50);
  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  return {
    renderer, scene, camera,
    render: () => renderer.render(scene, camera),
    dispose() {
      observer.disconnect();
      scene.traverse(object => {
        object.geometry?.dispose();
        for (const material of [].concat(object.material ?? [])) { for (const key of ['map', 'normalMap', 'alphaMap']) material[key]?.dispose(); material.dispose(); }
      });
      scene.environment?.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();
    },
  };
}

// A soft vertical backdrop (with an optional glow) as a texture, for scenes whose glass should
// refract what's behind it. (The glass can't see the page's CSS background.)
export function backdrop({ top = '#07070c', bottom = '#151026', glow = null, glowAt = [0.5, 0.5] } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const g = canvas.getContext('2d');
  const linear = g.createLinearGradient(0, 0, 0, 256);
  linear.addColorStop(0, top); linear.addColorStop(1, bottom);
  g.fillStyle = linear; g.fillRect(0, 0, 256, 256);
  if (glow) {
    const radial = g.createRadialGradient(256 * glowAt[0], 256 * glowAt[1], 0, 256 * glowAt[0], 256 * glowAt[1], 180);
    radial.addColorStop(0, glow); radial.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = radial; g.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
