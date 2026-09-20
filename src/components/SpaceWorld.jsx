import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const pointVertexShader = `
  attribute float aScale;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aAmplitude;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uBaseOpacity;
  uniform float uPointScale;
  uniform float uMinPointSize;
  uniform float uConstantSize;

  varying float vAlpha;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float twinkle = 0.5 + 0.5 * sin(uTime * aSpeed + aPhase);
    vAlpha = uBaseOpacity * (1.0 - aAmplitude + twinkle * aAmplitude);

    gl_Position = projectionMatrix * mvPosition;
    float attenuatedSize = aScale * uPointScale * uPixelRatio * (8.0 / max(8.0, -mvPosition.z));
    float constantSize = aScale * uPointScale * uPixelRatio;
    gl_PointSize = max(uMinPointSize * uPixelRatio, mix(attenuatedSize, constantSize, uConstantSize));
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

function createSphericalPointField({
  count,
  seed,
  radiusRange,
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
    const azimuth = random() * Math.PI * 2;
    const vertical = random() * 2 - 1;
    const horizontal = Math.sqrt(1 - vertical * vertical);
    const radius = THREE.MathUtils.lerp(radiusRange[0], radiusRange[1], random());

    positions[offset] = radius * horizontal * Math.cos(azimuth);
    positions[offset + 1] = radius * vertical;
    positions[offset + 2] = radius * horizontal * Math.sin(azimuth);

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
  radiusRange,
  scaleRange,
  speedRange,
  amplitudeRange,
  color,
  opacity,
  pointScale,
  minPointSize = 0.0,
  constantSize = false,
}) {
  const materialRef = useRef();
  const field = useMemo(
    () => createSphericalPointField({ count, seed, radiusRange, scaleRange, speedRange, amplitudeRange }),
    [count, seed, radiusRange, scaleRange, speedRange, amplitudeRange],
  );

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
    uBaseOpacity: { value: opacity },
    uPointScale: { value: pointScale },
    uMinPointSize: { value: minPointSize },
    uConstantSize: { value: constantSize ? 1 : 0 },
    uColor: { value: new THREE.Color(color) },
  }), [color, constantSize, minPointSize, opacity, pointScale]);

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
  const radiusRange = useMemo(() => [62, 150], []);
  const scaleRange = useMemo(() => [0.18, 0.48], []);
  const speedRange = useMemo(() => [0.06, 0.18], []);
  const amplitudeRange = useMemo(() => [0.005, 0.04], []);

  return (
    <StarPoints
      count={2200}
      seed={90421}
      radiusRange={radiusRange}
      scaleRange={scaleRange}
      speedRange={speedRange}
      amplitudeRange={amplitudeRange}
      color="#f7f8ff"
      opacity={0.9}
      pointScale={2.35}
      minPointSize={0.55}
      constantSize
    />
  );
}

function TwinkleStars() {
  const radiusRange = useMemo(() => [34, 78], []);
  const scaleRange = useMemo(() => [0.28, 0.62], []);
  const speedRange = useMemo(() => [0.12, 0.42], []);
  const amplitudeRange = useMemo(() => [0.06, 0.22], []);

  return (
    <StarPoints
      count={110}
      seed={17831}
      radiusRange={radiusRange}
      scaleRange={scaleRange}
      speedRange={speedRange}
      amplitudeRange={amplitudeRange}
      color="#e3e7ff"
      opacity={0.96}
      pointScale={3.2}
      minPointSize={0.72}
      constantSize
    />
  );
}

function AmbientSpaceDust() {
  const pointsRef = useRef();
  const materialRef = useRef();
  const count = 240;

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
      positions[offset] = THREE.MathUtils.lerp(-15, 15, random());
      positions[offset + 1] = THREE.MathUtils.lerp(-9, 9, random());
      positions[offset + 2] = THREE.MathUtils.lerp(-24, -1.5, random());

      const depthFactor = THREE.MathUtils.clamp((positions[offset + 2] + 24) / 22.5, 0, 1);
      velocities[offset] = THREE.MathUtils.lerp(0.001, 0.006, depthFactor) + (random() - 0.5) * 0.002;
      velocities[offset + 1] = THREE.MathUtils.lerp(0.0015, 0.007, depthFactor) + (random() - 0.5) * 0.002;
      velocities[offset + 2] = THREE.MathUtils.lerp(0.0008, 0.004, depthFactor);

      scales[index] = THREE.MathUtils.lerp(0.11, 0.32, random()) * (0.8 + depthFactor * 0.35);
      phases[index] = random() * Math.PI * 2;
      speeds[index] = THREE.MathUtils.lerp(0.18, 0.62, random());
      amplitudes[index] = THREE.MathUtils.lerp(0.04, 0.2, random());
    }

    return { positions, velocities, scales, phases, speeds, amplitudes };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
    uBaseOpacity: { value: 0.18 },
    uPointScale: { value: 4.2 },
    uMinPointSize: { value: 0.0 },
    uConstantSize: { value: 0 },
    uColor: { value: new THREE.Color('#bfc8e8') },
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

      if (positions[offset] > 15.5) positions[offset] = -15.5;
      if (positions[offset + 1] > 9.5) positions[offset + 1] = -9.5;
      if (positions[offset + 2] > -1.35) positions[offset + 2] = -24.5;
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
  const count = 10;

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
      positions[offset] = THREE.MathUtils.lerp(-2.2, 2.2, random());
      positions[offset + 1] = THREE.MathUtils.lerp(-1.5, 1.5, random());
      positions[offset + 2] = THREE.MathUtils.lerp(-3.6, -1.0, random());

      velocities[offset] = THREE.MathUtils.lerp(0.00025, 0.0008, random());
      velocities[offset + 1] = THREE.MathUtils.lerp(0.0002, 0.0007, random());
      velocities[offset + 2] = THREE.MathUtils.lerp(0.0001, 0.00045, random());

      scales[index] = THREE.MathUtils.lerp(0.07, 0.16, random());
      phases[index] = random() * Math.PI * 2;
      speeds[index] = THREE.MathUtils.lerp(0.1, 0.35, random());
      amplitudes[index] = THREE.MathUtils.lerp(0.02, 0.12, random());
    }

    return { positions, velocities, scales, phases, speeds, amplitudes };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
    uBaseOpacity: { value: 0.08 },
    uPointScale: { value: 2.4 },
    uMinPointSize: { value: 0.0 },
    uConstantSize: { value: 0 },
    uColor: { value: new THREE.Color('#e6eaff') },
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

      if (positions[offset] > 2.35) positions[offset] = -2.35;
      if (positions[offset + 1] > 1.65) positions[offset + 1] = -1.65;
      if (positions[offset + 2] > -0.9) positions[offset + 2] = -3.7;
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

