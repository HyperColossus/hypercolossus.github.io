import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { backdrop, createBottle, createStage } from './bottle';

// Boot progress: the HYPER bottle, tipped 45°, fills with cola from empty to full over `duration`.
// `onProgress(0..1)` reports the level so the screen can show it to assistive tech.
export default function BootBottle({ duration, onProgress }) {
  const host = useRef(null);
  const report = useRef(onProgress);
  report.current = onProgress;

  useEffect(() => {
    // The scene paints the same gradient as the boot screen, so the glass has something to refract.
    const stage = createStage(host.current, { fov: 28, background: backdrop({ top: '#07070c', bottom: '#151026' }) });
    const bottle = createBottle({ fill: 0 });
    const tilt = new THREE.Group();
    bottle.group.position.y = -0.5; // turn about the bottle's middle
    tilt.add(bottle.group);
    tilt.rotation.z = -Math.PI / 4; // neck up and to the right
    stage.scene.add(tilt);
    tilt.position.y = 0.1; // leave room for the caption below
    stage.camera.position.set(0, 0.02, 3.05);
    stage.camera.lookAt(0, 0, 0);

    const start = performance.now();
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    let frame = 0;
    const tick = now => {
      const t = Math.min(1, (now - start) / duration);
      tilt.rotation.y = Math.sin(now / 1400) * 0.18 - 0.2; // a slow sway so the glass catches the light
      bottle.setFill(ease(t) * 0.97);
      report.current?.(t);
      stage.render();
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); stage.dispose(); };
  }, [duration]);

  return <div ref={host} className="boot-bottle" aria-hidden="true" />;
}
