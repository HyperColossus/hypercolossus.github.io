import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, Color } from 'three';

// The void around the computer: a deep navy sky scattered with small purple and pink nebula
// clouds, painted on a sphere we're inside and fixed in the world, so orbiting the computer moves the
// camera through a still sky, just like real space. The clouds also drift very slowly.
export const VOID_COLORS = { deep: '#04071c', sky: '#0a1033', purple: '#5a2d9c', pink: '#d4508f' };
const SKY_RADIUS = 50;

const vertexShader = `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 cDeep;
  uniform vec3 cSky;
  uniform vec3 cPurple;
  uniform vec3 cPink;
  uniform float uTime;
  varying vec3 vDir;

  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), u.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), u.x), u.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), u.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), u.x), u.y),
      u.z);
  }
  float fbm(vec3 p) {
    float value = 0.0, amp = 0.5;
    for (int i = 0; i < 5; i++) { value += amp * noise(p); p = p * 2.03 + vec3(17.0, 9.0, 3.0); amp *= 0.5; }
    return value;
  }
  float screenHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec3 d = normalize(vDir);   // direction on the sky sphere itself (object space)
    float t = uTime * 0.008;

    // Base sky: deep navy, slightly lighter looking up.
    vec3 color = mix(cDeep, cSky, smoothstep(-0.5, 0.7, d.y));

    // Domain-warped 3D noise gives small clouds with soft, billowing edges.
    vec3 warp = vec3(fbm(d * 4.5 + vec3(t, 0.0, 0.0)), fbm(d * 4.5 + vec3(5.2, 1.3, 7.1) - vec3(0.0, t, 0.0)), fbm(d * 4.5 + vec3(2.9, 8.4, 0.6)));
    float purpleCloud = smoothstep(0.58, 0.84, fbm(d * 6.3 + warp * 1.2 + vec3(1.7, 9.2, 4.4)));
    float pinkCloud = smoothstep(0.62, 0.86, fbm(d * 7.5 + warp * 1.4 + vec3(8.3, 2.8, 6.1)));
    float wisps = fbm(d * 16.0 + warp * 2.0);
    purpleCloud *= 0.55 + 0.65 * wisps;
    pinkCloud *= 0.45 + 0.75 * wisps;

    color = mix(color, cPurple, purpleCloud * 0.7);
    color = mix(color, cPink, pinkCloud * 0.65);
    color += cPink * pow(pinkCloud, 3.0) * 0.22;   // bright hearts inside the pink clouds

    color += (screenHash(gl_FragCoord.xy) - 0.5) / 255.0;   // dither against banding
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default function VoidBackground() {
  const mesh = useRef(null);
  const uniforms = useMemo(() => ({
    cDeep: { value: new Color(VOID_COLORS.deep) },
    cSky: { value: new Color(VOID_COLORS.sky) },
    cPurple: { value: new Color(VOID_COLORS.purple) },
    cPink: { value: new Color(VOID_COLORS.pink) },
    uTime: { value: 0 },
  }), []);
  // The nebula is painted on a sphere we sit inside. The sphere is fixed in the world and only
  // follows the camera's position (no parallax, never clipped), so orbiting reads as the camera
  // circling a still computer. The orbit's own speed is tuned in IntroScene (OrbitControls).
  useFrame(({ camera, clock }) => {
    if (!mesh.current) return;
    mesh.current.position.copy(camera.position);
    // R3F copies the `uniforms` prop into the material, so update the material's own copy.
    mesh.current.material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={-100} raycast={() => null}>
      <sphereGeometry args={[SKY_RADIUS, 48, 32]} />
      <shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader}
        side={BackSide} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
