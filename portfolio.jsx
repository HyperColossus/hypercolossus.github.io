/* global React, ReactDOM */
const { useEffect, useRef, useState, useCallback, useMemo } = React;

// ---------- TWEAK DEFAULTS ----------
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#ff6a1a",
  "displayFont": "Instrument Serif",
  "cursorTrail": true,
  "grain": true,
  "heroVariant": "stacked",
  "projectCardStyle": "split",
  "carouselAuto": true
}/*EDITMODE-END*/;

// ---------- CAROUSEL DATA ----------
const CAROUSEL = [
  {
    id: "c1",
    kind: "video",
    client: "Echo Studios",
    title: "The Long Way Home",
    type: "Documentary cut",
    duration: "12:04",
    year: "2025",
    metric: "1.2M views",
    color: "#1f2a1a",
  },
  {
    id: "c2",
    kind: "tweet",
    handle: "@zacksiegel",
    date: "Apr 18, 2025",
    body: "shipped a one-week game jam build to 2,400 downloads in 36 hours. devlogs are the marketing.",
    stats: { likes: "4.2K", reposts: "612", replies: "188" },
  },
  {
    id: "c3",
    kind: "video",
    client: "Northbeam",
    title: "Founder, in 90 seconds",
    type: "Brand film",
    duration: "1:32",
    year: "2025",
    metric: "Series A launch reel",
    color: "#1a1f2a",
  },
  {
    id: "c4",
    kind: "tweet",
    handle: "@zacksiegel",
    date: "Feb 03, 2025",
    body: "three years of editing taught me one thing — the cut should land before the viewer knows why. everything else is decoration.",
    stats: { likes: "11.8K", reposts: "1.9K", replies: "342" },
  },
  {
    id: "c5",
    kind: "video",
    client: "Lumen Labs",
    title: "Hollow Field — Reveal",
    type: "Game trailer",
    duration: "1:12",
    year: "2024",
    metric: "14k wishlists",
    color: "#2a1f1a",
  },
  {
    id: "c6",
    kind: "tweet",
    handle: "@zacksiegel",
    date: "Nov 22, 2024",
    body: "hot take: the best brand accounts on here read like a person who's slightly tired and slightly amused. corporate voice is a tax you pay for being boring.",
    stats: { likes: "8.6K", reposts: "1.2K", replies: "294" },
  },
];

// ---------- DATA ----------
const SKILLS = [
  {
    id: "social",
    num: "01",
    title: "Social Media Consulting",
    blurb: "Strategy, content systems, and growth playbooks for brands and creators who want to stop guessing.",
    deliverables: ["Audit & strategy", "Content pillars", "Posting cadence", "Analytics & iteration"],
    details: {
      overview: "I treat social like a system, not a hobby. Brands hire me when they're tired of posting into the void — I give them a content engine they can actually run, plus a strategy that compounds instead of starting over every quarter.",
      process: [
        { step: "01", label: "Audit", body: "Three weeks deep on existing content, competitors, and audience signal. Output: a doc that says exactly what's working and what isn't." },
        { step: "02", label: "Strategy", body: "Three to five content pillars, a posting cadence, and a measurement plan we agree on before anything ships." },
        { step: "03", label: "Build", body: "Templates, recurring formats, and the first month of content produced with the team so they can keep the cadence solo." },
        { step: "04", label: "Iterate", body: "Monthly check-ins for three months. Adjust pillars, double down on what's working, kill what isn't." },
      ],
      wins: [
        { metric: "+184%", body: "Follower growth for Northbeam over six months." },
        { metric: "2.1M", body: "Organic views for Halo Run's relaunch month." },
        { metric: "8k", body: "Waitlist signups for Sidequest pre-launch." },
      ],
    },
  },
  {
    id: "games",
    num: "02",
    title: "Game Development",
    blurb: "Concept to ship — gameplay programming, systems design, and rapid prototyping in Unity and Godot.",
    deliverables: ["Prototyping", "Gameplay systems", "Shaders & FX", "Release & live ops"],
    details: {
      overview: "I ship games as a one-person studio and contract on systems work for bigger teams. My sweet spot is gameplay programming with a designer's eye — the kind of code that makes a mechanic feel right, not just function.",
      process: [
        { step: "01", label: "Prototype", body: "One week, one core loop. If the prototype isn't fun, the polished version won't be either." },
        { step: "02", label: "Vertical slice", body: "A polished five minutes that proves the art direction, the systems, and the marketing angle all at once." },
        { step: "03", label: "Production", body: "Steady cadence, public devlogs, and a Steam page collecting wishlists from day one." },
        { step: "04", label: "Ship", body: "Demo → release → patches. Live ops and community management included." },
      ],
      wins: [
        { metric: "14k+", body: "Wishlists for Hollow Field in three weeks of devlogs." },
        { metric: "Top 12", body: "GMTK Jam 2024 — Splice, out of 4,300 entries." },
        { metric: "92%", body: "Positive Steam reviews on Splice demo." },
      ],
    },
  },
  {
    id: "esports",
    num: "03",
    title: "Esports",
    blurb: "Competitive player and content operator. Years in the scene mean I know what makes a clip travel, a stream stick, and a team feel like a team.",
    deliverables: ["Competitive play", "Team content", "Broadcasting", "Coaching"],
    details: {
      overview: "I came up competing and stayed for the production side. I know what coaches want from VOD reviews, what casters need from team comms, and what fans actually clip — which is why my content for orgs converts better than the agency stuff.",
      process: [
        { step: "01", label: "Compete", body: "Active rostered player across regional and online leagues — gives me the firsthand context most content people lack." },
        { step: "02", label: "Operate", body: "Team logistics, sponsor deliverables, social posting for orgs that need a player who can also run the back office." },
        { step: "03", label: "Create", body: "Highlight reels, frag movies, vlog-style team content, broadcast packages." },
        { step: "04", label: "Coach", body: "1:1 and small-group sessions on positioning, comms, and the mental side." },
      ],
      wins: [
        { metric: "T8", body: "Regional placement, 2025 season." },
        { metric: "300k", body: "Combined views on a single team highlight reel." },
        { metric: "12", body: "Orgs and creators I've produced content for." },
      ],
    },
  },
];

