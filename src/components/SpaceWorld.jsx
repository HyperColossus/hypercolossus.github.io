import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const BASE_CAMERA = new THREE.Vector3(1.55, 1.1, 2.15);
const CAMERA_LOOK = new THREE.Vector3(0, 0.02, 0);

const pointVertexShader = `
  attribute float aScale;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aAmplitude;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uBaseOpacity;
  uniform float uPointScale;

  varying float vAlpha;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float twinkle = 0.5 + 0.5 * sin(uTime * aSpeed + aPhase);
    vAlpha = uBaseOpacity * (1.0 - aAmplitude + twinkle * aAmplitude);

    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aScale * uPointScale * uPixelRatio * (4.0 / max(1.0, -mvPosition.z));
  }
`;

const pointFragmentShader = `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    float softDisc = 1.0 - smoothstep(0.12, 0.5, distanceToCenter);
    float core = 1.0 - smoothstep(0.0, 0.16, distanceToCenter);
    float alpha = softDisc * vAlpha;

    if (alpha < 0.01) discard;

    vec3 color = mix(uColor, vec3(1.0), core * 0.38);
    gl_FragColor = vec4(color, alpha);
  }
`;

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createPointField({
  count,
  seed,
  bounds,
  scaleRange,
  speedRange,
  amplitudeRange,
}) {
  const random = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);
  const amplitudes = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    positions[offset] = THREE.MathUtils.lerp(bounds.x[0], bounds.x[1], random());
    positions[offset + 1] = THREE.MathUtils.lerp(bounds.y[0], bounds.y[1], random());
    positions[offset + 2] = THREE.MathUtils.lerp(bounds.z[0], bounds.z[1], random());

    scales[index] = THREE.MathUtils.lerp(scaleRange[0], scaleRange[1], random());
    phases[index] = random() * Math.PI * 2;
    speeds[index] = THREE.MathUtils.lerp(speedRange[0], speedRange[1], random());
    amplitudes[index] = THREE.MathUtils.lerp(amplitudeRange[0], amplitudeRange[1], random());
  }

  return { positions, scales, phases, speeds, amplitudes };
}

