import { useMemo } from 'react';
import { Color } from 'three';

// A uniform vertical haze stays behind the scene while the camera moves.
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 mistColor;
  varying vec2 vUv;

  void main() {
    // Clear at the top, gradually denser toward the ground; no moving cloud patches.
    float density = (1.0 - vUv.y) * 0.8;
    gl_FragColor = vec4(mix(baseColor, mistColor, density), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default function BackgroundFog() {
  const uniforms = useMemo(() => ({
    baseColor: { value: new Color('#b67950') },
    mistColor: { value: new Color('#c79169') },
  }), []);

  return (
    <mesh frustumCulled={false} renderOrder={-100} raycast={() => null}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader}
        depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