const PIECES = [
  { id: "p1", client: "Echo Studios", type: "Long-form", duration: "12:04", year: "2025", tag: "Documentary cut", color: "#1a2e1a" },
  { id: "p2", client: "Halo Run", type: "Short / Reel", duration: "0:42", year: "2025", tag: "Hook + payoff", color: "#2e1a1a" },
  { id: "p3", client: "Northbeam", type: "Brand film", duration: "1:58", year: "2025", tag: "Founder story", color: "#1a1a2e" },
  { id: "p4", client: "Lumen Labs", type: "Trailer", duration: "1:12", year: "2024", tag: "Game launch", color: "#2e2a1a" },
  { id: "p5", client: "Caliber", type: "Montage", duration: "3:20", year: "2024", tag: "Athlete reel", color: "#1a2a2e" },
  { id: "p6", client: "Sidequest", type: "Short / Reel", duration: "0:58", year: "2024", tag: "Devlog edit", color: "#2a1a2e" },
];

const CLIENT_WORK = [
  {
    id: "cw1",
    client: "Northbeam",
    industry: "Marketing Analytics",
    role: "Social Strategy & Content",
    year: "2025",
    summary: "Built a founder-led content engine — weekly threads, monthly brand films, and a posting cadence the team could run without me.",
    deliverables: ["Strategy", "Content system", "Editing"],
    metric: "+184% follower growth",
    color: "#1a1f2a",
  },
  {
    id: "cw2",
    client: "Lumen Labs",
    industry: "Indie Game Studio",
    role: "Gameplay Programming",
    year: "2025",
    summary: "Shipped the dialogue, inventory, and save systems for an upcoming narrative RPG. Three months of focused contract work.",
    deliverables: ["Unity", "C#", "Dialogue tooling"],
    metric: "Demo at Day of the Devs",
    color: "#2a1a1f",
  },
  {
    id: "cw3",
    client: "Halo Run",
    industry: "DTC Beverage",
    role: "Brand & Video",
    year: "2024",
    summary: "Six-week sprint reshaping their TikTok presence — content pillars, a shoot day, and 30 short-form edits.",
    deliverables: ["Strategy", "Editing", "Motion"],
    metric: "2.1M organic views",
    color: "#1a2a1f",
  },
  {
    id: "cw4",
    client: "Sidequest",
    industry: "Creator Tools",
    role: "Launch Consultant",
    year: "2024",
    summary: "Took a pre-launch SaaS from zero to 8k waitlist signups through devlog-style marketing across X and YouTube.",
    deliverables: ["Strategy", "Devlog series", "Editing"],
    metric: "8k waitlist signups",
    color: "#1f1a2a",
  },
];

