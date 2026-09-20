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
        <Canvas shadows={{ type: THREE.VSMShadowMap }} dpr={[1, 1.5]} camera={{ position: [1.55, 1.1, 2.15], fov: 45 }} fallback={null}>
          <color attach="background" args={[BG_COLOR]} />
          <ambientLight intensity={0.22} />
          <hemisphereLight args={['#dbe4ff', '#050509', 0.8]} />
          <spotLight
            position={[0.25, 5.8, 4.2]}
            color="#f4f7ff"
            intensity={115}
            angle={0.9}
            penumbra={0.82}
            decay={1.45}
            distance={22}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-radius={6}
            shadow-blurSamples={10}
            shadow-bias={-0.00025}
            shadow-normalBias={0.02}
          />
          <pointLight position={[0.6, 1.2, 2.8]} color="#ffffff" intensity={20} distance={8} decay={2} />
          <directionalLight position={[3, 2, 3]} color="#b8c7ff" intensity={1.6} />
          <directionalLight position={[-3, 1, 2]} color="#45557e" intensity={0.7} />
          <SpaceWorld />
          <React.Suspense fallback={<Html center><p className="whitespace-nowrap text-white" role="status">Loading computer…</p></Html>}>
            <ComputerModel onClick={() => setIsZoomed(true)} isZoomed={isZoomed} windowContext={windowContext} />
          </React.Suspense>
          <OrbitControls
            enabled={!isZoomed}
            target={[0, 0.02, 0]}
            enablePan={false}
            enableZoom
            enableDamping
            dampingFactor={0.055}
            rotateSpeed={0.45}
            zoomSpeed={0.6}
            minDistance={1.8}
            maxDistance={5.5}
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
  useFrame(({ camera, size }, delta) => {
    if (!isZoomed) return;
    // Fit both screen dimensions with room for the bezel, including portrait viewports.
    const distance = Math.max(0.31875 / 0.76, 0.425 / (size.width / size.height * 0.84)) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const alpha = 1 - Math.exp(-5 * delta);
    const offset = new THREE.Vector3(0, 0, distance).applyEuler(SCREEN_ROTATION);
    camera.position.lerp(SCREEN.clone().add(offset), alpha);
    camera.quaternion.slerp(new THREE.Quaternion().setFromEuler(SCREEN_ROTATION), alpha);
  });
  return null;
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
