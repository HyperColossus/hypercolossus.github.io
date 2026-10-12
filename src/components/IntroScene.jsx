import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useCursor, useGLTF, Center, OrbitControls, Html, Sparkles, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import Desktop from './Desktop';
import VoidBackground, { VOID_COLORS } from './VoidBackground';
import { breathing } from './powerGlow';
import { DEFAULTS, tuning, tuningEnabled } from './screenTuning';
import ScreenTuner from './ScreenTuner';
import { WindowProvider } from '../WindowContext.jsx';
import { WindowContext, useWindows } from '../useWindows';

// Screen placement lives in screenTuning.js (DEFAULTS), adjustable live with ?tune.
const SCREEN = new THREE.Vector3(DEFAULTS.x, DEFAULTS.y, DEFAULTS.z);
const SCREEN_ROTATION = new THREE.Euler(DEFAULTS.tilt, 0, 0);
const BG_COLOR = VOID_COLORS.deep;

// The CRT's virtual display. The monitor keeps the same physical size in the scene (the
// distance factor shrinks as the pixel count grows); the desktop renders at 1920×1488 (about 4:3,
// like the tube) with 175% UI scaling, so it lays out in ~1097×823 and text stays readable.
const SCREEN_PX = { width: 1920, height: 1488 }; // a touch taller than 4:3, to fill the bezel opening top to bottom
const UI_SCALE = 1.75;
const SCREEN_FIT = DEFAULTS.fit; // fills the bezel opening without the bezel clipping the desktop
const SCREEN_DISTANCE_FACTOR = 0.2125 * (800 / SCREEN_PX.width) * SCREEN_FIT; // 0.2125 was tuned for an 800px-wide screen

function ComputerModel({ onClick, onShutdown, isZoomed, windowContext }) {
  const groupRef = useRef();
  const { scene } = useGLTF('/retro_computer_fixed.glb');
  const model = useMemo(() => {
    const instance = scene.clone(true);
    removeBakedScreen(instance);
    instance.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return instance;
  }, [scene]);
  useFrame((state, delta) => {
    if (groupRef.current) {
      const target = isZoomed || tuning.flags().freeze ? 0 : Math.sin(state.clock.elapsedTime * 2) * 0.025;
      groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, target, 8, delta);
    }
  }, -1); // before <Html> updates, so the screen stays locked to the bobbing monitor
  return (
    <group ref={groupRef}>
      <Center><primitive object={model} scale={2} /></Center>
      <PowerButton on={isZoomed} onPress={onClick} />
      <SmartScreen>
        <div style={{ width: SCREEN_PX.width, height: SCREEN_PX.height }} className="os-desktop overflow-hidden bg-black">
          <div style={{ width: SCREEN_PX.width / UI_SCALE, height: SCREEN_PX.height / UI_SCALE, transform: `scale(${UI_SCALE})`, transformOrigin: '0 0' }}>
            <WindowContext.Provider value={windowContext}><Desktop powered={isZoomed} onPowerOn={onClick} onShutdown={onShutdown} /></WindowContext.Provider>
          </div>
        </div>
      </SmartScreen>
    </group>
  );
}

class SceneBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function IntroScene() {
  return <WindowProvider><IntroExperience /></WindowProvider>;
}

function IntroExperience() {
  const windowContext = useWindows();
  const [isZoomed, setIsZoomed] = useState(false);
  const [directDesktop] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (directDesktop) return <div className="h-dvh w-full"><Desktop /></div>;
  const fallback = <div className="h-dvh w-full"><Desktop /></div>;
  return (
    <div className="absolute inset-0 h-dvh w-full" style={{ backgroundColor: BG_COLOR }}>
      <SceneBoundary fallback={fallback}>
        <Canvas shadows={{ type: THREE.VSMShadowMap }} dpr={[1, 1.5]} camera={{ position: [1.55, 1.1, 2.15], fov: 45 }} fallback={null}>
          <color attach="background" args={[BG_COLOR]} />
          <VoidBackground />
          <AnimatedFog isZoomed={isZoomed} />
          <ambientLight intensity={0.15} />
          <hemisphereLight args={['#aab8ff', '#3a1640', 0.65]} />
          <spotLight position={[-1.8, 3.5, 2]} color="#e0f0ff" intensity={35}
            angle={0.65} penumbra={1} decay={2} distance={12} castShadow
            shadow-mapSize={[1024, 1024]} shadow-radius={4} shadow-blurSamples={8}
            shadow-bias={-0.0003} shadow-normalBias={0.015} />
          <directionalLight position={[2, 1.5, -3]} color="#d7a6ff" intensity={1.5} />
          <directionalLight position={[-3, 1, 3]} color="#556688" intensity={0.55} />
          {/* No floor and no ground shadow: the computer floats freely in space. */}
          <Sparkles count={400} scale={[15, 10, 15]} position={[0, 2, -2]}
            size={1.8} speed={0.4} opacity={0.6} color="#ffffff" raycast={() => null} />
          <React.Suspense fallback={<Html center><p className="whitespace-nowrap text-white" role="status">Loading computer…</p></Html>}>
            <ComputerModel onClick={() => setIsZoomed(true)} onShutdown={() => setIsZoomed(false)} isZoomed={isZoomed} windowContext={windowContext} />
          </React.Suspense>
          {/* The camera orbits a still computer. A slow, eased orbit keeps it comfortable on the eyes. */}
          <OrbitControls enabled={!isZoomed} enablePan={false} rotateSpeed={0.35} enableDamping dampingFactor={0.06}
            minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 2 - 0.1} minDistance={1.5} maxDistance={6} />
          <CameraZoomRig isZoomed={isZoomed} />
        </Canvas>
      </SceneBoundary>
      {tuningEnabled && <ScreenTuner />}
    </div>
  );
}

