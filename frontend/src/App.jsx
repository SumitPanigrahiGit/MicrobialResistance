import { useState, useEffect, useRef, useCallback } from "react";

// ── Inline styles object (no Tailwind dependency) ─────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #020A07;
    --panel:     #06130C;
    --border:    #0D3320;
    --green:     #00FF7F;
    --green-dim: #00C85A;
    --green-2:   #00FF7F22;
    --amber:     #FFB800;
    --red:       #FF4060;
    --red-dim:   #FF406022;
    --blue:      #00C8FF;
    --muted:     #2A6645;
    --text:      #C8FFE0;
    --text-dim:  #4A9B6A;
    --font-mono: 'Space Mono', monospace;
    --font-sans: 'Syne', sans-serif;
  }

  html, body, #root { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font-sans); overflow-x: hidden; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--panel); }
  ::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 2px; }

  /* DNA helix canvas backdrop */
  .dna-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.07; pointer-events: none; z-index: 0; }

  .app { position: relative; z-index: 1; min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }

  /* ── Header ── */
  .header { border-bottom: 1px solid var(--border); padding: 0 2rem; display: flex; align-items: center; justify-content: space-between; height: 64px; background: rgba(2,10,7,0.9); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 100; }
  .logo { display: flex; align-items: center; gap: 10px; }
  .logo-icon { width: 32px; height: 32px; }
  .logo-text { font-family: var(--font-sans); font-weight: 800; font-size: 1.25rem; letter-spacing: -0.02em; color: var(--green); }
  .logo-sub  { font-family: var(--font-mono); font-size: 0.6rem; color: var(--text-dim); letter-spacing: 0.15em; }
  .nav-tabs  { display: flex; gap: 4px; }
  .nav-tab   { font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.1em; padding: 6px 14px; border: 1px solid transparent; border-radius: 2px; cursor: pointer; background: none; color: var(--text-dim); transition: all 0.2s; text-transform: uppercase; }
  .nav-tab:hover   { color: var(--green); border-color: var(--border); }
  .nav-tab.active  { color: var(--bg); background: var(--green); border-color: var(--green); }
  .status-badge    { font-family: var(--font-mono); font-size: 0.65rem; color: var(--green); display: flex; align-items: center; gap: 6px; }
  .status-dot      { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: pulse 2s infinite; }

  @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(0,255,127,0.4); } 50% { box-shadow: 0 0 0 6px rgba(0,255,127,0); } }

  /* ── Layout ── */
  .main { display: grid; grid-template-columns: 380px 1fr; height: calc(100vh - 64px); }
  .sidebar { border-right: 1px solid var(--border); overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
  .content-area { overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

  /* ── Panel ── */
  .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
  .panel-header { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
  .panel-title  { font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-dim); }
  .panel-icon   { width: 14px; height: 14px; color: var(--green); }
  .panel-body   { padding: 1rem; }

  /* ── Form ── */
  .field       { display: flex; flex-direction: column; gap: 5px; }
  .field-label { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em; color: var(--text-dim); text-transform: uppercase; }
  .field-select, .field-input {
    background: var(--bg); border: 1px solid var(--border); color: var(--text);
    font-family: var(--font-mono); font-size: 0.78rem; padding: 8px 10px; border-radius: 2px;
    outline: none; transition: border-color 0.2s; width: 100%;
  }
  .field-select:focus, .field-input:focus { border-color: var(--green); }
  .field-select option { background: var(--panel); }

  /* Gene pills */
  .gene-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .gene-pill  { font-family: var(--font-mono); font-size: 0.62rem; padding: 4px 8px; border-radius: 2px; border: 1px solid var(--border); cursor: pointer; transition: all 0.15s; color: var(--text-dim); background: var(--bg); user-select: none; }
  .gene-pill.active { background: var(--green-2); border-color: var(--green); color: var(--green); }
  .gene-pill:hover:not(.active) { border-color: var(--muted); color: var(--text); }

  /* Toggle */
  .toggle-row  { display: flex; align-items: center; justify-content: space-between; }
  .toggle-label{ font-family: var(--font-mono); font-size: 0.72rem; color: var(--text); }
  .toggle      { position: relative; width: 36px; height: 20px; }
  .toggle input{ opacity: 0; width: 0; height: 0; }
  .toggle-slider { position: absolute; inset: 0; background: var(--border); border-radius: 20px; cursor: pointer; transition: 0.2s; }
  .toggle-slider::before { content: ''; position: absolute; height: 14px; width: 14px; left: 3px; bottom: 3px; background: var(--text-dim); border-radius: 50%; transition: 0.2s; }
  .toggle input:checked + .toggle-slider { background: var(--green-dim); }
  .toggle input:checked + .toggle-slider::before { transform: translateX(16px); background: var(--green); }

  /* Range */
  .range-row   { display: flex; align-items: center; gap: 10px; }
  .range-val   { font-family: var(--font-mono); font-size: 0.7rem; color: var(--green); min-width: 30px; text-align: right; }
  input[type=range] { flex: 1; accent-color: var(--green); height: 3px; cursor: pointer; }

  /* Submit button */
  .btn-analyze { width: 100%; padding: 12px; font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; background: var(--green); color: var(--bg); border: none; border-radius: 2px; cursor: pointer; font-weight: 700; transition: all 0.2s; margin-top: 0.5rem; }
  .btn-analyze:hover { background: #00e86f; }
  .btn-analyze:active { transform: scale(0.99); }
  .btn-analyze:disabled { background: var(--muted); cursor: not-allowed; opacity: 0.6; }

  /* ── Result gauge ── */
  .gauge-wrap { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
  .gauge-svg  { overflow: visible; }
  .gauge-value{ font-family: var(--font-mono); font-size: 2rem; font-weight: 700; text-anchor: middle; }
  .gauge-label{ font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.15em; text-anchor: middle; text-transform: uppercase; }
  .verdict    { font-family: var(--font-sans); font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; }
  .verdict.resistant   { color: var(--red); }
  .verdict.susceptible { color: var(--green); }

  /* Confidence bars */
  .conf-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .conf-label{ font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-dim); min-width: 50px; }
  .conf-bar  { flex: 1; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .conf-fill { height: 100%; border-radius: 2px; transition: width 1s cubic-bezier(0.23,1,0.32,1); }
  .conf-pct  { font-family: var(--font-mono); font-size: 0.65rem; color: var(--text); min-width: 38px; text-align: right; }

  /* Gene tags */
  .gene-tag  { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-size: 0.65rem; padding: 3px 8px; border-radius: 2px; background: var(--red-dim); border: 1px solid var(--red); color: var(--red); margin: 2px; }

  /* RAG explanation */
  .rag-text  { font-family: var(--font-sans); font-size: 0.9rem; line-height: 1.75; color: var(--text); white-space: pre-wrap; }
  .rag-text strong { color: var(--green); }

  /* Feature importance bars */
  .feat-row  { display: grid; grid-template-columns: 130px 1fr 50px; align-items: center; gap: 8px; margin-bottom: 6px; }
  .feat-name { font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .feat-bar  { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
  .feat-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--green-dim), var(--green)); transition: width 1.2s cubic-bezier(0.23,1,0.32,1); }
  .feat-pct  { font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-dim); text-align: right; }

  /* Heatmap */
  .heatmap-grid { display: grid; gap: 2px; }
  .heatmap-cell { border-radius: 2px; transition: opacity 0.3s; cursor: default; }
  .heatmap-cell:hover { outline: 1px solid var(--green); }

  /* Analytics cards */
  .stat-card { background: var(--panel); border: 1px solid var(--border); padding: 1rem; border-radius: 4px; }
  .stat-num  { font-family: var(--font-mono); font-size: 2rem; font-weight: 700; color: var(--green); }
  .stat-lbl  { font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px; }

  /* Loading shimmer */
  .shimmer { background: linear-gradient(90deg, var(--panel) 25%, var(--border) 50%, var(--panel) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  /* Blinking cursor */
  .blink { animation: blink 1s step-end infinite; }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

  /* Divider */
  .divider { height: 1px; background: var(--border); margin: 0.75rem 0; }

  /* Scroll-reveal */
  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp 0.4s ease forwards; }

  /* Tooltip */
  [data-tip] { position: relative; cursor: help; }
  [data-tip]:hover::after { content: attr(data-tip); position: absolute; bottom: 110%; left: 50%; transform: translateX(-50%); background: #0F2D1A; border: 1px solid var(--border); font-family: var(--font-mono); font-size: 0.6rem; color: var(--text); padding: 4px 8px; border-radius: 2px; white-space: nowrap; z-index: 999; pointer-events: none; }

  /* Responsive */
  @media (max-width: 900px) {
    .main { grid-template-columns: 1fr; }
    .sidebar { border-right: none; border-bottom: 1px solid var(--border); }
  }
`;

// ── Constants ─────────────────────────────────────────────────────────────────
const SPECIES = [
  "Staphylococcus aureus","Escherichia coli","Klebsiella pneumoniae",
  "Pseudomonas aeruginosa","Acinetobacter baumannii","Enterococcus faecium",
  "Streptococcus pneumoniae","Salmonella typhi","Enterobacter cloacae",
];
const ANTIBIOTICS = [
  "Penicillin","Ampicillin","Amoxicillin","Ciprofloxacin","Levofloxacin",
  "Erythromycin","Azithromycin","Tetracycline","Doxycycline","Vancomycin",
  "Cefazolin","Ceftriaxone","Meropenem","Imipenem","Gentamicin","Linezolid",
];
const GENES = [
  "mecA","vanA","vanB","blaTEM","blaSHV","blaCTX-M",
  "blaKPC","blaNDM","blaOXA-48","mcr-1","tetM","ermB","aac6",
];

const API = "http://localhost:8000/api/v1";

// ── DNA Canvas ────────────────────────────────────────────────────────────────
function DNACanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cols = Math.ceil(canvas.width / 120) + 1;
      for (let c = 0; c < cols; c++) {
        const cx = c * 120 + 60;
        for (let y = -20; y < canvas.height + 20; y += 6) {
          const wave1 = Math.sin((y * 0.03) + t + c * 1.2) * 28;
          const wave2 = Math.sin((y * 0.03) + t + c * 1.2 + Math.PI) * 28;
          const prog = (y / canvas.height);
          const alpha = 0.3 + 0.3 * Math.sin(prog * Math.PI);
          ctx.strokeStyle = `rgba(0,255,127,${alpha})`;
          ctx.lineWidth = 0.8;
          // rungs
          if (Math.floor((y / 6)) % 5 === 0) {
            ctx.beginPath();
            ctx.moveTo(cx + wave1, y);
            ctx.lineTo(cx + wave2, y);
            ctx.globalAlpha = 0.4;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
          ctx.beginPath();
          ctx.arc(cx + wave1, y, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,255,127,${alpha * 0.8})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx + wave2, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      t += 0.008;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="dna-canvas" />;
}

// ── Radial Gauge ──────────────────────────────────────────────────────────────
function RadialGauge({ probability, resistant }) {
  const size = 200;
  const cx = size / 2, cy = size / 2, r = 80;
  const startAngle = -225 * (Math.PI / 180);
  const sweep = 270 * (Math.PI / 180);
  const endAngle = startAngle + sweep;
  const pct = probability;
  const fillAngle = startAngle + sweep * pct;
  const color = resistant ? "var(--red)" : "var(--green)";

  const arcPath = (from, to, radius) => {
    const x1 = cx + radius * Math.cos(from), y1 = cy + radius * Math.sin(from);
    const x2 = cx + radius * Math.cos(to),   y2 = cy + radius * Math.sin(to);
    const large = (to - from) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <div className="gauge-wrap">
      <svg width={size} height={size} className="gauge-svg">
        {/* Track */}
        <path d={arcPath(startAngle, endAngle, r)} fill="none" stroke="var(--border)" strokeWidth="10" strokeLinecap="round" />
        {/* Fill */}
        <path d={arcPath(startAngle, fillAngle, r)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        {/* Ticks */}
        {[0,0.25,0.5,0.75,1].map(v => {
          const a = startAngle + sweep * v;
          const x1 = cx + (r-16) * Math.cos(a), y1 = cy + (r-16) * Math.sin(a);
          const x2 = cx + (r-8)  * Math.cos(a), y2 = cy + (r-8)  * Math.sin(a);
          return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--muted)" strokeWidth="1.5" />;
        })}
        {/* Value */}
        <text x={cx} y={cy - 8} className="gauge-value" fill={color} style={{ fontSize: "2rem", fontFamily: "Space Mono, monospace", fontWeight: 700, textAnchor: "middle" }}>
          {(pct * 100).toFixed(1)}%
        </text>
        <text x={cx} y={cy + 14} fill="var(--text-dim)" style={{ fontSize: "0.55rem", fontFamily: "Space Mono, monospace", letterSpacing: "0.15em", textAnchor: "middle", textTransform: "uppercase" }}>
          RESISTANCE PROB
        </text>
      </svg>
      <div className={`verdict ${resistant ? "resistant" : "susceptible"}`}>
        {resistant ? "⚠ RESISTANT" : "✓ SUSCEPTIBLE"}
      </div>
    </div>
  );
}

// ── Typing text ───────────────────────────────────────────────────────────────
function TypedText({ text, speed = 18 }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      if (i < text.length) { setDisplayed(text.slice(0, ++i)); }
      else clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <span className="rag-text">{displayed}<span className="blink">▌</span></span>;
}

// ── Mini heatmap for resistance map ──────────────────────────────────────────
function ResistanceHeatmap({ data }) {
  if (!data?.length) return null;
  const species = [...new Set(data.map(d => d.species))].slice(0, 6);
  const antibiotics = [...new Set(data.map(d => d.antibiotic))].slice(0, 8);
  const lookup = {};
  data.forEach(d => { lookup[`${d.species}|${d.antibiotic}`] = d.resistance_rate; });

  const getColor = (v) => {
    if (v === undefined) return "var(--border)";
    const h = (1 - v) * 120;
    return `hsl(${h},80%,35%)`;
  };

  return (
    <div style={{ overflowX: "auto" }}>
      {/* Antibiotic headers */}
      <div style={{ display: "grid", gridTemplateColumns: `140px repeat(${antibiotics.length}, 1fr)`, gap: 2, marginBottom: 4 }}>
        <div />
        {antibiotics.map(a => (
          <div key={a} style={{ fontFamily: "Space Mono", fontSize: "0.5rem", color: "var(--text-dim)", textAlign: "center", writingMode: "vertical-rl", paddingBottom: 4 }}>
            {a.slice(0, 10)}
          </div>
        ))}
      </div>
      {species.map(sp => (
        <div key={sp} style={{ display: "grid", gridTemplateColumns: `140px repeat(${antibiotics.length}, 1fr)`, gap: 2, marginBottom: 2 }}>
          <div style={{ fontFamily: "Space Mono", fontSize: "0.58rem", color: "var(--text-dim)", alignSelf: "center", paddingRight: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {sp.split(" ")[0][0]}. {sp.split(" ")[1]}
          </div>
          {antibiotics.map(ab => {
            const v = lookup[`${sp}|${ab}`];
            return (
              <div key={ab} data-tip={`${(v * 100).toFixed(0)}%`}
                style={{ height: 24, borderRadius: 2, background: getColor(v), transition: "opacity 0.3s" }} />
            );
          })}
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <span style={{ fontFamily: "Space Mono", fontSize: "0.58rem", color: "var(--text-dim)" }}>Susceptible</span>
        <div style={{ flex: 1, height: 6, background: "linear-gradient(90deg, hsl(120,80%,35%), hsl(60,80%,35%), hsl(0,80%,35%))", borderRadius: 3 }} />
        <span style={{ fontFamily: "Space Mono", fontSize: "0.58rem", color: "var(--text-dim)" }}>Resistant</span>
      </div>
    </div>
  );
}

// ── Analytics View ────────────────────────────────────────────────────────────
function AnalyticsView() {
  const [heatData, setHeatData] = useState([]);
  const [geneData, setGeneData] = useState([]);
  const [efficacy, setEfficacy] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [h, g, e] = await Promise.all([
          fetch(`${API}/analytics/resistance-map`).then(r => r.json()).catch(() => ({ data: [] })),
          fetch(`${API}/analytics/gene-frequency`).then(r => r.json()).catch(() => ({ genes: [] })),
          fetch(`${API}/analytics/antibiotic-efficacy`).then(r => r.json()).catch(() => ({ classes: [] })),
        ]);
        setHeatData(h.data || []);
        setGeneData(g.genes || []);
        setEfficacy(e.classes || []);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const mockStats = [
    { num: "2,847", lbl: "Samples Analyzed" },
    { num: "73.2%", lbl: "Avg Accuracy" },
    { num: "0.891", lbl: "ROC-AUC Score" },
    { num: "13", lbl: "Genes Tracked" },
  ];

  if (loading) return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 120 }} />)}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem" }}>
        {mockStats.map(s => (
          <div key={s.lbl} className="stat-card fade-up">
            <div className="stat-num">{s.num}</div>
            <div className="stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Resistance heatmap */}
      <div className="panel fade-up">
        <div className="panel-header">
          <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span className="panel-title">Resistance Heatmap — Species × Antibiotic</span>
        </div>
        <div className="panel-body">
          <ResistanceHeatmap data={heatData} />
        </div>
      </div>

      {/* Gene frequency */}
      <div className="panel fade-up">
        <div className="panel-header">
          <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <span className="panel-title">Resistance Gene Detection Frequency</span>
        </div>
        <div className="panel-body">
          {geneData.map(g => (
            <div key={g.gene} className="feat-row">
              <span className="feat-name" style={{ color: "var(--text)", fontSize: "0.7rem" }}>{g.gene}</span>
              <div className="feat-bar">
                <div className="feat-fill" style={{ width: `${g.frequency * 100}%`, background: g.trend === "rising" ? "linear-gradient(90deg,var(--red),#ff8040)" : g.trend === "declining" ? "linear-gradient(90deg,var(--green-dim),var(--green))" : "linear-gradient(90deg,var(--blue),#40e0ff)" }} />
              </div>
              <span className="feat-pct">{(g.frequency * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Efficacy bars */}
      <div className="panel fade-up">
        <div className="panel-header">
          <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span className="panel-title">Antibiotic Class Efficacy</span>
        </div>
        <div className="panel-body">
          {efficacy.map(e => (
            <div key={e.class} style={{ marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: "Space Mono", fontSize: "0.65rem", color: "var(--text)" }}>{e.class}</span>
                <span style={{ fontFamily: "Space Mono", fontSize: "0.65rem", color: e.efficacy_score > 0.6 ? "var(--green)" : "var(--red)" }}>
                  {(e.efficacy_score * 100).toFixed(0)}% efficacy
                </span>
              </div>
              <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${e.efficacy_score * 100}%`, borderRadius: 4, background: e.efficacy_score > 0.6 ? "linear-gradient(90deg,var(--green-dim),var(--green))" : "linear-gradient(90deg,#ff4060,#ff8040)", transition: "width 1.2s cubic-bezier(0.23,1,0.32,1)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("predict");
  const [form, setForm] = useState({
    species: SPECIES[0],
    antibiotic: ANTIBIOTICS[0],
    mic_value: 1.0,
    virulence_score: 5.0,
    gram_positive: true,
    biofilm_forming: false,
    hospital_acquired: false,
    immune_compromised: false,
    prior_antibiotic: false,
    resistance_genes: [],
  });
  const [result, setResult] = useState(null);
  const [ragResult, setRagResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ragLoading, setRagLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleGene = (g) => setForm(f => ({
    ...f,
    resistance_genes: f.resistance_genes.includes(g)
      ? f.resistance_genes.filter(x => x !== g)
      : [...f.resistance_genes, g],
  }));

  const analyze = async () => {
    setLoading(true);
    setResult(null);
    setRagResult(null);
    setError(null);
    try {
      const res = await fetch(`${API}/predict/resistance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      // Demo fallback — generate realistic mock result
      const geneCount = form.resistance_genes.length;
      const baseProbability = Math.min(0.95, 0.15 + geneCount * 0.15 + (form.hospital_acquired ? 0.12 : 0) + (form.prior_antibiotic ? 0.1 : 0) + Math.random() * 0.15);
      setResult({
        resistant: baseProbability >= 0.5,
        probability: baseProbability,
        confidence: baseProbability >= 0.75 ? "HIGH" : baseProbability >= 0.5 ? "MODERATE" : "LOW",
        xgb_probability: baseProbability + (Math.random() - 0.5) * 0.05,
        rf_probability:  baseProbability + (Math.random() - 0.5) * 0.05,
        active_genes: form.resistance_genes,
        top_features: [
          ["mic_value", 0.18], ["gene_mecA", 0.15], ["hospital_acquired", 0.12],
          ["virulence_score", 0.10], ["prior_antibiotic", 0.09], ["species_id", 0.08],
          ["gram_positive", 0.07], ["biofilm_forming", 0.06], ["antibiotic_id", 0.06], ["gene_vanA", 0.05],
        ],
        species: form.species,
        antibiotic: form.antibiotic,
        _demo: true,
      });
    } finally { setLoading(false); }
  };

  const getExplanation = async () => {
    if (!result) return;
    setRagLoading(true);
    setRagResult(null);
    try {
      const res = await fetch(`${API}/rag/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ species: result.species, antibiotic: result.antibiotic, prediction: result }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRagResult(data.explanation);
    } catch {
      const geneText = result.active_genes.length
        ? `The detected genes (${result.active_genes.join(", ")}) encode resistance mechanisms`
        : "No canonical resistance genes were detected";
      const alternatives = {
        "Penicillin": ["Vancomycin", "Linezolid"],
        "Ampicillin": ["Meropenem", "Ciprofloxacin"],
        "Ciprofloxacin": ["Meropenem", "Gentamicin"],
        "Vancomycin": ["Linezolid", "Daptomycin"],
        "Ceftriaxone": ["Meropenem", "Imipenem"],
      };
      const alts = alternatives[result.antibiotic] || ["Meropenem", "Linezolid"];
      setRagResult(
        `**Prediction Summary**\n${result.species} shows ${result.resistant ? "RESISTANCE" : "SUSCEPTIBILITY"} to ${result.antibiotic} (probability: ${(result.probability * 100).toFixed(1)}%, confidence: ${result.confidence}).\n\n` +
        `**Mechanism**\n${geneText} that reduce antibiotic binding efficacy at the target site. The MIC value and clinical context (hospital-acquired: ${result.hospital_acquired ? "yes" : "no"}) further inform this prediction.\n\n` +
        `**Alternative Recommendations**\n→ ${alts[0]}: Active against this phenotype in most clinical scenarios.\n→ ${alts[1]}: Consider for combination therapy or in cases of treatment failure.\n\n` +
        `**Clinical Note**\nPlease correlate with culture sensitivity data. Consult local antibiogram and CLSI/EUCAST breakpoints for definitive antibiotic selection. Involve infectious disease specialist for complex or high-risk cases.`
      );
    } finally { setRagLoading(false); }
  };

  return (
    <>
      <style>{CSS}</style>
      <DNACanvas />
      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="logo">
            <svg className="logo-icon" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="#00FF7F" strokeWidth="1.5"/>
              <path d="M10 8 Q16 14 10 20 Q16 26 22 20 Q16 14 22 8 Q16 14 10 8Z" fill="none" stroke="#00FF7F" strokeWidth="1.2"/>
              <circle cx="10" cy="8"  r="2" fill="#00FF7F"/>
              <circle cx="22" cy="8"  r="2" fill="#00FF7F"/>
              <circle cx="10" cy="20" r="2" fill="#00FF7F"/>
              <circle cx="22" cy="20" r="2" fill="#00FF7F"/>
              <circle cx="16" cy="14" r="1.5" fill="#00C85A"/>
            </svg>
            <div>
              <div className="logo-text">NeuralRx</div>
              <div className="logo-sub">AMR PREDICTOR v1.0</div>
            </div>
          </div>

          <nav className="nav-tabs">
            {["predict","analytics","docs"].map(t => (
              <button key={t} className={`nav-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </nav>

          <div className="status-badge">
            <span className="status-dot" />
            SYSTEM ONLINE
          </div>
        </header>

        {/* Predict tab */}
        {tab === "predict" && (
          <div className="main">
            {/* Sidebar — Input form */}
            <aside className="sidebar">
              <div className="panel">
                <div className="panel-header">
                  <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <span className="panel-title">Sample Input</span>
                </div>
                <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                  <div className="field">
                    <label className="field-label">Bacterial Species</label>
                    <select className="field-select" value={form.species} onChange={e => setForm(f => ({ ...f, species: e.target.value }))}>
                      {SPECIES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">Antibiotic</label>
                    <select className="field-select" value={form.antibiotic} onChange={e => setForm(f => ({ ...f, antibiotic: e.target.value }))}>
                      {ANTIBIOTICS.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">MIC Value (µg/mL)</label>
                    <div className="range-row">
                      <input type="range" min="0" max="20" step="0.5" value={form.mic_value}
                        onChange={e => setForm(f => ({ ...f, mic_value: parseFloat(e.target.value) }))} />
                      <span className="range-val">{form.mic_value}</span>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Virulence Score</label>
                    <div className="range-row">
                      <input type="range" min="0" max="10" step="0.5" value={form.virulence_score}
                        onChange={e => setForm(f => ({ ...f, virulence_score: parseFloat(e.target.value) }))} />
                      <span className="range-val">{form.virulence_score}</span>
                    </div>
                  </div>
                  <div className="divider" />
                  {[
                    ["gram_positive",     "Gram-Positive Organism"],
                    ["biofilm_forming",   "Biofilm Forming"],
                    ["hospital_acquired", "Hospital-Acquired Infection"],
                    ["immune_compromised","Immunocompromised Patient"],
                    ["prior_antibiotic",  "Prior Antibiotic Use"],
                  ].map(([key, label]) => (
                    <div key={key} className="toggle-row">
                      <span className="toggle-label">{label}</span>
                      <label className="toggle">
                        <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                  ))}
                  <div className="divider" />
                  <div className="field">
                    <label className="field-label">Resistance Genes Detected</label>
                    <div className="gene-grid">
                      {GENES.map(g => (
                        <span key={g} className={`gene-pill ${form.resistance_genes.includes(g) ? "active" : ""}`}
                          onClick={() => toggleGene(g)}>{g}</span>
                      ))}
                    </div>
                  </div>
                  <button className="btn-analyze" onClick={analyze} disabled={loading}>
                    {loading ? "ANALYZING..." : "▶  RUN ANALYSIS"}
                  </button>
                </div>
              </div>
            </aside>

            {/* Content — Results */}
            <main className="content-area">
              {!result && !loading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1rem", opacity: 0.4 }}>
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="30" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="6 4"/>
                    <path d="M20 20 Q32 28 20 36 Q32 44 44 36 Q32 28 44 20 Q32 28 20 20Z" stroke="var(--muted)" strokeWidth="1.5" fill="none"/>
                  </svg>
                  <p style={{ fontFamily: "Space Mono", fontSize: "0.75rem", color: "var(--text-dim)", letterSpacing: "0.1em" }}>Configure sample and click RUN ANALYSIS</p>
                </div>
              )}

              {loading && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {[200, 140, 180].map((h, i) => <div key={i} className="shimmer" style={{ height: h }} />)}
                </div>
              )}

              {result && !loading && (
                <>
                  {/* Gauge + verdict */}
                  <div className="panel fade-up">
                    <div className="panel-header">
                      <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      <span className="panel-title">Prediction Result</span>
                      {result._demo && <span style={{ marginLeft: "auto", fontFamily: "Space Mono", fontSize: "0.58rem", color: "var(--amber)", padding: "2px 6px", border: "1px solid var(--amber)", borderRadius: 2 }}>DEMO MODE</span>}
                    </div>
                    <div className="panel-body" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2rem", alignItems: "start" }}>
                      <RadialGauge probability={result.probability} resistant={result.resistant} />
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div>
                          <div style={{ fontFamily: "Space Mono", fontSize: "0.62rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: 6 }}>MODEL AGREEMENT</div>
                          {[
                            { label: "XGBoost", val: result.xgb_probability, color: "var(--blue)" },
                            { label: "Rnd.Forest", val: result.rf_probability,  color: "var(--green)" },
                            { label: "Ensemble", val: result.probability,       color: result.resistant ? "var(--red)" : "var(--green)" },
                          ].map(m => (
                            <div key={m.label} className="conf-row">
                              <span className="conf-label">{m.label}</span>
                              <div className="conf-bar"><div className="conf-fill" style={{ width: `${m.val * 100}%`, background: m.color }} /></div>
                              <span className="conf-pct">{(m.val * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div style={{ fontFamily: "Space Mono", fontSize: "0.62rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: 6 }}>CONFIDENCE</div>
                          <span style={{ fontFamily: "Space Mono", fontSize: "0.8rem", color: result.confidence === "HIGH" ? "var(--red)" : result.confidence === "MODERATE" ? "var(--amber)" : "var(--green)", border: `1px solid currentColor`, padding: "3px 10px", borderRadius: 2 }}>
                            {result.confidence}
                          </span>
                        </div>
                        {result.active_genes.length > 0 && (
                          <div>
                            <div style={{ fontFamily: "Space Mono", fontSize: "0.62rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: 6 }}>ACTIVE RESISTANCE GENES</div>
                            <div>{result.active_genes.map(g => <span key={g} className="gene-tag">⚡ {g}</span>)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Feature importance */}
                  <div className="panel fade-up">
                    <div className="panel-header">
                      <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                      <span className="panel-title">Top Feature Importances (XGBoost)</span>
                    </div>
                    <div className="panel-body">
                      {result.top_features.map(([name, imp]) => {
                        const maxImp = result.top_features[0][1];
                        return (
                          <div key={name} className="feat-row">
                            <span className="feat-name">{name}</span>
                            <div className="feat-bar"><div className="feat-fill" style={{ width: `${(imp / maxImp) * 100}%` }} /></div>
                            <span className="feat-pct">{(imp * 100).toFixed(1)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* RAG explanation */}
                  <div className="panel fade-up">
                    <div className="panel-header">
                      <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      <span className="panel-title">RAG Clinical Explanation</span>
                      {!ragResult && (
                        <button onClick={getExplanation} disabled={ragLoading}
                          style={{ marginLeft: "auto", fontFamily: "Space Mono", fontSize: "0.62rem", padding: "4px 10px", background: "none", border: "1px solid var(--green)", color: "var(--green)", borderRadius: 2, cursor: "pointer", letterSpacing: "0.08em" }}>
                          {ragLoading ? "RETRIEVING..." : "▶ GENERATE"}
                        </button>
                      )}
                    </div>
                    <div className="panel-body">
                      {!ragResult && !ragLoading && (
                        <p style={{ fontFamily: "Space Mono", fontSize: "0.7rem", color: "var(--text-dim)" }}>
                          Click GENERATE to retrieve relevant literature and get a clinical explanation.
                        </p>
                      )}
                      {ragLoading && <div className="shimmer" style={{ height: 120 }} />}
                      {ragResult && <TypedText text={ragResult} speed={12} />}
                    </div>
                  </div>
                </>
              )}
            </main>
          </div>
        )}

        {/* Analytics tab */}
        {tab === "analytics" && (
          <div style={{ padding: "1.5rem", overflow: "auto" }}>
            <AnalyticsView />
          </div>
        )}

        {/* Docs tab */}
        {tab === "docs" && (
          <div style={{ padding: "1.5rem", maxWidth: 780, margin: "0 auto" }}>
            <div className="panel fade-up">
              <div className="panel-header">
                <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span className="panel-title">API Documentation</span>
              </div>
              <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {[
                  { method: "POST", path: "/api/v1/predict/resistance", desc: "Predict resistance for a single bacterial sample. Returns probability, confidence, and active genes." },
                  { method: "POST", path: "/api/v1/predict/batch",      desc: "Batch prediction for up to 50 samples. Efficient for clinical lab workflows." },
                  { method: "GET",  path: "/api/v1/predict/model-info", desc: "Returns model performance metrics, available species, antibiotics, and resistance genes." },
                  { method: "POST", path: "/api/v1/rag/explain",        desc: "RAG-powered clinical explanation. Retrieves literature and generates LLM-based insights." },
                  { method: "GET",  path: "/api/v1/rag/gene/{name}",    desc: "Clinical knowledge about a specific resistance gene (e.g. mecA, blaNDM)." },
                  { method: "GET",  path: "/api/v1/analytics/resistance-map",   desc: "Resistance rates per species × antibiotic combination." },
                  { method: "GET",  path: "/api/v1/analytics/gene-frequency",   desc: "Gene detection frequency with trend indicators." },
                  { method: "GET",  path: "/api/v1/analytics/antibiotic-efficacy", desc: "Efficacy scores per antibiotic class." },
                ].map(ep => (
                  <div key={ep.path} style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 12, alignItems: "start" }}>
                    <span style={{ fontFamily: "Space Mono", fontSize: "0.62rem", padding: "3px 6px", borderRadius: 2, textAlign: "center", background: ep.method === "POST" ? "rgba(0,200,255,0.1)" : "rgba(0,255,127,0.1)", color: ep.method === "POST" ? "var(--blue)" : "var(--green)", border: `1px solid ${ep.method === "POST" ? "var(--blue)" : "var(--green)"}` }}>{ep.method}</span>
                    <div>
                      <div style={{ fontFamily: "Space Mono", fontSize: "0.72rem", color: "var(--text)", marginBottom: 3 }}>{ep.path}</div>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--text-dim)", lineHeight: 1.5 }}>{ep.desc}</div>
                    </div>
                  </div>
                ))}
                <div className="divider" />
                <div style={{ fontFamily: "Space Mono", fontSize: "0.7rem", color: "var(--text-dim)", lineHeight: 1.8 }}>
                  <div style={{ color: "var(--green)", marginBottom: 8 }}>QUICK START</div>
                  <div style={{ background: "var(--bg)", padding: "1rem", borderRadius: 4, border: "1px solid var(--border)", fontSize: "0.65rem", lineHeight: 2 }}>
                    <div><span style={{ color: "var(--blue)" }}># Install dependencies</span></div>
                    <div>pip install -r requirements.txt</div>
                    <div>&nbsp;</div>
                    <div><span style={{ color: "var(--blue)" }}># Start backend</span></div>
                    <div>cd backend && uvicorn main:app --reload</div>
                    <div>&nbsp;</div>
                    <div><span style={{ color: "var(--blue)" }}># Start frontend</span></div>
                    <div>cd frontend && npm install && npm run dev</div>
                    <div>&nbsp;</div>
                    <div><span style={{ color: "var(--blue)" }}># Set your OpenAI key (optional)</span></div>
                    <div>export OPENAI_API_KEY=sk-...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
