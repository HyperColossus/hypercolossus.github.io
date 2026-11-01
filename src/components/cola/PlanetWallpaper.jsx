import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { backdrop, createBottle, createStage } from './bottle';

// Desktop wallpaper: the capped HYPER bottle, 80% full, turning slowly in space like a planet,
// with rings, orbiting stars and a starfield. Renders at ~30 fps at 1x resolution to stay light,
// and holds a single still frame when the visitor prefers reduced motion.
const FPS = 30;

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d');
  const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,236,200,0.85)');
  gradient.addColorStop(1, 'rgba(255,200,150,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Saturn-style rings: bands of warm, translucent colour, shaded by distance from the centre.
function rings(inner, outer) {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uInner: { value: inner }, uOuter: { value: outer } },
    vertexShader: 'varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform float uInner; uniform float uOuter; varying vec3 vPos;
      void main() {
        float t = (length(vPos.xy) - uInner) / (uOuter - uInner);
        float bands = 0.55 + 0.25 * sin(t * 42.0) + 0.2 * sin(t * 11.0 + 1.3);
        float gap = smoothstep(0.58, 0.6, t) * (1.0 - smoothstep(0.64, 0.66, t)); // a Cassini-style gap
        float edge = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.9, 1.0, t));
        vec3 color = mix(vec3(0.95, 0.78, 0.55), vec3(0.62, 0.42, 0.32), t) * (0.75 + 0.35 * bands);
        gl_FragColor = vec4(color, edge * (1.0 - gap * 0.85) * (0.35 + 0.35 * bands));
      }`,
  });
  return new THREE.Mesh(new THREE.RingGeometry(inner, outer, 160, 1), material);
}

function starfield(count) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 6 + Math.random() * 6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions.set([r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), -Math.abs(r * Math.sin(phi) * Math.sin(theta)) - 2], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#dfe8ff', size: 0.035, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false }));
}

export default function PlanetWallpaper() {
  const host = useRef(null);

  useEffect(() => {
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const stage = createStage(host.current, { fov: 32, pixelRatio: 1, background: backdrop({ top: '#0a0920', bottom: '#05040f', glow: 'rgba(92,60,170,0.55)', glowAt: [0.62, 0.45] }) });
    const { scene, camera } = stage;

    const planet = new THREE.Group();          // axial tilt
    planet.rotation.z = 0.32;
    planet.rotation.x = 0.12;
    planet.position.set(0.42, 0, 0);            // right of centre, clear of the desktop icons
    const spin = new THREE.Group();            // turns the bottle about its own axis
    const bottle = createBottle({ fill: 0.8, capped: true });
    bottle.group.position.y = -0.5;
    spin.add(bottle.group);
    planet.add(spin);

    const ring = rings(0.36, 0.72);
    ring.rotation.x = -Math.PI / 2 + 0.22;
    ring.position.y = -0.04;
    planet.add(ring);

    const glow = glowTexture();
    const moons = [0.95, 1.15, 1.4].map((radius, i) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: ['#fff3d6', '#bfe3ff', '#ffd1e8'][i] }));
      sprite.scale.setScalar([0.1, 0.075, 0.06][i]);
      planet.add(sprite);
      return { sprite, radius, speed: [0.35, -0.22, 0.16][i], phase: i * 2.1, lift: [0.12, -0.18, 0.28][i] };
    });
    scene.add(planet, starfield(700));
    camera.position.set(0, 0.02, 2.95);
    camera.lookAt(0.2, 0, 0);

    let frame = 0;
    let last = 0;
    const draw = now => {
      const t = now / 1000;
      spin.rotation.y = t * 0.18;
      bottle.update();
      for (const moon of moons) {
        const a = t * moon.speed + moon.phase;
        moon.sprite.position.set(Math.cos(a) * moon.radius, moon.lift + Math.sin(a) * 0.05, Math.sin(a) * moon.radius * 0.45);
      }
      stage.render();
    };
    const tick = now => {
      frame = requestAnimationFrame(tick);
      if (now - last < 1000 / FPS) return;
      last = now;
      draw(now);
    };
    if (still) draw(8000); else frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); glow.dispose(); stage.dispose(); };
  }, []);

  return <div ref={host} className="os-wallpaper" aria-hidden="true" />;
}
