import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useCursor, useGLTF, Center, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Power } from 'lucide-react';
import Desktop from './Desktop';
import { WindowProvider } from '../WindowContext.jsx';
import { WindowContext, useWindows } from '../useWindows';
import { SpaceWorld } from './SpaceWorld.jsx';

const SCREEN = new THREE.Vector3(-0.079, 0.085, 0.312);
const SCREEN_ROTATION = new THREE.Euler(-0.08, 0, 0);
const SCREEN_WIDTH = 0.425;
const SCREEN_HEIGHT = 0.31875;
const TRANSITION_DURATION = 1.25;
const BG_COLOR = '#000000';

function ComputerModel({ onClick, isZoomed, windowContext }) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const computerModelUrl = `${import.meta.env.BASE_URL}retro_computer_fixed.glb`;
  const { scene } = useGLTF(computerModelUrl);
  const model = useMemo(() => {
    const instance = scene.clone(true);
    instance.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return instance;
  }, [scene]);
  useCursor(!isZoomed && hovered);
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const targetY = isZoomed ? 0 : Math.sin(time * 0.72) * 0.018;
    const targetYaw = isZoomed ? 0 : Math.sin(time * 0.41 + 0.8) * THREE.MathUtils.degToRad(0.55);
    const targetPitch = isZoomed ? 0 : Math.sin(time * 0.34 + 1.7) * THREE.MathUtils.degToRad(0.28);

    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY, 3.2, delta);
    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetYaw, 2.6, delta);
    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetPitch, 2.4, delta);
  });
  return (
    <group ref={groupRef} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}
      onClick={!isZoomed ? (event) => { event.stopPropagation(); onClick(); } : undefined}>
      <Center><primitive object={model} scale={2} /></Center>
      <ScreenPortalGlow isZoomed={isZoomed} />
      <SmartScreen>
        <div style={{ width: 800, height: 600 }} className="os-desktop overflow-hidden rounded-[32px] bg-zinc-900 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
          <WindowContext.Provider value={windowContext}><Desktop /></WindowContext.Provider>
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
        <Canvas shadows={{ type: THREE.VSMShadowMap }} dpr={[1, 1.5]} camera={{ position: [1.35, 0.82, 2.45], fov: 40 }} fallback={null}>
          <color attach="background" args={[BG_COLOR]} />
          <ambientLight intensity={0.18} />
          <hemisphereLight args={['#dfe7ff', '#000000', 0.72]} />

          {/* Broad hero key: large, soft pool of light centered on the computer. */}
          <spotLight
            position={[0.15, 6.8, 5.4]}
            color="#ffffff"
            intensity={150}
            angle={0.82}
            penumbra={0.9}
            decay={1.35}
            distance={26}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-radius={7}
            shadow-blurSamples={12}
            shadow-bias={-0.00025}
            shadow-normalBias={0.02}
          />

          {/* Screen-side glow keeps the face readable against pitch black. */}
          <pointLight position={[-0.08, 0.15, 1.05]} color="#9fb1ff" intensity={12} distance={4.5} decay={2} />

          {/* Soft front fill and a cool rim separate the silhouette from space. */}
          <pointLight position={[1.9, 1.4, 3.5]} color="#ffffff" intensity={22} distance={9} decay={2} />
          <directionalLight position={[3.5, 2.4, 3]} color="#c7d3ff" intensity={1.5} />
          <directionalLight position={[-3.5, 1.6, -2]} color="#6576b4" intensity={1.15} />
          <SpaceWorld />
          <React.Suspense fallback={<Html center><p className="whitespace-nowrap text-white" role="status">Loading computer…</p></Html>}>
            <ComputerModel onClick={() => setIsZoomed(true)} isZoomed={isZoomed} windowContext={windowContext} />
          </React.Suspense>
          <OrbitControls
            enabled={!isZoomed}
            target={[0, 0.04, 0]}
            enablePan={false}
            enableZoom
            enableDamping
            dampingFactor={0.07}
            rotateSpeed={0.4}
            zoomSpeed={0.5}
            minDistance={1.95}
            maxDistance={5.2}
            minPolarAngle={Math.PI * 0.2}
            maxPolarAngle={Math.PI * 0.72}
          />
          <CameraZoomRig isZoomed={isZoomed} />
        </Canvas>
        {!isZoomed && <div className="intro-footer"><div><p className="eyebrow">A familiar place. A few new ideas.</p><h1>Make yourself <em>at home.</em></h1><p>An interactive portfolio by Zack Siegel.</p></div><div className="intro-actions"><span>DRAG TO ORBIT</span><button className="studio-button" onClick={() => setIsZoomed(true)}><Power size={14} />Start computer</button></div></div>}
      </SceneBoundary>
    </div>
  );
}

