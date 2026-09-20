import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useCursor, useGLTF, Center, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
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
    <group ref={groupRef}>
      <Center><primitive object={model} scale={2} /></Center>
      <PhysicalPowerButton onPower={onClick} disabled={isZoomed} />
      <ScreenPortalGlow isZoomed={isZoomed} />
      <SmartScreen isPoweredOn={isZoomed}>
        <div style={{ width: 800, height: 600 }} className="os-desktop overflow-hidden rounded-[32px] bg-zinc-900 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
          <WindowContext.Provider value={windowContext}><Desktop /></WindowContext.Provider>
        </div>
      </SmartScreen>
    </group>
  );
}

function PhysicalPowerButton({ onPower, disabled }) {
  const groupRef = useRef();
  const capRef = useRef();
  const ringRef = useRef();
  const [hovered, setHovered] = useState(false);
  const pressedRef = useRef(false);
  const elapsedRef = useRef(0);
  const firedRef = useRef(false);

  useCursor(!disabled && hovered);

  useFrame((_, delta) => {
    if (!groupRef.current || !capRef.current || !ringRef.current) return;

    if (!pressedRef.current) {
      capRef.current.position.z = THREE.MathUtils.damp(capRef.current.position.z, 0, 18, delta);
      ringRef.current.material.emissiveIntensity = THREE.MathUtils.damp(
        ringRef.current.material.emissiveIntensity,
        hovered && !disabled ? 0.5 : 0.12,
        10,
        delta,
      );
      return;
    }

    elapsedRef.current += delta;
    const pressDuration = 0.18;
    const progress = Math.min(elapsedRef.current / pressDuration, 1);
    const pressCurve = Math.sin(progress * Math.PI);

    capRef.current.position.z = -0.014 * pressCurve;
    ringRef.current.material.emissiveIntensity = 0.65 + pressCurve * 1.6;

    if (progress >= 1 && !firedRef.current) {
      firedRef.current = true;
      pressedRef.current = false;
      onPower();
    }
  });

  const handlePower = (event) => {
    event.stopPropagation();
    if (disabled || pressedRef.current || firedRef.current) return;
    pressedRef.current = true;
    elapsedRef.current = 0;
  };

  return (
    <group
      ref={groupRef}
      position={[0.165, -0.135, 0.344]}
      rotation={[0, 0, 0]}
      onPointerOver={(event) => {
        event.stopPropagation();
        if (!disabled) setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={handlePower}
    >
      <mesh position={[0, 0, -0.006]}>
        <cylinderGeometry args={[0.026, 0.026, 0.012, 32]} />
        <meshStandardMaterial color="#15171d" roughness={0.7} metalness={0.25} />
      </mesh>

      <mesh ref={capRef} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.01, 32]} />
        <meshStandardMaterial
          color="#2b2f39"
          roughness={0.5}
          metalness={0.35}
          emissive="#11131a"
          emissiveIntensity={0.1}
        />
      </mesh>

      <mesh ref={ringRef} position={[0, 0, 0.008]}>
        <torusGeometry args={[0.0215, 0.0023, 10, 32]} />
        <meshStandardMaterial
          color="#69708b"
          emissive="#8c9cff"
          emissiveIntensity={0.12}
          roughness={0.45}
          metalness={0.45}
        />
      </mesh>

      <mesh position={[0, 0, 0.014]}>
        <ringGeometry args={[0.004, 0.0055, 24, 1, 0.48, Math.PI * 1.04]} />
        <meshBasicMaterial color="#cfd7ff" transparent opacity={0.82} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.004, 0.014]}>
        <planeGeometry args={[0.0028, 0.012]} />
        <meshBasicMaterial color="#cfd7ff" transparent opacity={0.82} toneMapped={false} />
      </mesh>

      {/* Larger invisible hit target so the physical control is easy to click. */}
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[0.046, 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
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
          <ambientLight intensity={0.11} />
          <hemisphereLight args={['#9aa8cf', '#000000', 0.42]} />

          {/* Minimal edge lighting only; the CRT is now the visual light source. */}
          <directionalLight position={[3.8, 2.7, 2.4]} color="#9eadde" intensity={0.72} />
          <directionalLight position={[-3.8, 1.8, -2.8]} color="#55628f" intensity={0.58} />
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
        {!isZoomed && <div className="intro-footer"><div><p className="eyebrow">A familiar place. A few new ideas.</p><h1>Make yourself <em>at home.</em></h1><p>An interactive portfolio by Zack Siegel.</p></div><div className="intro-actions"><span>DRAG TO ORBIT · PRESS THE COMPUTER POWER BUTTON</span></div></div>}
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
    progressRef.current = THREE.MathUtils.damp(progressRef.current, target, isZoomed ? 7 : 4, delta);

    const progress = progressRef.current;
    const bootPulse = Math.sin(Math.min(progress * 1.55, 1) * Math.PI);
    const idlePulse = 0.5 + Math.sin(performance.now() * 0.0014) * 0.5;

    if (innerRef.current) {
      const idleOpacity = isZoomed ? 0 : 0.08 + idlePulse * 0.025;
      innerRef.current.material.opacity = idleOpacity + bootPulse * 0.38;
      const scale = isZoomed ? 1 + progress * 0.34 : 1.02 + idlePulse * 0.015;
      innerRef.current.scale.setScalar(scale);
    }

    if (outerRef.current) {
      const idleOpacity = isZoomed ? 0 : 0.035 + idlePulse * 0.012;
      outerRef.current.material.opacity = idleOpacity + bootPulse * 0.13;
      const scale = isZoomed ? 1.08 + progress * 0.72 : 1.08 + idlePulse * 0.02;
      outerRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={SCREEN} rotation={SCREEN_ROTATION}>
      <mesh ref={outerRef} position={[0, 0, -0.018]} renderOrder={1}>
        <planeGeometry args={[SCREEN_WIDTH * 1.38, SCREEN_HEIGHT * 1.38]} />
        <meshBasicMaterial
          color="#5865f2"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={innerRef} position={[0, 0, -0.012]} renderOrder={2}>
        <planeGeometry args={[SCREEN_WIDTH * 1.1, SCREEN_HEIGHT * 1.1]} />
        <meshBasicMaterial
          color="#c9d2ff"
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

function SmartScreen({ children, isPoweredOn }) {
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
          <div className={`crt-screen-shell ${isPoweredOn ? 'is-powering-on' : 'is-idle'}`}>
            <div className="crt-screen-content">{children}</div>
            <div className="crt-blackout" aria-hidden="true" />
            <div className="crt-power-line" aria-hidden="true" />
            <div className="crt-phosphor-flash" aria-hidden="true" />
            <div className="crt-scanlines" aria-hidden="true" />
            <div className="crt-glass" aria-hidden="true" />
          </div>
        </div>
      </Html>
    </group>
  );
}
