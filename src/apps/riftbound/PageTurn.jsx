import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import './page-turn.css';

const TURN = { duration: 1.05, ease: [.4, .05, .25, 1] };

// Each child is one four-pocket page. A leaf has two different printed faces.
export default function PageTurn({ page, direction, resetKey, pages, fallback, onTurning }) {
  const reduced = useReducedMotion();
  const previous = useRef(null);
  const serial = useRef(0);
  const [settled, setSettled] = useState(null);
  const [leaf, setLeaf] = useState(null);

  useLayoutEffect(() => {
    if (!pages) return;
    const next = { page, pages, resetKey };
    const old = previous.current;
    if (old && old.resetKey === resetKey && old.page !== page && !reduced) {
      setLeaf({ id: ++serial.current, direction, from: old.pages, to: pages });
      onTurning(true);
    } else if (old?.resetKey !== resetKey || reduced) {
      setLeaf(null);
      onTurning(false);
    }
    previous.current = next;
    setSettled(next);
  }, [page, pages, resetKey, direction, reduced, onTurning]);

  const visible = pages || (settled?.resetKey === resetKey ? settled.pages : null);
  if (!visible) return fallback;
  const turning = leaf && !reduced;
  const forward = leaf?.direction > 0;
  // Keep the landing side on the old spread until the turned sheet covers it.
  const left = turning ? (forward ? leaf.from[0] : leaf.to[0]) : visible[0];
  const right = turning ? (forward ? leaf.to[1] : leaf.from[1]) : visible[1];
  const finish = () => {
    setLeaf(current => current?.id === leaf.id ? null : current);
    onTurning(false);
  };

  return <div className="rb-page-turn-stage" aria-busy={!pages || !!turning}>
    <div className="rb-open-spread" inert={turning || !pages ? true : undefined} aria-hidden={turning ? true : undefined}>
      <div className="rb-sheet rb-sheet-left">{left}</div>
      <div className="rb-sheet rb-sheet-right">{right}</div>
    </div>
    <div className="rb-binder-spine" aria-hidden="true"><i /><i /><i /></div>
    {turning && <div className="rb-leaf-layer" aria-hidden="true" inert>
      <motion.div className={`rb-leaf-shadow ${forward ? 'rb-shadow-left' : 'rb-shadow-right'}`}
        key={`shadow-${leaf.id}`} initial={{ opacity: 0 }} animate={{ opacity: [0, .35, 0] }} transition={TURN} />
      <motion.div key={leaf.id} className={`rb-paper-leaf ${forward ? 'rb-leaf-forward' : 'rb-leaf-backward'}`}
        initial={{ rotateY: 0 }} animate={{ rotateY: forward ? -180 : 180 }} transition={TURN} onAnimationComplete={finish}>
        <div className={`rb-leaf-face rb-leaf-front rb-sheet ${forward ? 'rb-sheet-right' : 'rb-sheet-left'}`}>
          {forward ? leaf.from[1] : leaf.from[0]}
          <motion.div className="rb-page-shading" initial={{ opacity: 0 }} animate={{ opacity: [0, .28, 0] }} transition={TURN} />
        </div>
        <div className={`rb-leaf-face rb-leaf-back rb-sheet ${forward ? 'rb-sheet-left' : 'rb-sheet-right'}`}>
          {forward ? leaf.to[0] : leaf.to[1]}
          <motion.div className="rb-page-shading" initial={{ opacity: 0 }} animate={{ opacity: [0, .28, 0] }} transition={TURN} />
        </div>
      </motion.div>
    </div>}
  </div>;
}
