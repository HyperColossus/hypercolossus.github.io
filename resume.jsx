/* global React, ReactDOM */
// Editorial Bold résumé — dark sidebar ("black bar"), cream paper, electric-orange accent.
// Single page, US Letter (816×1056). The dark sidebar is print-safe via
// print-color-adjust: exact in Resume.html so it survives "Save as PDF".

// ---------- TWEAKS ----------
const DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#FF5C2E",
  "sidebarTone": "dark",
  "italicSurname": true,
  "showStats": false
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = [
  "#FF5C2E", // electric orange (original)
  "#C8302D", // crimson
  "#2A5BFF", // cobalt
  "#7FB800", // lime
  "#7E3F8F", // plum
  "#0E0E12", // ink (mono)
];

// ---------- DATA ----------
const RESUME = {
  name: "Zachary Siegel",
  initials: "ZS",
  title: "Social Media & Content Producer",
  niche: "Esports",
  location: "Stony Point, NY",
  email: "dzjwarior1@gmail.com",
  phone: "(845) 499-4717",
  github: "github.com/HyperColossus",

  summary:
    "Esports social media manager and video producer with hands-on experience running broadcast-scale accounts for League of Legends and the NACL. Four years building communities, leading teams, and shipping content that competes for attention against the rest of the internet.",

  experience: [
    {
      role: "Social Media Manager — watchNACL",
      company: "Liga ACE",
      period: "Apr 2026 — Present",
      location: "Remote",
      bullets: [
        "Run the official @watchNACL account covering the North American Challengers League, the tier-2 League of Legends circuit feeding LCS rosters.",
        "Understand the full content calendar across twitter — match coverage, highlights, storylines and understanding developing talent.",
        "In-depth understanding of the League of Legends community and gaming communities as a whole.",
      ],
    },
    {
      role: "Social Media Manager - LPL_English",
      company: "LPL English",
      period: "Apr 2025 — Present",
      location: "Remote",
      bullets: [
        "Manage social for the fan made English-language broadcast of the LPL — the Chinese professional League of Legends league.",
        "Localize Chinese-language storylines for Western audiences and coordinate with talent + production on launch days.",
        "Grew engagement through reactive, narrative-driven posting across X.",
      ],
    },
    {
      role: "President",
      company: "Wildcat Esports — SUNY Polytechnic Institute",
      period: "Apr 2023 — May 2025",
      location: "Utica, NY",
      bullets: [
        "Led a 7-person exec team running competitive and casual gaming programming for 500+ students.",
        "Competed and coached the Overwatch 2 varsity team to championship runs in ECAC and SUNY leagues.",
        "Built out events, tryouts, and league entries; turned a club into a year-round campus institution.",
      ],
    },
    {
      role: "Freelance Video Editor",
      company: "Independent (SamIsDual & others)",
      period: "2022 — Present",
      location: "Remote",
      bullets: [
        "Edit gaming long-form, shorts, and thumbnails for YouTube and TikTok creators including SamIsDual.",
        "Fast turnaround on revisions; comfortable working inside an existing channel voice without breaking it.",
      ],
    },
  ],

  education: [
    {
      degree: "B.S. Interactive Media & Game Design, Minor in CS",
      school: "SUNY Polytechnic Institute",
      period: "May 2025",
      note: "Shipped three games end-to-end, led two and provided competitive gaming experience to hundreds of students.",
    },
    {
      degree: "A.S. Computer Science",
      school: "Rockland Community College",
      period: "May 2022",
    },
  ],

  skills: {
    Social: ["Content strategy", "Community management", "X / TikTok / YouTube Shorts", "Reactive posting", "Talent coordination"],
    Production: ["Premiere Pro", "After Effects", "Thumbnail design", "Short-form editing", "Photoshop"],
    Esports: ["League of Legends", "Overwatch", "Broadcast workflow", "Team & league ops"],
    "Game Dev": ["Unity", "Unreal Engine", "Project leadership"],
  },
};