const HOME_CAMERA = new THREE.Vector3(1.55, 1.1, 2.15);

function CameraZoomRig({ isZoomed }) {
  const returning = useRef(false);
  const wasZoomed = useRef(isZoomed);
  useFrame(({ camera, size }, delta) => {
    // After Shut Down, glide back out to the starting view, then hand control back to the orbit controls.
    if (wasZoomed.current && !isZoomed) returning.current = true;
    wasZoomed.current = isZoomed;
    const alpha = 1 - Math.exp(-5 * delta);
    if (!isZoomed) {
      if (!returning.current) return;
      camera.position.lerp(HOME_CAMERA, alpha);
      camera.lookAt(0, 0, 0);
      if (camera.position.distanceTo(HOME_CAMERA) < 0.01) returning.current = false;
      return;
    }
    returning.current = false;
    // Fit both screen dimensions with room for the bezel, including portrait viewports.
    const distance = Math.max(SCREEN_H * 1.035 / 0.76, SCREEN_W * 1.035 / (size.width / size.height * 0.84)) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const t = tuning.get(); // the defaults, or live values from the Screen Tuner
    const rotation = new THREE.Euler(t.tilt, 0, 0);
    const offset = new THREE.Vector3(0, 0, distance * (t.fit / SCREEN_FIT)).applyEuler(rotation);
    camera.position.lerp(new THREE.Vector3(t.x, t.y, t.z).add(offset), alpha);
    camera.quaternion.slerp(new THREE.Quaternion().setFromEuler(rotation), alpha);
  });
  return null;
}

function AnimatedFog({ isZoomed }) {
  useFrame(({ scene }, delta) => {
    const targetDensity = isZoomed ? 0.7 : 0.15;
    const alpha = 1 - Math.exp(-3 * delta);
    if (scene.fog) {
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, targetDensity, alpha);
    }
  });
  return <fogExp2 attach="fog" args={[BG_COLOR, 0.15]} />;
}

// The model comes with its own curved screen surface, textured with a baked-in boot image (a
// third-party OS logo). It bulges in front of our flat live screen and would hide it, so remove just
// those triangles: the ones whose texture coordinates all fall inside the screen image's area of the
// 1024×1024 atlas. The rest of the model and its texture stay untouched. (Cutting the texture instead
// punched holes in other parts that share the atlas.) The screen is a handful of large triangles; the
// monitor's small front buttons also sample that part of the atlas, so only large triangles are removed
// (otherwise the buttons lose pieces).
const BAKED_SCREEN_MIN_AREA = 1e-4; // model units²; screen triangles are ~1e-3, button triangles < 1e-5
const BAKED_SCREEN_UV_PX = { minX: 499, maxX: 641, minY: 611, maxY: 797 };
function removeBakedScreen(root) {
  root.traverse(child => {
    const uv = child.isMesh && child.geometry.attributes.uv;
    if (!uv) return;
    const { minX, maxX, minY, maxY } = BAKED_SCREEN_UV_PX;
    const onScreen = i => {
      const x = uv.getX(i) * 1024, y = uv.getY(i) * 1024;
      return x >= minX && x <= maxX && y >= minY && y <= maxY;
    };
    const geometry = child.geometry.clone(); // the loaded model is cached and shared, so edit a copy
    const count = geometry.index ? geometry.index.count : geometry.attributes.position.count;
    const vertex = k => (geometry.index ? geometry.index.getX(k) : k);
    const pos = geometry.attributes.position;
    const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3();
    const area = (a, b, c) => {
      pa.fromBufferAttribute(pos, a); pb.fromBufferAttribute(pos, b); pc.fromBufferAttribute(pos, c);
      return pb.sub(pa).cross(pc.sub(pa)).length() / 2;
    };
    const keep = [];
    for (let k = 0; k < count; k += 3) {
      const a = vertex(k), b = vertex(k + 1), c = vertex(k + 2);
      const isScreen = onScreen(a) && onScreen(b) && onScreen(c) && area(a, b, c) > BAKED_SCREEN_MIN_AREA;
      if (!isScreen) keep.push(a, b, c);
    }
    if (keep.length === count) return;
    geometry.setIndex(keep);
    child.geometry = geometry;
  });
}