function CameraZoomRig({ isZoomed }) {
  const wasZoomedRef = useRef(false);
  const elapsedRef = useRef(0);
  const startPositionRef = useRef(new THREE.Vector3());
  const startQuaternionRef = useRef(new THREE.Quaternion());
  const startFovRef = useRef(40);
  const targetQuaternion = useMemo(() => new THREE.Quaternion().setFromEuler(SCREEN_ROTATION), []);

  useFrame(({ camera, size }, delta) => {
    if (!isZoomed) {
      wasZoomedRef.current = false;
      elapsedRef.current = 0;
      return;
    }

    if (!wasZoomedRef.current) {
      wasZoomedRef.current = true;
      elapsedRef.current = 0;
      startPositionRef.current.copy(camera.position);
      startQuaternionRef.current.copy(camera.quaternion);
      startFovRef.current = camera.fov;
    }

    elapsedRef.current = Math.min(elapsedRef.current + delta, TRANSITION_DURATION);
    const progress = elapsedRef.current / TRANSITION_DURATION;

    // Hold for a beat while the screen flares, then accelerate into the display.
    const moveProgress = THREE.MathUtils.clamp((progress - 0.1) / 0.9, 0, 1);
    const eased = moveProgress * moveProgress * (3 - 2 * moveProgress);
    const targetFov = 36;
    const aspect = size.width / size.height;
    const distance = Math.max(
      SCREEN_HEIGHT / 0.76,
      SCREEN_WIDTH / (aspect * 0.84),
    ) / (2 * Math.tan(THREE.MathUtils.degToRad(targetFov / 2)));
    const offset = new THREE.Vector3(0, 0, distance).applyEuler(SCREEN_ROTATION);
    const targetPosition = SCREEN.clone().add(offset);

    camera.position.lerpVectors(startPositionRef.current, targetPosition, eased);
    camera.position.y += Math.sin(eased * Math.PI) * 0.035;
    camera.quaternion.copy(startQuaternionRef.current).slerp(targetQuaternion, eased);
    camera.fov = THREE.MathUtils.lerp(startFovRef.current, targetFov, eased);
    camera.updateProjectionMatrix();
  });

  return null;
}

function ScreenPortalGlow({ isZoomed }) {
  const innerRef = useRef();
  const outerRef = useRef();
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    const target = isZoomed ? 1 : 0;
    const speed = isZoomed ? 1 / TRANSITION_DURATION : 4;
    progressRef.current = THREE.MathUtils.damp(progressRef.current, target, speed * 6, delta);

    const progress = progressRef.current;
    const flare = Math.sin(Math.min(progress * 1.75, 1) * Math.PI);
    const afterglow = Math.max(0, 1 - progress) * 0.12;

    if (innerRef.current) {
      innerRef.current.material.opacity = flare * 0.42 + afterglow;
      const scale = 1 + progress * 0.45;
      innerRef.current.scale.setScalar(scale);
    }

    if (outerRef.current) {
      outerRef.current.material.opacity = flare * 0.16 + afterglow * 0.45;
      const scale = 1.08 + progress * 0.8;
      outerRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={SCREEN} rotation={SCREEN_ROTATION}>
      <mesh ref={outerRef} position={[0, 0, -0.018]} renderOrder={1}>
        <planeGeometry args={[SCREEN_WIDTH * 1.34, SCREEN_HEIGHT * 1.34]} />
        <meshBasicMaterial
          color="#7186ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={innerRef} position={[0, 0, -0.012]} renderOrder={2}>
        <planeGeometry args={[SCREEN_WIDTH * 1.08, SCREEN_HEIGHT * 1.08]} />
        <meshBasicMaterial
          color="#dbe3ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function SmartScreen({ children }) {
  const groupRef = useRef();
  const htmlContainerRef = useRef();

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
      <Html transform wrapperClass="os-screen" distanceFactor={0.2125} zIndexRange={[100, 0]}>
        <div ref={htmlContainerRef}>
          {children}
        </div>
      </Html>
    </group>
  );
}