// ---------- RESUME ----------
function Resume({ t }) {
  const R = RESUME;
  const accent = t.accent;
  const dark = t.sidebarTone === 'dark';

  const ink = '#16130D';
  const paper = '#F4EFE4';
  const sideBg = dark ? ink : '#EAE3D2';
  const sideFg = dark ? paper : ink;
  const sideDim = dark ? 'rgba(244,239,228,0.6)' : 'rgba(22,19,13,0.55)';
  const sideDimer = dark ? 'rgba(244,239,228,0.45)' : 'rgba(22,19,13,0.4)';
  const sideRule = dark ? 'rgba(244,239,228,0.22)' : 'rgba(22,19,13,0.18)';
  const sideBorder = dark ? paper : ink;

  return (
    <div className="resume" style={{
      width: 816, height: 1056, background: paper, color: ink,
      fontFamily: 'Geist, system-ui, sans-serif', fontSize: 11, lineHeight: 1.45,
      display: 'grid', gridTemplateColumns: '270px 1fr', overflow: 'hidden', position: 'relative',
    }}>
      {/* SIDEBAR — the "black bar" */}
      <aside style={{
        background: sideBg, color: sideFg,
        padding: '44px 30px 36px',
        display: 'flex', flexDirection: 'column', gap: 28,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 18, right: 18,
          fontFamily: 'Geist Mono, monospace', fontSize: 9,
          color: sideDimer, letterSpacing: '0.18em',
        }}>CV · 2026</div>

        {/* Avatar */}
        <div style={{
          width: 92, height: 92, borderRadius: '50%',
          background: accent, color: ink,
          fontFamily: 'Instrument Serif, serif', fontSize: 44, fontStyle: 'italic',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          letterSpacing: '-0.02em',
          border: `2px solid ${sideBorder}`,
        }}>{R.initials}</div>

        {/* Contact */}
        <div>
          <SideHead label="Contact" accent={accent} ruleColor={sideRule} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Row k="Mail" v={R.email} dim={sideDim} fg={sideFg} />
            <Row k="Tel"  v={R.phone} dim={sideDim} fg={sideFg} />
            <Row k="Loc"  v={R.location} dim={sideDim} fg={sideFg} />
            <Row k="Git"  v={R.github} dim={sideDim} fg={sideFg} />
          </div>
        </div>

        {/* Skills */}
        <div>
          <SideHead label="Skills" accent={accent} ruleColor={sideRule} />
          {Object.entries(R.skills).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 14 }}>
              <div style={{
                fontFamily: 'Geist Mono, monospace', fontSize: 9,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: sideDim, marginBottom: 5,
              }}>{group}</div>
              <div style={{ fontSize: 10.5, color: sideFg, lineHeight: 1.55 }}>{items.join(' · ')}</div>
            </div>
          ))}
        </div>

        {/* Education */}
        <div>
          <SideHead label="Education" accent={accent} ruleColor={sideRule} />
          {R.education.map((ed, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 16, lineHeight: 1.2, color: sideFg }}>{ed.school}</div>
              <div style={{ fontSize: 10, color: sideDim, marginTop: 2 }}>{ed.degree}</div>
              <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 9, color: accent, marginTop: 3, letterSpacing: '0.06em' }}>{ed.period}</div>
              {ed.note && <div style={{ fontSize: 9.5, color: sideDim, marginTop: 4, fontStyle: 'italic' }}>{ed.note}</div>}
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ padding: '44px 44px 36px', position: 'relative' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: 'Geist Mono, monospace', fontSize: 9,
          color: '#8a8474', letterSpacing: '0.18em',
          textTransform: 'uppercase', marginBottom: 18,
        }}>
          <span>Résumé · 01 / 01</span>
          <span>Stony Point → Anywhere</span>
        </div>

        <h1 style={{
          margin: 0,
          fontFamily: 'Instrument Serif, serif',
          fontWeight: 400, fontSize: 68, lineHeight: 0.92,
          letterSpacing: '-0.02em', color: ink,
        }}>
          Zachary<br />
          <span style={{
            fontStyle: t.italicSurname ? 'italic' : 'normal',
            color: accent,
          }}>Siegel.</span>
        </h1>

        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            background: ink, color: paper,
            fontFamily: 'Geist Mono, monospace', fontSize: 9.5,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            padding: '5px 10px', borderRadius: 999,
          }}>{R.niche}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: ink }}>{R.title}</span>
        </div>

        <p style={{
          marginTop: 18, fontSize: 12, lineHeight: 1.55, color: '#3a352a',
          fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
          fontWeight: 400, maxWidth: 460,
        }}>{R.summary}</p>

        {t.showStats && (
          <div style={{
            marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8, paddingTop: 14, borderTop: `1px solid rgba(22,19,13,0.12)`,
          }}>
            {[
              { k: '2', v: 'Pro broadcasts' },
              { k: '500+', v: 'Esports community' },
              { k: '4×', v: "Dean's List" },
              { k: '3', v: 'Games shipped' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, lineHeight: 1, color: accent, letterSpacing: '-0.02em' }}>{s.k}</div>
                <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 8.5, color: '#8a8474', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>{s.v}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: t.showStats ? 18 : 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent }}>Experience</span>
            <span style={{ flex: 1, height: 1, background: ink, opacity: 0.18 }} />
          </div>

          {R.experience.map((job, i) => (
            <article key={i} style={{ marginBottom: 14, display: 'grid', gridTemplateColumns: '78px 1fr', gap: 14 }}>
              <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 9, color: '#8a8474', letterSpacing: '0.04em', lineHeight: 1.4, paddingTop: 3 }}>
                {job.period.split(' — ').map((p, j) => <div key={j}>{p}</div>)}
                <div style={{ marginTop: 2, color: accent }}>{job.location}</div>
              </div>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'Instrument Serif, serif', fontWeight: 400, fontSize: 18, lineHeight: 1.15, color: ink }}>{job.role}</h3>
                <div style={{ fontSize: 11, color: '#3a352a', marginTop: 2, fontWeight: 500 }}>{job.company}</div>
                <ul style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {job.bullets.map((b, j) => (
                    <li key={j} style={{ fontSize: 10.5, color: '#3a352a', lineHeight: 1.5, paddingLeft: 12, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: 7, width: 5, height: 1, background: accent }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}

function SideHead({ label, accent, ruleColor }) {
  return (
    <div style={{
      fontFamily: 'Geist Mono, monospace', fontSize: 9.5,
      letterSpacing: '0.18em', textTransform: 'uppercase',
      color: accent, marginBottom: 10,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span>{label}</span>
      <span style={{ flex: 1, height: 1, background: ruleColor }} />
    </div>
  );
}

function Row({ k, v, dim, fg }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 10.5, lineHeight: 1.5 }}>
      <span style={{
        fontFamily: 'Geist Mono, monospace', fontSize: 8.5, color: dim,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        width: 32, flexShrink: 0,
      }}>{k}</span>
      <span style={{ fontSize: 10.5, color: fg, wordBreak: 'break-word' }}>{v}</span>
    </div>
  );
}

// ---------- TWEAKS PANEL (design-host only; inert in deployment) ----------
function ResumeTweaks({ t, setTweak }) {
  const { TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakToggle } = window;
  if (!TweaksPanel) return null;
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Style">
        <TweakColor
          label="Accent"
          value={t.accent}
          options={ACCENT_OPTIONS}
          onChange={(v) => setTweak('accent', v)}
        />
        <TweakRadio
          label="Sidebar"
          value={t.sidebarTone}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
          onChange={(v) => setTweak('sidebarTone', v)}
        />
        <TweakToggle
          label="Italic surname"
          value={t.italicSurname}
          onChange={(v) => setTweak('italicSurname', v)}
        />
        <TweakToggle
          label="Show stat strip"
          value={t.showStats}
          onChange={(v) => setTweak('showStats', v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

// ---------- APP ----------
function App() {
  const useTweaks = window.useTweaks;
  const [t, setTweak] = useTweaks ? useTweaks(DEFAULTS) : [DEFAULTS, () => {}];
  return (
    <>
      <div className="stage">
        <div className="sheet">
          <Resume t={t} />
        </div>
      </div>
      <ResumeTweaks t={t} setTweak={setTweak} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
