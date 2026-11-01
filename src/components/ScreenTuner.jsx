import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { DEFAULTS, tuning, tuningCode } from './screenTuning';
import './screen-tuner.css';

// Screen Tuner: a developer panel (open the site with ?tune) for fitting the desktop screen into
// the monitor's bezel. Changes apply live and are remembered in this browser; "Copy code" gives
// the line to paste over DEFAULTS in screenTuning.js to make them permanent for everyone.
const MM = 1000; // scene units are metres; the panel shows millimetres
const SLIDERS = [
  { key: 'x', label: 'Left / right', unit: 'mm', scale: MM, min: DEFAULTS.x - 0.03, max: DEFAULTS.x + 0.03, step: 0.0002 },
  { key: 'y', label: 'Down / up', unit: 'mm', scale: MM, min: DEFAULTS.y - 0.03, max: DEFAULTS.y + 0.03, step: 0.0002 },
  { key: 'z', label: 'Back / forward', unit: 'mm', scale: MM, min: DEFAULTS.z - 0.04, max: DEFAULTS.z + 0.03, step: 0.0002 },
  { key: 'tilt', label: 'Tilt', unit: '°', scale: 180 / Math.PI, min: -0.25, max: 0.1, step: 0.001 },
  { key: 'fit', label: 'Size', unit: '%', scale: 100, min: 0.85, max: 1.05, step: 0.001 },
];

export default function ScreenTuner() {
  const values = useSyncExternalStore(tuning.subscribe, tuning.get);
  const flags = useSyncExternalStore(tuning.subscribe, tuning.flags);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  useEffect(() => { document.documentElement.classList.toggle('tune-highlight', flags.highlight); }, [flags.highlight]);

  const copy = async () => {
    const code = tuningCode(values);
    try { await navigator.clipboard.writeText(code); } catch { window.prompt('Copy these lines:', code); }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (!open) return <button className="tuner-tab" onClick={() => setOpen(true)}>Screen Tuner</button>;
  return <aside className="tuner" aria-label="Screen Tuner">
    <header>
      <b>Screen Tuner</b>
      <button aria-label="Hide Screen Tuner" onClick={() => setOpen(false)}>–</button>
    </header>
    <p className="tuner-help">Drag the sliders, or click one and use the arrow keys for fine steps. Orbit around the computer to check it from every side.</p>
    {SLIDERS.map(({ key, label, unit, scale, min, max, step }) => {
      const shown = (values[key] - (unit === 'mm' ? DEFAULTS[key] : 0)) * scale;
      return <label key={key} className="tuner-row">
        <span>{label}</span>
        <input type="range" min={min} max={max} step={step} value={values[key]} onChange={event => tuning.set({ [key]: Number(event.target.value) })} />
        <output>{unit === 'mm' && shown > 0 ? '+' : ''}{shown.toFixed(unit === '%' ? 1 : unit === '°' ? 2 : 1)} {unit}</output>
        <button className="tuner-reset-one" title={`Reset ${label.toLowerCase()}`} onClick={event => { event.preventDefault(); tuning.set({ [key]: DEFAULTS[key] }); }}>↺</button>
      </label>;
    })}
    <div className="tuner-flags">
      <label><input type="checkbox" checked={flags.highlight} onChange={event => tuning.setFlags({ highlight: event.target.checked })} /> Highlight screen</label>
      <label><input type="checkbox" checked={flags.freeze} onChange={event => tuning.setFlags({ freeze: event.target.checked })} /> Stop floating</label>
    </div>
    <div className="tuner-actions">
      <button onClick={() => tuning.reset()}>Reset all</button>
      <button className="is-primary" onClick={copy}>{copied ? 'Copied!' : 'Copy code'}</button>
    </div>
    <pre className="tuner-code">{tuningCode(values)}</pre>
  </aside>;
}