const PROJECTS = [
  {
    id: "pr1",
    num: "01",
    name: "Hollow Field",
    kind: "Game · Atmospheric Roguelike",
    year: "2025",
    role: "Solo developer",
    summary: "A first-person scavenger built on a procedurally-grown wheat field. Shipped to 14k wishlists in three weeks of devlogs.",
    stack: ["Unity", "URP", "C#", "FMOD"],
    metric: "14k+ wishlists",
    accent: "#9eff00",
    details: {
      timeline: "Mar 2024 → Ongoing",
      status: "Steam Next Fest 2026",
      overview: "Hollow Field is a single-player scavenger set on a procedurally regrown wheat field that hides one bad thing per run. I'm building it solo — code, art direction, sound, marketing — and using a public devlog cadence to grow an audience before launch.",
      sections: [
        { label: "Challenge", body: "Selling vibes is hard. The pitch is atmosphere first, mechanics second — which means every devlog has to do the work of a trailer." },
        { label: "Outcome", body: "Three devlog episodes took the Steam page from zero to 14k wishlists in 22 days. The fourth pushed it past 18k. The wishlist-to-view ratio is sitting around 9%." },
      ],
      tools: ["Unity 2023", "URP", "C#", "FMOD Studio", "Houdini", "Aseprite", "Blender", "Substance"],
      gallery: [
        { color: "#1f2a1a", label: "Field — wide shot" },
        { color: "#2a241a", label: "Inventory UI" },
        { color: "#1a1f2a", label: "Devlog #3 thumbnail" },
      ],
      links: [
        { label: "Steam page", url: "#" },
        { label: "Devlog playlist", url: "#" },
        { label: "Press kit", url: "#" },
      ],
    },
  },
  {
    id: "pr2",
    num: "02",
    name: "Splice",
    kind: "Game · Co-op Puzzler",
    year: "2024",
    role: "Design & Programming",
    summary: "Two players share one rope. A jam game that grew into a 6-month project with a polished demo and Steam page.",
    stack: ["Godot", "GDScript", "Steamworks"],
    metric: "Top 12 of 4,300",
    accent: "#9eff00",
    details: {
      timeline: "Jul 2024 → Jan 2025",
      status: "Demo on Steam",
      overview: "Splice started as a 48-hour entry to GMTK Game Jam and placed Top 12 out of 4,300 entries. The mechanic — two players physically share one rope — was strong enough that I shipped a six-month polish pass and a public demo.",
      sections: [
        { label: "Challenge", body: "Online co-op with physics-driven rope state was the hard part. Tick-rate mismatches caused desyncs that broke the puzzle." },
        { label: "Outcome", body: "The demo has a 92% positive rating across 340 reviews. Steam wishlist conversion sits at 14% on demo visitors." },
      ],
      tools: ["Godot 4", "GDScript", "Steamworks SDK", "Aseprite"],
      gallery: [
        { color: "#1a2a2a", label: "Co-op puzzle 04" },
        { color: "#2a1f2a", label: "Menu screen" },
      ],
      links: [
        { label: "Play demo on Steam", url: "#" },
        { label: "Jam page", url: "#" },
      ],
    },
  },
  {
    id: "pr3",
    num: "03",
    name: "Field Notes",
    kind: "Content System · Personal Brand",
    year: "2024 — ongoing",
    role: "Creator & operator",
    summary: "A weekly devlog series that doubles as the marketing engine for everything else. Built the system, run the cadence.",
    stack: ["Notion", "DaVinci", "Premiere", "Riverside"],
    metric: "30k followers",
    accent: "#9eff00",
    details: {
      timeline: "Feb 2024 → Ongoing",
      status: "Weekly cadence",
      overview: "Field Notes is the content backbone of everything I do — devlogs, thread posts, podcast clips. The point isn't volume, it's compounding: every game release, every esports run, every consulting engagement gets stitched into the same audience.",
      sections: [
        { label: "Challenge", body: "Consistency. The first nine months were unglamorous — 1k → 4k followers — but the system held and the audience finally caught on." },
        { label: "Outcome", body: "30k+ followers across X and YouTube. The list of inbound consulting briefs is now long enough that I can choose who I work with." },
      ],
      tools: ["Notion", "DaVinci Resolve", "Premiere", "Riverside", "Buffer"],
      gallery: [
        { color: "#1a2a1f", label: "Episode index" },
        { color: "#2a2a1a", label: "Thread template" },
        { color: "#1f1a2a", label: "Analytics dash" },
      ],
      links: [
        { label: "YouTube channel", url: "#" },
        { label: "X / @zacksiegel", url: "#" },
        { label: "Substack archive", url: "#" },
      ],
    },
  },
];

// ---------- HOOKS ----------
function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setY(window.scrollY);
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return y;
}

function useReveal() {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return [ref, shown];
}