function StarPoints({
  count,
  seed,
  bounds,
  scaleRange,
  speedRange,
  amplitudeRange,
  color,
  opacity,
  pointScale,
}) {
  const materialRef = useRef();
  const field = useMemo(
    () => createPointField({ count, seed, bounds, scaleRange, speedRange, amplitudeRange }),
    [count, seed, bounds, scaleRange, speedRange, amplitudeRange],
  );

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
    uBaseOpacity: { value: opacity },
    uPointScale: { value: pointScale },
    uColor: { value: new THREE.Color(color) },
  }), [color, opacity, pointScale]);

  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[field.positions, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[field.scales, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[field.phases, 1]} />
        <bufferAttribute attach="attributes-aSpeed" args={[field.speeds, 1]} />
        <bufferAttribute attach="attributes-aAmplitude" args={[field.amplitudes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={pointVertexShader}
        fragmentShader={pointFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function DeepStarField() {
  const bounds = useMemo(() => ({
    x: [-38, 38],
    y: [-24, 24],
    z: [-62, -9],
  }), []);
  const scaleRange = useMemo(() => [0.28, 0.9], []);
  const speedRange = useMemo(() => [0.18, 0.7], []);
  const amplitudeRange = useMemo(() => [0.01, 0.16], []);

  return (
    <StarPoints
      count={1200}
      seed={90421}
      bounds={bounds}
      scaleRange={scaleRange}
      speedRange={speedRange}
      amplitudeRange={amplitudeRange}
      color="#dfe7ff"
      opacity={0.52}
      pointScale={7}
    />
  );
}

function TwinkleStars() {
  const bounds = useMemo(() => ({
    x: [-15, 15],
    y: [-9, 10],
    z: [-27, -3.5],
  }), []);
  const scaleRange = useMemo(() => [0.7, 1.9], []);
  const speedRange = useMemo(() => [0.45, 1.7], []);
  const amplitudeRange = useMemo(() => [0.28, 0.78], []);

  return (
    <StarPoints
      count={92}
      seed={17831}
      bounds={bounds}
      scaleRange={scaleRange}
      speedRange={speedRange}
      amplitudeRange={amplitudeRange}
      color="#b9c5ff"
      opacity={0.88}
      pointScale={9}
    />
  );
}

function AmbientSpaceDust() {
  const pointsRef = useRef();
  const materialRef = useRef();
  const count = 420;

  const field = useMemo(() => {
    const random = seededRandom(51277);
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    const amplitudes = new Float32Array(count);

    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      positions[offset] = THREE.MathUtils.lerp(-10, 10, random());
      positions[offset + 1] = THREE.MathUtils.lerp(-6, 7, random());
      positions[offset + 2] = THREE.MathUtils.lerp(-13, 1.4, random());

      const depthFactor = THREE.MathUtils.clamp((positions[offset + 2] + 13) / 14.4, 0, 1);
      velocities[offset] = THREE.MathUtils.lerp(0.004, 0.018, depthFactor) + (random() - 0.5) * 0.006;
      velocities[offset + 1] = THREE.MathUtils.lerp(0.008, 0.026, depthFactor) + random() * 0.008;
      velocities[offset + 2] = THREE.MathUtils.lerp(0.004, 0.018, depthFactor);

      scales[index] = THREE.MathUtils.lerp(0.32, 1.15, random()) * (0.65 + depthFactor * 0.65);
      phases[index] = random() * Math.PI * 2;
      speeds[index] = THREE.MathUtils.lerp(0.18, 0.62, random());
      amplitudes[index] = THREE.MathUtils.lerp(0.04, 0.2, random());
    }

    return { positions, velocities, scales, phases, speeds, amplitudes };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
    uBaseOpacity: { value: 0.34 },
    uPointScale: { value: 8 },
    uColor: { value: new THREE.Color('#c7d2ff') },
  }), []);

  useFrame(({ clock }, delta) => {
    if (!pointsRef.current) return;
    const positionAttribute = pointsRef.current.geometry.attributes.position;
    const positions = positionAttribute.array;

    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      const oscillation = Math.sin(clock.elapsedTime * 0.22 + field.phases[index]) * 0.002;

      positions[offset] += (field.velocities[offset] + oscillation) * delta * 60;
      positions[offset + 1] += field.velocities[offset + 1] * delta * 60;
      positions[offset + 2] += field.velocities[offset + 2] * delta * 60;

      if (positions[offset] > 10.5) positions[offset] = -10.5;
      if (positions[offset + 1] > 7.5) positions[offset + 1] = -6.5;
      if (positions[offset + 2] > 1.55) positions[offset + 2] = -13.5;
    }

    positionAttribute.needsUpdate = true;
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[field.positions, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[field.scales, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[field.phases, 1]} />
        <bufferAttribute attach="attributes-aSpeed" args={[field.speeds, 1]} />
        <bufferAttribute attach="attributes-aAmplitude" args={[field.amplitudes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={pointVertexShader}
        fragmentShader={pointFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function ForegroundDust() {
  const pointsRef = useRef();
  const materialRef = useRef();
  const count = 30;

  const field = useMemo(() => {
    const random = seededRandom(77123);
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    const amplitudes = new Float32Array(count);

    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      positions[offset] = THREE.MathUtils.lerp(-1.8, 1.8, random());
      positions[offset + 1] = THREE.MathUtils.lerp(-1.25, 1.25, random());
      positions[offset + 2] = THREE.MathUtils.lerp(-2.8, -0.55, random());

      velocities[offset] = THREE.MathUtils.lerp(0.004, 0.015, random());
      velocities[offset + 1] = THREE.MathUtils.lerp(0.006, 0.018, random());
      velocities[offset + 2] = THREE.MathUtils.lerp(0.002, 0.009, random());

      scales[index] = THREE.MathUtils.lerp(1.2, 3.0, random());
      phases[index] = random() * Math.PI * 2;
      speeds[index] = THREE.MathUtils.lerp(0.1, 0.35, random());
      amplitudes[index] = THREE.MathUtils.lerp(0.02, 0.12, random());
    }

    return { positions, velocities, scales, phases, speeds, amplitudes };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
    uBaseOpacity: { value: 0.22 },
    uPointScale: { value: 13 },
    uColor: { value: new THREE.Color('#eef1ff') },
  }), []);

  useFrame(({ camera, clock }, delta) => {
    if (!pointsRef.current) return;

    pointsRef.current.position.copy(camera.position);
    pointsRef.current.quaternion.copy(camera.quaternion);

    const positionAttribute = pointsRef.current.geometry.attributes.position;
    const positions = positionAttribute.array;

    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      positions[offset] += field.velocities[offset] * delta * 60;
      positions[offset + 1] += field.velocities[offset + 1] * delta * 60;
      positions[offset + 2] += field.velocities[offset + 2] * delta * 60;

      if (positions[offset] > 1.95) positions[offset] = -1.95;
      if (positions[offset + 1] > 1.4) positions[offset + 1] = -1.4;
      if (positions[offset + 2] > -0.45) positions[offset + 2] = -2.9;
    }

    positionAttribute.needsUpdate = true;
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points ref={pointsRef} frustumCulled={false} renderOrder={20}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[field.positions, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[field.scales, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[field.phases, 1]} />
        <bufferAttribute attach="attributes-aSpeed" args={[field.speeds, 1]} />
        <bufferAttribute attach="attributes-aAmplitude" args={[field.amplitudes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={pointVertexShader}
        fragmentShader={pointFragmentShader}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

export function SpaceWorld() {
  return (
    <>
      <DeepStarField />
      <TwinkleStars />
      <AmbientSpaceDust />
      <ForegroundDust />
    </>
  );
}

export function CameraFloatRig({ isZoomed }) {
  const lookTarget = useMemo(() => CAMERA_LOOK.clone(), []);
  const orientationHelper = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ camera, pointer, clock }, delta) => {
    if (isZoomed) return;

    const time = clock.elapsedTime;
    const desiredPosition = new THREE.Vector3(
      BASE_CAMERA.x + Math.sin(time * 0.53) * 0.024 + pointer.x * 0.028,
      BASE_CAMERA.y + Math.sin(time * 0.41 + 1.2) * 0.018 + pointer.y * 0.02,
      BASE_CAMERA.z + Math.sin(time * 0.31 + 0.4) * 0.012,
    );

    const positionAlpha = 1 - Math.exp(-1.8 * delta);
    camera.position.lerp(desiredPosition, positionAlpha);

    const desiredLook = lookTarget.clone();
    desiredLook.x += pointer.x * 0.035;
    desiredLook.y += pointer.y * 0.025;

    orientationHelper.position.copy(camera.position);
    orientationHelper.lookAt(desiredLook);

    const rotationAlpha = 1 - Math.exp(-1.5 * delta);
    camera.quaternion.slerp(orientationHelper.quaternion, rotationAlpha);
  });

  return null;
}