// Screen size in world units, and how far the glass/backing extend under the bezel.
const SCREEN_W = SCREEN_PX.width * SCREEN_DISTANCE_FACTOR / 400;
const SCREEN_H = SCREEN_PX.height * SCREEN_DISTANCE_FACTOR / 400;
const GLASS_OVERSCAN = 1.0; // the glass matches the screen exactly; larger would cover the bezel face

// The glass over the live screen (WebGL, so it sits over the HTML desktop): a faint top-left
// reflection and very light scanlines. No shadows or rounded corners; the bezel frames the screen.
const glassShader = {
  uniforms: { uHalf: { value: new THREE.Vector2(SCREEN_W / 2, SCREEN_H / 2) }, uSize: { value: new THREE.Vector2(SCREEN_W * GLASS_OVERSCAN, SCREEN_H * GLASS_OVERSCAN) } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform vec2 uSize;
    varying vec2 vUv;
    void main() {
      // No edge shadow, vignette or rounded mask: the desktop runs right to the bezel, which
      // covers the screen's edges and corners. Just faint scanlines and a soft reflection.
      float scan = (0.5 + 0.5 * sin(vUv.y * uSize.y * 3400.0)) * 0.03;
      float sheen = smoothstep(0.22, 0.0, abs(vUv.x * 0.7 + (1.0 - vUv.y) - 0.42)) * smoothstep(0.75, 0.2, vUv.x) * 0.05;
      float alpha = scan + sheen;
      vec3 color = mix(vec3(0.02, 0.02, 0.03), vec3(1.0), clamp(sheen / max(alpha, 0.001), 0.0, 1.0));
      gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
    }`,
};

// The computer's power button: the pill on the front of the base unit (next to its three round
// buttons), drawn over the model's own, with an LED in the gap to its left that pulses amber in
// standby and glows green when on. It's the only way to power on with the mouse; keyboard users can
// still Tab to the (blank) standby screen and press Enter. Position measured from the model's
// geometry, in the computer group's local space (unaffected by the float).
const POWER_BUTTON = { position: new THREE.Vector3(0.2088, -0.145, 0.3525), rotation: new THREE.Euler(0, 0, 0) };
// A soft amber halo around the button, drawn additively so it reads as light, not paint.
const haloShader = {
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform float uOpacity;
    uniform vec3 uColor;
    varying vec2 vUv;
    void main() {
      float d = length((vUv - 0.5) * 2.0);
      float a = smoothstep(1.0, 0.15, d);
      gl_FragColor = vec4(uColor, a * a * uOpacity);
    }`,
};

function PowerButton({ on, onPress }) {
  const cap = useRef();
  const led = useRef();
  const face = useRef();
  const halo = useRef();
  const haloUniforms = useMemo(() => ({ uOpacity: { value: 0 }, uColor: { value: new THREE.Color('#ffa13a') } }), []);
  const [hovered, setHovered] = useState(false);
  const pressed = useRef(0);
  useCursor(hovered && !on);
  useFrame(({ clock }, delta) => {
    pressed.current = Math.max(0, pressed.current - delta * 4);
    if (cap.current) cap.current.position.z = -0.0018 * Math.sin(Math.min(1, pressed.current) * Math.PI);
    // Standby: a steady dim LED at first; after 5s a slow breathing glow eases in (see powerGlow.js).
    // Hover holds it at full glow; once on, a calm steady green.
    const glow = on ? 0 : hovered ? 1 : breathing(clock.elapsedTime);
    if (led.current) {
      led.current.color.set(on ? '#5dff8a' : '#ffb347');
      led.current.emissive.set(on ? '#2bff6a' : '#ff9a1f');
      led.current.emissiveIntensity = on ? 2.2 : 0.5 + 3 * glow;
    }
    if (face.current) face.current.emissiveIntensity = 0.5 * glow;
    // R3F copies the `uniforms` prop, so update the material's own copy.
    if (halo.current) halo.current.material.uniforms.uOpacity.value = 0.45 * glow;
  });
  const press = event => {
    event.stopPropagation();
    if (on) return;
    pressed.current = 1;
    setTimeout(onPress, 180);
  };
  return <group position={POWER_BUTTON.position} rotation={POWER_BUTTON.rotation}>
    <group ref={cap}>
      <RoundedBox args={[0.029, 0.0115, 0.004]} radius={0.0045} smoothness={3}>
        <meshStandardMaterial ref={face} color={hovered && !on ? '#d8d4dc' : '#b9b5bd'} emissive="#ff9a1f" emissiveIntensity={0} roughness={0.55} metalness={0.05} />
      </RoundedBox>
      <mesh position={[-0.0188, 0, 0.0005]}>
        <sphereGeometry args={[0.0017, 16, 12]} />
        <meshStandardMaterial ref={led} toneMapped={false} />
      </mesh>
    </group>
    <mesh ref={halo} position={[-0.004, 0, 0.0028]} renderOrder={11} raycast={() => null}>
      <planeGeometry args={[0.075, 0.036]} />
      <shaderMaterial transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending}
        uniforms={haloUniforms} vertexShader={haloShader.vertexShader} fragmentShader={haloShader.fragmentShader} />
    </mesh>
    {/* A generous invisible hit area, so the small button is easy to click from the default view. */}
    <mesh onClick={press} onPointerOver={event => { event.stopPropagation(); setHovered(true); }} onPointerOut={() => setHovered(false)}>
      <boxGeometry args={[0.07, 0.05, 0.02]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  </group>;
}

function SmartScreen({ children }) {
  const groupRef = useRef();
  const htmlContainerRef = useRef();

  // Screen Tuner (?tune): move, tilt and scale the whole screen live. Runs before <Html> updates.
  useFrame(() => {
    if (!tuningEnabled || !groupRef.current) return;
    const t = tuning.get();
    groupRef.current.position.set(t.x, t.y, t.z);
    groupRef.current.rotation.x = t.tilt;
    groupRef.current.scale.setScalar(t.fit / SCREEN_FIT);
  }, -1);

  useFrame(({ camera }) => {
    if (!groupRef.current || !htmlContainerRef.current) return;
    
    const screenWorldPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(screenWorldPos);
    
    const dirToCamera = camera.position.clone().sub(screenWorldPos).normalize();
    
    const screenNormal = new THREE.Vector3(0, 0, 1);
    screenNormal.applyQuaternion(groupRef.current.getWorldQuaternion(new THREE.Quaternion()));
    
    const dot = dirToCamera.dot(screenNormal);
    
    // Hide instantly as soon as the camera crosses the plane
    const isVisible = dot > -0.05;
    
    htmlContainerRef.current.style.visibility = isVisible ? 'visible' : 'hidden';
    htmlContainerRef.current.style.pointerEvents = isVisible ? 'auto' : 'none';
  });

  return (
    <group ref={groupRef} position={SCREEN} rotation={SCREEN_ROTATION}>
      {/* occlude="blending": the HTML desktop is drawn behind the WebGL canvas, which cuts a window
          for it, so the monitor's bezel (and anything in front) properly covers the screen's edges. */}
      <Html transform occlude="blending" wrapperClass="os-screen" distanceFactor={SCREEN_DISTANCE_FACTOR} zIndexRange={[100, 0]}>
        <div ref={htmlContainerRef}>
          {children}
        </div>
      </Html>
      {/* Dark tube interior: a box behind the screen, drawn from the inside only (BackSide). Through
          the bezel opening you always see dark walls, never the sky, at any angle; from outside
          it's hidden by the casing. (The model's own screen surface is removed, so the tube is open.) */}
      <mesh position={[0, 0, -0.053]} raycast={() => null}>
        <boxGeometry args={[SCREEN_W * 1.08, SCREEN_H * 1.1, 0.09]} />
        <meshBasicMaterial color="#050508" side={THREE.BackSide} fog={false} />
      </mesh>
      <mesh position={[0, 0, 0.002]} renderOrder={10} raycast={() => null}>
        <planeGeometry args={[SCREEN_W * GLASS_OVERSCAN, SCREEN_H * GLASS_OVERSCAN]} />
        <shaderMaterial transparent depthWrite={false} uniforms={glassShader.uniforms} vertexShader={glassShader.vertexShader} fragmentShader={glassShader.fragmentShader} />
      </mesh>
    </group>
  );
}