// ---------- COMPONENTS ----------
function Reveal({ children, delay = 0, as: Tag = "div", className = "", style = {} }) {
  const [ref, shown] = useReveal();
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        ...style,
        transform: shown ? "translateY(0)" : "translateY(28px)",
        opacity: shown ? 1 : 0,
        transition: `transform 1s cubic-bezier(.2,.7,.2,1) ${delay}ms, opacity 1s ease ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}

function Cursor({ enabled }) {
  const dot = useRef(null);
  const ring = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;
    let raf = 0;
    let hovering = false;
    const onMove = (e) => { mx = e.clientX; my = e.clientY; };
    const onOver = (e) => {
      const t = e.target;
      hovering = !!(t.closest && t.closest("[data-magnet], a, button"));
      if (ring.current) ring.current.dataset.hover = hovering ? "1" : "0";
    };
    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (dot.current) dot.current.style.transform = `translate3d(${mx - 3}px, ${my - 3}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${rx - 18}px, ${ry - 18}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);
  if (!enabled) return null;
  return (
    <>
      <div ref={dot} className="cursor-dot" />
      <div ref={ring} className="cursor-ring" data-hover="0" />
    </>
  );
}

function Magnet({ children, strength = 18, className = "", style = {} }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${(x / r.width) * strength}px, ${(y / r.height) * strength}px)`;
    };
    const onLeave = () => { el.style.transform = "translate(0,0)"; };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [strength]);
  return (
    <span ref={ref} data-magnet="1" className={className} style={{ display: "inline-block", transition: "transform .35s cubic-bezier(.2,.7,.2,1)", ...style }}>
      {children}
    </span>
  );
}

// ---------- SECTIONS ----------
function TopNav() {
  return (
    <nav className="topnav">
      <a href="#top" className="brand">ZS</a>
      <ul>
        <li><a href="#skills">Skills</a></li>
        <li><a href="#carousel">Work</a></li>
        <li><a href="#projects">Projects</a></li>
        <li><a href="Resume.html">Résumé</a></li>
        <li><a href="#contact"><Magnet strength={6}>Contact</Magnet></a></li>
      </ul>
      <div className="status"><span className="dot" /> Available — May ’26</div>
    </nav>
  );
}

function Hero({ accent, displayFont, variant }) {
  const y = useScrollY();
  const [vh, setVh] = useState(typeof window !== "undefined" ? window.innerHeight : 800);
  useEffect(() => {
    const onR = () => setVh(window.innerHeight);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  const progress = Math.min(1, y / vh);
  const t = (a, b) => a + (b - a) * progress;

  return (
    <header className="hero" id="top" style={{ "--accent": accent, "--display": `'${displayFont}', serif` }}>
      <div className="hero-bg" style={{ transform: `translate3d(0, ${y * 0.35}px, 0) scale(${1 + progress * 0.06})`, opacity: 1 - progress * 0.4 }}>
        <div className="hero-bg-stripes" />
        <div className="hero-bg-vignette" />
      </div>

      <div className="hero-meta-row">
        <div>Portfolio · v.2026</div>
        <div>Stony Point, NY  ·  41.2°N</div>
        <div>Currently building → <a href="#projects" className="hero-meta-link"><em>Hollow Field</em></a></div>
      </div>

      <div className="hero-stack" style={{ transform: `translateY(${-progress * 40}px)` }}>
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" /> Zachary Siegel
          </div>
          <h1 className="hero-title">
            <span className="line">Social media,</span>
            <span className="line">games, and</span>
            <span className="line"><em>esports.</em></span>
          </h1>
          <div className="hero-sub">
            <p>
              I help brands sound like themselves online, ship games as a one-person studio,
              and compete and create in the esports scene.
            </p>
            <a href="#projects" className="hero-cta">
              <Magnet strength={10}>
                <span>See the work</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Magnet>
            </a>
          </div>
        </div>

        <a className="hero-feature" href="#carousel" data-magnet="1" style={{ transform: `translate3d(0, ${progress * -20}px, 0) rotate(${progress * -1.5}deg)` }}>
          <div className="hf-frame">
            <div className="hf-stripes" />
            <div className="hf-glow" />

            <div className="hf-corner tl">
              <span className="hf-rec" />
              <span>Showreel · 02:14</span>
            </div>
            <div className="hf-corner tr">
              <span>Available</span>
              <span className="hf-arrow">↗</span>
            </div>

            <div className="hf-play">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M7 4l11 7-11 7V4z" fill="currentColor" /></svg>
            </div>

            <div className="hf-bottom">
              <div className="hf-bottom-label">[ portrait / showreel — replace ]</div>
              <div className="hf-bottom-meta">
                <div className="hf-meta-row"><span>Role</span><b>Player · Creator · Dev</b></div>
                <div className="hf-meta-row"><span>Now</span><b>Q3 2026 · NA</b></div>
              </div>
            </div>
          </div>

          <div className="hf-back hf-back-1" />
          <div className="hf-back hf-back-2" />
        </a>
      </div>

      <div className="hero-scroll">
        <span>Scroll</span>
        <div className="hero-scroll-line"><div className="hero-scroll-fill" style={{ transform: `scaleY(${progress})` }} /></div>
      </div>
    </header>
  );
}

function WorkCarousel({ auto }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = CAROUSEL.length;

  useEffect(() => {
    if (!auto || paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % total), 5200);
    return () => clearInterval(t);
  }, [auto, paused, total]);

  const go = (n) => setIdx(((n % total) + total) % total);
  const prev = () => go(idx - 1);
  const next = () => go(idx + 1);

  // touch
  const touch = useRef({ x: 0, t: 0 });
  const onTS = (e) => { touch.current = { x: e.touches[0].clientX, t: Date.now() }; };
  const onTE = (e) => {
    const dx = e.changedTouches[0].clientX - touch.current.x;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
  };

  return (
    <section className="carousel-wrap" id="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="carousel-head">
        <div className="kicker">— Featured Work  ·  In rotation</div>
        <div className="carousel-counter">
          <span className="cc-now">{String(idx + 1).padStart(2, "0")}</span>
          <span className="cc-sep">/</span>
          <span className="cc-tot">{String(total).padStart(2, "0")}</span>
        </div>
      </div>

      <div className="carousel-stage">
        <button className="carousel-nav prev" onClick={prev} aria-label="Previous">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        <div
          className="carousel"
          onTouchStart={onTS}
          onTouchEnd={onTE}
        >
          <div className="carousel-track" style={{ transform: `translateX(calc(-${idx} * (100% + 32px)))` }}>
            {CAROUSEL.map((item, i) => (
              <div key={item.id} className={`carousel-slide ${i === idx ? "is-active" : ""}`} aria-hidden={i !== idx}>
                {item.kind === "video" ? <VideoSlide item={item} /> : <TweetSlide item={item} />}
              </div>
            ))}
          </div>
        </div>

        <button className="carousel-nav next" onClick={next} aria-label="Next">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      <div className="carousel-dots">
        {CAROUSEL.map((item, i) => (
          <button
            key={item.id}
            className={`cd ${i === idx ? "is-active" : ""}`}
            onClick={() => go(i)}
            aria-label={`Slide ${i + 1}`}
          >
            <span className="cd-label">{item.kind === "video" ? item.client : "Post"}</span>
            <span className="cd-bar"><span className="cd-bar-fill" style={{ animationPlayState: i === idx && auto && !paused ? "running" : "paused", animationDuration: i === idx ? "5.2s" : "0s", width: i === idx ? undefined : (i < idx ? "100%" : "0%") }} /></span>
          </button>
        ))}
      </div>
    </section>
  );
}

function VideoSlide({ item }) {
  return (
    <article className="slide-video" style={{ "--slide-bg": item.color }}>
      <div className="slide-thumb">
        <div className="thumb-stripes" />
        <div className="slide-play">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M7 4l11 7-11 7V4z" fill="currentColor" /></svg>
        </div>
        <div className="slide-corner tl">
          <span className="rec-dot" /> {item.type}
        </div>
        <div className="slide-corner tr">{item.duration}</div>
        <div className="slide-corner bl">[ video — replace with embed ]</div>
      </div>
      <div className="slide-meta">
        <div className="sm-top">
          <div className="sm-client">{item.client}</div>
          <div className="sm-year">{item.year}</div>
        </div>
        <h3 className="sm-title">{item.title}</h3>
        <div className="sm-metric"><span className="sm-arrow">↗</span> {item.metric}</div>
      </div>
    </article>
  );
}

function TweetSlide({ item }) {
  return (
    <article className="slide-tweet">
      <div className="tweet-card">
        <div className="tweet-head">
          <div className="tweet-avatar">ZS</div>
          <div className="tweet-id">
            <div className="tweet-name">Zachary Siegel</div>
            <div className="tweet-handle">{item.handle}</div>
          </div>
          <svg className="tweet-logo" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
        </div>
        <p className="tweet-body">{item.body}</p>
        <div className="tweet-date">{item.date}</div>
        <div className="tweet-stats">
          <div><b>{item.stats.replies}</b> Replies</div>
          <div><b>{item.stats.reposts}</b> Reposts</div>
          <div><b>{item.stats.likes}</b> Likes</div>
        </div>
      </div>
      <div className="slide-tweet-side">
        <div className="kicker">— Post</div>
        <h3 className="sts-title">Field notes,<br />in public.</h3>
        <p>Threads, hot takes, and devlogs that double as the marketing engine.</p>
        <a href="#" className="sts-link">View on X →</a>
      </div>
    </article>
  );
}

function About() {
  return (
    <section className="about">
      <Reveal className="about-grid">
        <div className="about-photo">
          <div className="photo-stripes" />
          <div className="photo-tag">[ portrait — replace with photo ]</div>
        </div>
        <div className="about-copy">
          <div className="kicker">— About</div>
          <p className="about-lede">
            I&apos;m Zack. I work across three crafts that all answer the same question:
            <em> how do you make people feel something on a screen?</em>
          </p>
          <p>
            For brands, that&apos;s a content system that compounds. For games, it&apos;s a loop that rewards
            curiosity. For video, it&apos;s the cut you didn&apos;t see coming. Different timelines, same instinct.
          </p>
          <ul className="about-stats">
            <li><b>6+</b><span>years editing</span></li>
            <li><b>3</b><span>games shipped</span></li>
            <li><b>40+</b><span>brands consulted</span></li>
          </ul>
        </div>
      </Reveal>
    </section>
  );
}

function Skills() {
  const [openId, setOpenId] = useState(null);
  const toggle = (id) => setOpenId((cur) => (cur === id ? null : id));
  return (
    <section className="skills" id="skills">
      <Reveal className="section-head">
        <div className="kicker">— Skills</div>
        <h2>Three crafts.<br />One operator.</h2>
      </Reveal>
      <div className="skills-list">
        {SKILLS.map((s, i) => (
          <Reveal key={s.id} delay={i * 80}>
            <SkillRow s={s} expanded={openId === s.id} onToggle={() => toggle(s.id)} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function SkillRow({ s, expanded, onToggle }) {
  return (
    <div className={`skill-wrap ${expanded ? "is-open" : ""}`}>
      <button className="skill-trigger" onClick={onToggle} aria-expanded={expanded} aria-controls={`skill-details-${s.id}`}>
        <article className="skill-row">
          <div className="skill-num">{s.num}</div>
          <div className="skill-title">
            <h3>{s.title}</h3>
          </div>
          <p className="skill-blurb">{s.blurb}</p>
          <ul className="skill-deliv">
            {s.deliverables.map((d) => <li key={d}>{d}</li>)}
          </ul>
          <div className="skill-toggle"><ExpandIcon open={expanded} /></div>
        </article>
      </button>
      <div className="skill-details-wrap" id={`skill-details-${s.id}`} aria-hidden={!expanded}>
        <div className="skill-details">
          <SkillDetails s={s} />
        </div>
      </div>
    </div>
  );
}

function SkillDetails({ s }) {
  const d = s.details;
  if (!d) return null;
  return (
    <div className="sd-grid">
      <div className="sd-overview-col">
        <div className="kicker">— Overview</div>
        <p className="sd-overview">{d.overview}</p>
        {d.wins && (
          <div className="sd-wins">
            <div className="pd-section-label">Selected wins</div>
            <ul>
              {d.wins.map((w, i) => (
                <li key={i}>
                  <span className="sd-win-metric">{w.metric}</span>
                  <span className="sd-win-body">{w.body}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="sd-process">
        <div className="pd-section-label">How I work</div>
        <ol>
          {d.process.map((p) => (
            <li key={p.step}>
              <div className="sd-step">
                <span className="sd-step-num">{p.step}</span>
                <span className="sd-step-label">{p.label}</span>
              </div>
              <p>{p.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ClientWork() {
  return (
    <section className="clientwork" id="clientwork">
      <Reveal className="section-head">
        <div className="kicker">— Client Work  ·  Built for others</div>
        <h2>Hired hands.<br />Shipped things.</h2>
      </Reveal>
      <div className="cw-grid">
        {CLIENT_WORK.map((c, i) => (
          <Reveal key={c.id} delay={(i % 2) * 80}>
            <ClientCard c={c} num={String(i + 1).padStart(2, "0")} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ClientCard({ c, num }) {
  return (
    <article className="cw-card" data-magnet="1">
      <div className="cw-thumb" style={{ background: c.color }}>
        <div className="thumb-stripes" />
        <div className="cw-num">{num}</div>
        <div className="cw-client-mark">
          <div className="cw-logo">{c.client.charAt(0)}</div>
          <div>
            <div className="cw-cm-name">{c.client}</div>
            <div className="cw-cm-industry">{c.industry}</div>
          </div>
        </div>
        <div className="cw-year">{c.year}</div>
      </div>
      <div className="cw-body">
        <div className="cw-role">{c.role}</div>
        <p className="cw-summary">{c.summary}</p>
        <div className="cw-foot">
          <ul className="cw-deliv">
            {c.deliverables.map((d) => <li key={d}>{d}</li>)}
          </ul>
          <div className="cw-metric"><span>↗</span> {c.metric}</div>
        </div>
      </div>
    </article>
  );
}

function Pieces() {
  return (
    <section className="pieces" id="pieces">
      <Reveal className="section-head">
        <div className="kicker">— Pieces  ·  Selected video edits</div>
        <h2>Cuts I made for other people&apos;s stories.</h2>
      </Reveal>
      <div className="pieces-grid">
        {PIECES.map((p, i) => (
          <Reveal key={p.id} delay={(i % 3) * 70} className={`piece piece-${i % 3}`}>
            <PieceCard p={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function PieceCard({ p }) {
  return (
    <a className="piece-card" href="#" data-magnet="1">
      <div className="piece-thumb" style={{ background: p.color }}>
        <div className="thumb-stripes" />
        <div className="piece-play">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 4l10 6-10 6V4z" fill="currentColor" /></svg>
        </div>
        <div className="piece-duration">{p.duration}</div>
      </div>
      <div className="piece-meta">
        <div className="piece-client">{p.client}</div>
        <div className="piece-type">{p.type} · {p.year}</div>
      </div>
      <div className="piece-tag">{p.tag}</div>
    </a>
  );
}

function Projects({ style }) {
  const [openId, setOpenId] = useState(null);
  const toggle = (id) => setOpenId((cur) => (cur === id ? null : id));
  return (
    <section className="projects" id="projects">
      <Reveal className="section-head">
        <div className="kicker">— Projects  ·  Made for myself</div>
        <h2>The things I build<br />when nobody&apos;s asking.</h2>
      </Reveal>
      <div className={`projects-list style-${style}`}>
        {PROJECTS.map((pr, i) => (
          <Reveal key={pr.id} delay={i * 80}>
            <ProjectRow pr={pr} style={style} expanded={openId === pr.id} onToggle={() => toggle(pr.id)} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ProjectRow({ pr, style, expanded, onToggle }) {
  const rowRef = useRef(null);
  const onClick = (e) => {
    // don't trigger when an inner link/button is clicked inside the detail panel
    if (e.target.closest(".project-details a, .project-details button")) return;
    onToggle();
  };
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };
  return (
    <div
      ref={rowRef}
      className={`project-wrap style-${style} ${expanded ? "is-open" : ""}`}
      data-magnet="1"
    >
      <button className="project-trigger" onClick={onClick} onKeyDown={onKey} aria-expanded={expanded} aria-controls={`details-${pr.id}`}>
        {style === "minimal" ? <ProjectRowMinimal pr={pr} expanded={expanded} /> : <ProjectRowSplit pr={pr} expanded={expanded} />}
      </button>
      <div className="project-details-wrap" id={`details-${pr.id}`} aria-hidden={!expanded}>
        <div className="project-details">
          <ProjectDetails pr={pr} />
        </div>
      </div>
    </div>
  );
}

function ProjectRowMinimal({ pr, expanded }) {
  return (
    <article className="project-min">
      <div className="pm-num">{pr.num}</div>
      <div className="pm-name">{pr.name}</div>
      <div className="pm-kind">{pr.kind}</div>
      <div className="pm-year">{pr.year}</div>
      <div className="pm-toggle"><ExpandIcon open={expanded} /></div>
    </article>
  );
}

function ProjectRowSplit({ pr, expanded }) {
  return (
    <article className="project-split">
      <div className="ps-left">
        <div className="ps-num">{pr.num}</div>
        <div className="ps-meta">
          <div className="ps-year">{pr.year}</div>
          <div className="ps-role">{pr.role}</div>
        </div>
      </div>
      <div className="ps-mid">
        <h3 className="ps-name">{pr.name}</h3>
        <div className="ps-kind">{pr.kind}</div>
        <p className="ps-summary">{pr.summary}</p>
        <ul className="ps-stack">
          {pr.stack.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>
      <div className="ps-right">
        <div className="ps-thumb">
          <div className="thumb-stripes" />
          <div className="ps-thumb-label">[ {pr.name.toUpperCase()} — keyart ]</div>
        </div>
        <div className="ps-bottom-row">
          <div className="ps-metric"><span>↗</span> {pr.metric}</div>
          <div className="ps-toggle"><ExpandIcon open={expanded} /></div>
        </div>
      </div>
    </article>
  );
}

function ExpandIcon({ open }) {
  return (
    <span className={`expand-icon ${open ? "is-open" : ""}`} aria-hidden="true">
      <span className="ei-bar h" />
      <span className="ei-bar v" />
    </span>
  );
}

function ProjectDetails({ pr }) {
  const d = pr.details;
  if (!d) return null;
  return (
    <div className="pd-grid">
      <div className="pd-meta">
        <div className="pd-meta-row"><span>Project</span><b>{pr.name}</b></div>
        <div className="pd-meta-row"><span>Role</span><b>{pr.role}</b></div>
        <div className="pd-meta-row"><span>Timeline</span><b>{d.timeline}</b></div>
        <div className="pd-meta-row"><span>Status</span><b>{d.status}</b></div>
        {d.links && (
          <div className="pd-links">
            {d.links.map((l) => (
              <a key={l.label} href={l.url} className="pd-link" target="_blank" rel="noopener noreferrer">
                <span>{l.label}</span>
                <span className="pd-link-arrow">↗</span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="pd-body">
        <div className="kicker">— Overview</div>
        <p className="pd-overview">{d.overview}</p>

        {d.sections && d.sections.map((s) => (
          <div className="pd-section" key={s.label}>
            <div className="pd-section-label">{s.label}</div>
            <p>{s.body}</p>
          </div>
        ))}

        <div className="pd-tools">
          <div className="pd-section-label">Tools</div>
          <ul>
            {d.tools.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      </div>

      {d.gallery && d.gallery.length > 0 && (
        <div className="pd-gallery">
          {d.gallery.map((g, i) => (
            <figure key={i} className="pd-shot" style={{ background: g.color }}>
              <div className="thumb-stripes" />
              <figcaption>{g.label}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

function Contact({ accent }) {
  return (
    <section className="contact" id="contact">
      <Reveal>
        <div className="kicker">— Contact</div>
        <h2 className="contact-h">
          Got a thing<br />that needs <em>moving?</em>
        </h2>
        <a className="contact-mail" href="mailto:dzjwarior1@gmail.com" data-magnet="1">
          <Magnet strength={14}>dzjwarior1@gmail.com</Magnet>
          <span className="contact-arrow" style={{ background: accent }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 14 14 4M7 4h7v7" stroke="#0a0a0b" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </span>
        </a>
        <ul className="contact-links">
          <li><a href="https://www.linkedin.com/in/zsiegel2/" target="_blank" rel="noopener noreferrer" data-magnet="1">LinkedIn</a></li>
          <li><a href="https://twitter.com/hypercolossus" target="_blank" rel="noopener noreferrer" data-magnet="1">Twitter</a></li>
          <li><a href="https://www.youtube.com/@HyperColossus" target="_blank" rel="noopener noreferrer" data-magnet="1">YouTube</a></li>
          <li><a href="#" data-magnet="1">GitHub</a></li>
        </ul>
      </Reveal>
      <footer className="footer">
        <div className="footer-l">© 2026 Zachary Siegel</div>
        <div className="footer-c">HyperColossus</div>
        <a href="#top" className="footer-r">↑ Back to top</a>
      </footer>
    </section>
  );
}

// ---------- TWEAKS ----------
function PortfolioTweaks({ tweaks, setTweak }) {
  const { TweaksPanel, TweakSection, TweakColor, TweakSelect, TweakToggle } = window;
  if (!TweaksPanel) return null;
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Theme">
        <TweakColor
          label="Accent"
          value={tweaks.accent}
          options={["#ff6a1a", "#f97316", "#e84a1a", "#9eff00", "#3b82f6"]}
          onChange={(v) => setTweak("accent", v)}
        />
        <TweakSelect
          label="Display font"
          value={tweaks.displayFont}
          onChange={(v) => setTweak("displayFont", v)}
          options={[
            { value: "Instrument Serif", label: "Instrument Serif" },
            { value: "Fraunces", label: "Fraunces" },
            { value: "PP Editorial New", label: "Editorial-style serif" },
            { value: "Geist", label: "Geist (sans)" },
            { value: "Space Grotesk", label: "Space Grotesk" },
          ]}
        />
      </TweakSection>
      <TweakSection title="Motion">
        <TweakToggle label="Cursor trail" value={tweaks.cursorTrail} onChange={(v) => setTweak("cursorTrail", v)} />
        <TweakToggle label="Film grain" value={tweaks.grain} onChange={(v) => setTweak("grain", v)} />
        <TweakToggle label="Carousel auto-play" value={tweaks.carouselAuto} onChange={(v) => setTweak("carouselAuto", v)} />
      </TweakSection>
      <TweakSection title="Layout">
        <TweakSelect
          label="Project card"
          value={tweaks.projectCardStyle}
          onChange={(v) => setTweak("projectCardStyle", v)}
          options={[
            { value: "split", label: "Split (rich)" },
            { value: "minimal", label: "Minimal (list)" },
          ]}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

// ---------- APP ----------
function App() {
  const useTweaks = window.useTweaks;
  const [tweaks, setTweak] = useTweaks ? useTweaks(TWEAK_DEFAULTS) : [TWEAK_DEFAULTS, () => {}];

  return (
    <div className="page" style={{ "--accent": tweaks.accent, "--display": `'${tweaks.displayFont}', serif` }}>
      <Cursor enabled={tweaks.cursorTrail} />
      {tweaks.grain && <div className="grain" />}
      <TopNav />
      <Hero accent={tweaks.accent} displayFont={tweaks.displayFont} variant={tweaks.heroVariant} />
      <About />
      <Skills />
      <WorkCarousel auto={tweaks.carouselAuto} />
      <Projects style={tweaks.projectCardStyle} />
      <Contact accent={tweaks.accent} />
      <PortfolioTweaks tweaks={tweaks} setTweak={setTweak} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
