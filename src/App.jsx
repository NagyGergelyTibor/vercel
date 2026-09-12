import { useState, useEffect, useRef, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine, Cell
} from "recharts";

/* ─────────────── MOCK DATA ─────────────── */
const R = {
  temp: 22.4, feelsLike: 21.1, dewPoint: 15.8,
  humidity: 67, pressure: 1013.2,
  windSpeed: 14.3, windDir: 225,
  uvIndex: 4, lux: 0, visibility: 9.4, precipitation: 0,
  tempMin: 14.2, tempMax: 26.8,
};

const hourly = Array.from({ length: 24 }, (_, i) => ({
  t: `${String(i).padStart(2, '0')}:00`,
  temp: parseFloat((18 + Math.sin((i - 14) * Math.PI / 12) * 6 + (Math.random() - .5) * 1.2).toFixed(1)),
  hum: parseFloat((65 + Math.cos(i * Math.PI / 8) * 12 + (Math.random() - .5) * 4).toFixed(1)),
}));

const weekly = [
  { t: 'Hét', acc: 0 }, { t: 'Ked', acc: 2.4 }, { t: 'Sze', acc: 8.7 },
  { t: 'Csü', acc: 1.2 }, { t: 'Pén', acc: 0 }, { t: 'Szo', acc: 0.3 }, { t: 'Vas', acc: 5.1 }
];

/* ─────────────── TEMPERATURE PAGE MOCK DATA ─────────────── */
const _N1H = [0.3, -0.2, 0.4, -0.1, 0.5];
const _N1D = [0.3,-0.2,0.5,-0.1,0.4,-0.3,0.2,-0.4,0.3,-0.2,0.6,-0.1,0.4,-0.5,0.3,-0.2,0.5,-0.3,0.2,-0.4,0.3,-0.1,0.4,-0.2];
const _N1W = [0.5,-0.3,0.7,-0.2,0.4,-0.6,0.3,-0.5,0.6,-0.2,0.8,-0.4,0.3,-0.7,0.5,-0.1,0.6,-0.4,0.2,-0.8,0.5,-0.3,0.7,-0.2,0.4,-0.6,0.3,-0.5];
const _N1MO = [0.4,-0.3,0.6,0.1,-0.5,0.8,-0.2,0.4,-0.7,0.3,0.5,-0.4,0.7,-0.1,0.3,-0.6,0.4,0.2,-0.5,0.8,-0.3,0.6,-0.1,0.4,-0.7,0.3,0.5,-0.4,0.6,-0.2];

const tempData1h = (() => {
  const now = new Date();
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(now - (4 - i) * 15 * 60000);
    return {
      t: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
      temp: parseFloat((21.5 + i * 0.22 + _N1H[i]).toFixed(1)),
    };
  });
})();

const tempData1d = Array.from({ length: 24 }, (_, i) => ({
  t: `${String(i).padStart(2,'0')}:00`,
  temp: parseFloat((18 + Math.sin((i - 14) * Math.PI / 12) * 6 + _N1D[i]).toFixed(1)),
}));

const _DAY_LBL = ['H','K','Sze','Cs','P','Szo','V'];
const tempData1w = Array.from({ length: 28 }, (_, i) => ({
  t: `${_DAY_LBL[Math.floor(i / 4)]} ${String((i % 4) * 6).padStart(2,'0')}h`,
  temp: parseFloat((17 + Math.sin((i - 14) * Math.PI / 14) * 8 + Math.cos(i * Math.PI / 3) * 2 + _N1W[i]).toFixed(1)),
}));

const tempData1mo = Array.from({ length: 30 }, (_, i) => ({
  t: `${i + 1}.`,
  temp: parseFloat((15 + Math.sin(i * Math.PI / 15) * 9 + Math.cos(i * Math.PI / 7) * 3 + _N1MO[i]).toFixed(1)),
}));

const TEMP_DATASETS = { '1h': tempData1h, '1d': tempData1d, '1w': tempData1w, '1mo': tempData1mo };

const getWindLabel = (deg) => {
  const DIRS = ['É', 'É-ÉK', 'ÉK', 'K-ÉK', 'K', 'K-DK', 'DK', 'D-DK', 'D', 'D-DNY', 'DNY', 'NY-DNY', 'NY', 'NY-ÉNY', 'ÉNY', 'É-ÉNY'];
  return DIRS[Math.round((deg % 360 + 360) % 360 / 22.5) % 16];
};

/* ─────────────── NAVIGATION CONFIG ─────────────── */
export const NAV_PAGES = [
  { id: 'dashboard', icon: '⊞', label: 'Főoldal' },
  { id: 'temperature', icon: '🌡', label: 'Hőmérséklet' },
  { id: 'humidity', icon: '💧', label: 'Páratartalom' },
  { id: 'pressure', icon: '◎', label: 'Légnyomás' },
  { id: 'brightness', icon: '☀', label: 'UV és Fényerő' },
  { id: 'precipitation', icon: '🌧', label: 'Csapadék' },
  { id: 'wind', icon: '💨', label: 'Széladatok' },
];

/* ─────────────── THEME / PHASE SYSTEM ─────────────── */
const getPhase = h => {
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 19) return 'day';
  if (h >= 19 && h < 21) return 'sunset';
  if (h >= 21 && h < 22) return 'evening';
  return 'night';
};

const TH = {
  night: {
    id: 'night',
    skyGrad: 'linear-gradient(180deg,#020813 0%,#041629 60%,#020813 100%)',
    card: 'rgba(10,20,38,0.70)', border: 'rgba(255,255,255,0.04)',
    t1: '#F8FAFC', t2: '#94A3B8', t3: '#475569',
    p: '#38BDF8', a: '#34D399', w: '#FBBF24', v: '#A78BFA',
    lbl: '#64748B',
    cT: '#FBBF24', cH: '#38BDF8', cB: 'rgba(56,189,248,0.5)',
    hClock: '#38BDF8', hLive: '#34D399', hTitle: '#F8FAFC', hSub: '#64748B',
    clouds: null, star: true, sun: false, moon: true,
  },
  dawn: {
    id: 'dawn',
    skyGrad: 'linear-gradient(180deg,#1a0533 0%,#7B2060 30%,#D4500A 65%,#F5A623 100%)',
    card: 'rgba(20,8,35,0.72)', border: 'rgba(255,255,255,0.04)',
    t1: '#FFE8D0', t2: '#A78BFA', t3: '#5C3A75',
    p: '#FB923C', a: '#F87171', w: '#FBBF24', v: '#F472B6',
    lbl: '#A78BFA',
    cT: '#FBBF24', cH: '#FB923C', cB: 'rgba(251,146,60,0.5)',
    hClock: '#FBBF24', hLive: '#F87171', hTitle: '#FFE8D0', hSub: '#A78BFA',
    clouds: [
      { x: 80, y: 230, w: 220, h: 82, c: '#c85028', o: 0.5 },
      { x: 820, y: 250, w: 200, h: 76, c: '#b24422', o: 0.4 },
    ],
    star: false, sun: false, moon: false,
  },
  day: {
    id: 'day',
    skyGrad: 'linear-gradient(180deg,#2563EB 0%,#38BDF8 40%,#BAE6FD 75%,#F0F9FF 100%)',
    card: 'rgba(255,255,255,0.82)', border: 'rgba(255,255,255,0.5)',
    t1: '#0F172A', t2: '#475569', t3: '#94A3B8',
    p: '#0EA5E9', a: '#14B8A6', w: '#EA580C', v: '#7C3AED',
    lbl: '#64748B',
    cT: '#EA580C', cH: '#0EA5E9', cB: 'rgba(2,132,199,0.6)',
    hClock: '#FFFFFF', hLive: '#FFFFFF', hTitle: '#FFFFFF', hSub: 'rgba(255,255,255,0.85)',
    clouds: [
      { x: 60, y: 65, w: 200, h: 80, c: '#ffffff', o: 0.95 },
      { x: 360, y: 40, w: 240, h: 92, c: '#ffffff', o: 0.90 },
      { x: 730, y: 70, w: 185, h: 74, c: '#ffffff', o: 0.92 },
      { x: 1090, y: 48, w: 218, h: 86, c: '#ffffff', o: 0.90 },
    ],
        star: false, sun: true, moon: false,
      },
  sunset: {
    id: 'sunset',
    skyGrad: 'linear-gradient(180deg,#150228 0%,#7B1540 25%,#D44010 55%,#F5A200 80%,#FAC213 100%)',
    card: 'rgba(26,4,43,0.72)', border: 'rgba(255,255,255,0.04)',
    t1: '#FFF0DE', t2: '#FDBA74', t3: '#6B21A8',
    p: '#FF7043', a: '#FFCC02', w: '#FF8F00', v: '#CE93D8',
    lbl: '#FDBA74',
    cT: '#FFCC02', cH: '#FF7043', cB: 'rgba(255,112,67,0.5)',
    hClock: '#FFCC02', hLive: '#FF7043', hTitle: '#FFF0DE', hSub: '#FDBA74',
    clouds: [
      { x: 40, y: 185, w: 260, h: 96, c: '#bc340e', o: 0.6 },
      { x: 560, y: 165, w: 250, h: 90, c: '#aa2e0a', o: 0.5 },
      { x: 1070, y: 178, w: 285, h: 102, c: '#c63a10', o: 0.6 },
    ],
    star: false, sun: false, moon: false,
  },
  evening: {
    id: 'evening',
    skyGrad: 'linear-gradient(180deg,#09021A 0%,#13053A 50%,#201354 100%)',
    card: 'rgba(18,10,46,0.72)', border: 'rgba(255,255,255,0.04)',
    t1: '#F3E8FF', t2: '#C084FC', t3: '#4C1D95',
    p: '#A78BFA', a: '#F472B6', w: '#FBBF24', v: '#2DD4BF',
    lbl: '#C084FC',
    cT: '#FBBF24', cH: '#A78BFA', cB: 'rgba(167,139,248,0.5)',
    hClock: '#C084FC', hLive: '#2DD4BF', hTitle: '#F3E8FF', hSub: '#C084FC',
    clouds: [
      { x: 190, y: 110, w: 195, h: 78, c: '#2e1256', o: 0.6 },
      { x: 840, y: 128, w: 175, h: 70, c: '#280f4e', o: 0.5 },
    ],
    star: true, sun: false, moon: false,
  },
};

const RAIN_GRAD = {
  night: 'linear-gradient(180deg,#02060D 0%,#091322 60%,#02060D 100%)',
  dawn: 'linear-gradient(180deg,#0C0220 0%,#260A20 40%,#4C1305 75%,#543A0C 100%)',
  day: 'linear-gradient(180deg,#1E3A8A 0%,#2563EB 40%,#3B82F6 75%,#60A5FA 100%)',
  sunset: 'linear-gradient(180deg,#080114 0%,#2D051A 30%,#4C1405 65%,#543B03 100%)',
  evening: 'linear-gradient(180deg,#04000D 0%,#0A0124 50%,#11092C 100%)',
};
const STORM_CLOUDS = [
  { x: -80, y: 8, w: 370, h: 134, c: '#272E3F', o: 0.85 },
  { x: 340, y: 0, w: 345, h: 122, c: '#232938', o: 0.80 },
  { x: 768, y: 10, w: 390, h: 138, c: '#292F42', o: 0.88 },
  { x: 1200, y: 4, w: 310, h: 120, c: '#252A3A', o: 0.83 },
];

const STARS = Array.from({ length: 100 }, () => ({
  x: Math.random() * 1440, y: Math.random() * 580,
  r: Math.random() * 1.1 + 0.4, o: Math.random() * 0.6 + 0.2,
  td: parseFloat((Math.random() * 6).toFixed(1)),
}));

/* ═══════════════ SKY SUB-COMPONENTS ═══════════════ */
function CloudShape({ x, y, w, h, c, o }) {
  return (
    <g opacity={o} fill={c}>
      <ellipse cx={x + w * .18} cy={y + h * .62} rx={w * .22} ry={h * .46} />
      <ellipse cx={x + w * .42} cy={y + h * .36} rx={w * .28} ry={h * .54} />
      <ellipse cx={x + w * .68} cy={y + h * .50} rx={w * .24} ry={h * .46} />
      <ellipse cx={x + w * .88} cy={y + h * .62} rx={w * .16} ry={h * .38} />
      <rect x={x + w * .04} y={y + h * .60} width={w * .90} height={h * .44} rx={12} />
    </g>
  );
}
function SunSVG({ hour }) {
  const t = Math.max(0, Math.min(1, (hour - 6) / 12));
  // Középre húzott vízszintes út (1080), de az App_regi magas íve (270)
  const sx = 180 + t * 1080, sy = 350 - Math.sin(t * Math.PI) * 270;
  return (
    <g>
      <circle cx={sx} cy={sy} r={75} fill='#FFD700' opacity={.12} />
      <circle cx={sx} cy={sy} r={46} fill='#FFD700' opacity={.95} />
    </g>
  );
}
function MoonSVG({ hour }) {
  const h = hour < 6 ? hour + 24 : hour;
  const t = Math.max(0, Math.min(1, (h - 20) / 12));
  const mx = 70 + t * 1300, my = 330 - Math.sin(t * Math.PI) * 220, mr = 28;
  return (
    <g>
      <defs><clipPath id='mc'><circle cx={mx} cy={my} r={mr + 2} /></clipPath></defs>
      <circle cx={mx} cy={my} r={mr + 14} fill='#F5F0C8' opacity={.07} />
      <circle cx={mx} cy={my} r={mr} fill='#F5F0C8' opacity={.96} />
      <circle cx={mx + mr * .55} cy={my - mr * .18} r={mr * .88} fill='#020813' opacity={.97} clipPath='url(#mc)' />
    </g>
  );
}

/* ═══════════════ SKY BACKGROUND ═══════════════ */
function SkyBackground({ phase, hour, isRaining, isWindy }) {
  const canvasRef = useRef(null);
  const [lightning, setLightning] = useState(false);
  const th = TH[phase];
  const grad = isRaining ? RAIN_GRAD[phase] : th.skyGrad;
  const clouds = isRaining ? STORM_CLOUDS : (th.clouds || []);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    let raf;
    const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const N = isRaining ? 130 : 50;
    const drops = Array.from({ length: N }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      len: isRaining ? Math.random() * 18 + 8 : Math.random() * 12 + 4,
      spd: isRaining ? Math.random() * 3.5 + 2.5 : Math.random() * 1.2 + 0.6,
      opac: isRaining ? Math.random() * 0.30 + 0.12 : Math.random() * 0.08 + 0.02,
    }));
    const windLines = Array.from({ length: isWindy ? 20 : 0 }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight * .85,
      len: Math.random() * 220 + 100, spd: Math.random() * 25 + 15, opac: Math.random() * 0.18 + 0.06,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (isRaining) {
        drops.forEach(d => {
          ctx.beginPath(); ctx.strokeStyle = `rgba(175,210,240,${d.opac})`;
          ctx.lineWidth = 1.3; ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * 0.28, d.y + d.len);
          ctx.stroke(); d.y += d.spd; d.x -= d.spd * 0.28;
          if (d.y > cv.height + 20) { d.y = -20; d.x = Math.random() * cv.width; }
        });
      } else {
        drops.forEach(d => {
          ctx.beginPath(); ctx.strokeStyle = `rgba(0,212,255,${d.opac})`;
          ctx.lineWidth = 0.7; ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * 0.18, d.y + d.len);
          ctx.stroke(); d.y += d.spd * 0.5; d.x -= d.spd * 0.1;
          if (d.y > cv.height + 20) { d.y = -20; d.x = Math.random() * cv.width; }
        });
      }
      windLines.forEach(wl => {
        ctx.beginPath(); ctx.strokeStyle = `rgba(220,238,255,${wl.opac})`;
        ctx.lineWidth = 1.5; ctx.moveTo(wl.x, wl.y);
        ctx.bezierCurveTo(wl.x + wl.len * .33, wl.y - 14, wl.x + wl.len * .67, wl.y + 14, wl.x + wl.len, wl.y + 3);
        ctx.stroke(); wl.x += wl.spd;
        if (wl.x > cv.width + wl.len) { wl.x = -wl.len; wl.y = Math.random() * cv.height * .85; }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [isRaining, isWindy]);

  useEffect(() => {
    if (!isRaining) return;
    let tid;
    const flash = () => {
      setLightning(true); setTimeout(() => setLightning(false), 110);
      if (Math.random() > .45) { setTimeout(() => { setLightning(true); setTimeout(() => setLightning(false), 80); }, 240); }
      tid = setTimeout(flash, 7000 + Math.random() * 18000);
    };
    tid = setTimeout(flash, 3000 + Math.random() * 8000);
    return () => clearTimeout(tid);
  }, [isRaining]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: grad, transition: 'background 1.8s ease' }}>
      {lightning && <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', background: 'rgba(255,255,230,0.20)' }} />}
      <svg width='100%' height='100%' viewBox='0 0 1440 400' preserveAspectRatio='xMidYMid slice'
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        {(th.star) && STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill='white'
            style={{ opacity: s.o, '--so': s.o, animation: `star-twinkle ${2.5 + s.td * .4}s ease-in-out infinite`, animationDelay: `${s.td}s` }} />
        ))}
        {th.moon && !isRaining && <MoonSVG hour={hour} />}
        {th.sun && <SunSVG hour={hour} />}
        {clouds.map((c, i) => <CloudShape key={i} x={c.x} y={c.y} w={c.w} h={c.h} c={c.c} o={c.o} />)}
        {isRaining && lightning && (
          <polyline points='680,60 658,148 694,158 642,248'
            fill='none' stroke='#FFFFC0' strokeWidth={5} strokeLinecap='round' strokeLinejoin='round' opacity={.92} />
        )}
      </svg>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 2 }} />
    </div>
  );
}

/* ═══════════════ UI SUB-COMPONENTS ═══════════════ */
const tech = { fontFamily: "'JetBrains Mono', monospace" };
const ui = { fontFamily: "'Inter', sans-serif" };

/* ─── REFERENCIAVONAL-CÍMKE, "halo" szöveg (vonaldiagramokhoz) ───
   Ugyanaz az elv, mint a fejléc TextAura komponensénél: nem egy kemény dobozzal
   emeljük ki a szöveget a háttérből, hanem egy erősen elmosott, a szöveg
   formáját követő "fényudvarral" mögötte — önmagában alig látható, mégis elég
   kontrasztot ad ahhoz, hogy bármilyen terület-kitöltés fölött olvasható maradjon. */
function RefLineTag({ viewBox, text, color, th, dy = -10, align = 'right' }) {
  if (!viewBox) return null;
  const { x, y, width } = viewBox;
  const ty = y + dy;
  const tx = align === 'right' ? x + width : x;
  const anchor = align === 'right' ? 'end' : 'start';
  const glowColor = th.id === 'day' ? 'rgba(255,255,255,0.95)' : 'rgba(6,12,24,0.9)';
  const filterId = `refGlow-${text.replace(/[^a-zA-Z0-9]/g, '')}`;
  const textStyle = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600 };
  return (
    <g>
      <defs>
        <filter id={filterId} x="-80%" y="-200%" width="260%" height="500%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>
      <text x={tx} y={ty} textAnchor={anchor} dominantBaseline="middle" style={textStyle} fill={glowColor} filter={`url(#${filterId})`}>{text}</text>
      <text x={tx} y={ty} textAnchor={anchor} dominantBaseline="middle" style={textStyle} fill={color}>{text}</text>
    </g>
  );
}

/* ─── REFERENCIAVONAL-CÍMKE, lekerekített "chip" (oszlopdiagramhoz) ───
   Az UV oszlopdiagramnál ez illett jobban: ott a szöveg gyakran szinte
   teljesen egy tömör oszlop felett/takarásában van, ahol egy önálló hátterű
   pill jobban tartja a kontrasztot, mint egy elmosott halo. */
function RefLineChip({ viewBox, text, color, th, dy = -10, align = 'right' }) {
  if (!viewBox) return null;
  const { x, y, width } = viewBox;
  const padX = 8, h = 18, charW = 6.1;
  const w = Math.round(text.length * charW + padX * 2);
  const tx = align === 'right' ? x + width - w : x;
  const ty = y + dy - h / 2;
  return (
    <g style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))' }}>
      <rect x={tx} y={ty} width={w} height={h} rx={h / 2} fill={th.card} stroke={`${color}45`} strokeWidth={1} />
      <text x={tx + w / 2} y={ty + h / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600 }} fill={color}>
        {text}
      </text>
    </g>
  );
}

function Lbl({ children, t, style }) {
  return (
    <div style={{ 
      ...ui, fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', 
      color: t.lbl, fontWeight: 600, marginBottom: 8,
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      ...style 
    }}>
      {children}
    </div>
  );
}

function Card({ children, style, delay = 0, show, t, className }) {
  const [mounted, setMounted] = useState(false);

  // 1. Megvárjuk, amíg a kártya beúszik (show + delay), utána engedélyezzük a 3D-t
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setMounted(true), delay + 600);
      return () => clearTimeout(timer);
    } else {
      setMounted(false);
    }
  }, [show, delay]);

  // 2. Kiszámoljuk az egér helyzetét és a dőlés mértékét
  // 2. Kiszámoljuk az egér helyzetét és a dőlés mértékét
  const handleMouseMove = (e) => {
    if (!mounted) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // A VARÁZSLAT: Dinamikus maximális dőlésszög a kártya mérete alapján!
    // Minél nagyobb a kártya (width/height), annál kisebb lesz a szorozószám.
    // Egy kis kártya kaphat 3 fokot, egy hatalmas csak 0.8 fokot.
    const maxTiltX = Math.max(0.5, Math.min(3, 400 / rect.height));
    const maxTiltY = Math.max(0.5, Math.min(3, 400 / rect.width));

    const rx = ((y - rect.height / 2) / (rect.height / 2)) * -maxTiltX;
    const ry = ((x - rect.width / 2) / (rect.width / 2)) * maxTiltY;

    // Értékek átadása a CSS változóknak
    el.style.setProperty('--rx', `${rx}deg`);
    el.style.setProperty('--ry', `${ry}deg`);
    el.style.setProperty('--gx', `${x}px`);
    el.style.setProperty('--gy', `${y}px`);
  };

  const handleMouseLeave = (e) => {
    const el = e.currentTarget;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  const innerLight = t.id === 'day' ? 'inset 0 1px 0 rgba(255,255,255,0.6)' : 'inset 0 1px 0 rgba(255,255,255,0.12)';
  const shadowStyle = t.id === 'day' ? '0 10px 30px rgba(15,23,42,0.04)' : '0 20px 40px rgba(0,0,0,0.25)';

  // 3. Tranzíció cseréje: Beúszáskor lassú (.6s), utána nagyon gyors (.1s) az egeres követéshez
  const trans = mounted
    ? 'transform 0.1s ease-out, box-shadow 0.4s, filter 0.4s, background 1s ease, border-color 1.5s ease'
    : `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms, background 1s ease`;

  return (
    <div
      className={`meteo-card${className ? ' ' + className : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 24,
        padding: 26,
        backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
        opacity: show ? 1 : 0,
        // Ehelyett CSS változót használunk az emelkedéshez, hogy fuzionálhasson a 3D dőléssel
        '--start-y': show ? '0px' : '22px',
        transform: 'perspective(1200px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(var(--start-y, 22px))',
        boxShadow: `${shadowStyle}, ${innerLight}`,
        transition: trans,
        ...style,
      }}
    >
      {/* 4. Csillogás (Glare) - Dinamikusan követi az egeret */}
      <div className="card-glare" style={{
        position: 'absolute', inset: 0, zIndex: 0, borderRadius: 'inherit', pointerEvents: 'none',
        background: `radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), rgba(255,255,255,0.08) 0%, transparent 60%)`,
      }} />

      {children}
    </div>
  );
}

// 2. LÉPÉS JAVÍTVA: Finomított, lágy "Apple-style" Shimmer
function SkeletonBlock({ w = '100%', h = 20, br = 8, th, style }) {
  const isDay = th.id === 'day';
  
  // Visszavettük az átlátszóságot (0.15 -> 0.09) a lágyabb hatásért
  const baseColor = isDay ? 'rgba(15, 23, 42, 0.03)' : 'rgba(255, 255, 255, 0.03)';
  const shineColor = isDay ? 'rgba(15, 23, 42, 0.09)' : 'rgba(255, 255, 255, 0.09)';

  return (
    <div style={{
      width: w, 
      height: h, 
      borderRadius: br,
      // Összébb húztuk a fénycsóvát (40% - 50% - 60%), hogy vékonyabb és elegánsabb legyen
      backgroundImage: `linear-gradient(110deg, ${baseColor} 40%, ${shineColor} 50%, ${baseColor} 60%)`,
      backgroundSize: '200% 100%',
      // 1.5s helyett 2.5s, és ease-in-out helyett linear (így nem gyorsul fel a közepén)
      animation: 'skeleton-shimmer 2.5s linear infinite',
      ...style
    }} />
  );
}

/* ═══════════════ SKELETON CROSSFADE WRAPPER ═══════════════ */
function SkeletonWrapper({ isLoaded, skeleton, children, delay = 0 }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── CSONTVÁZ RÉTEG ── */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: isLoaded ? 0 : 1, 
        pointerEvents: isLoaded ? 'none' : 'auto',
        // A csontváz eltűnése késleltetve
        transition: `opacity 0.6s ease ${delay}ms`,
        display: 'flex', flexDirection: 'column'
      }}>
        {skeleton}
      </div>
      
      {/* ── VALÓS TARTALOM RÉTEG ── */}
      <div style={{
        opacity: isLoaded ? 1 : 0, 
        transform: isLoaded ? 'translateY(0)' : 'translateY(8px)',
        // A tartalom beúszása késleltetve (+100ms, hogy a csontváz már javában halványodjon)
        transition: `opacity 0.8s ease ${delay + 100}ms, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay + 100}ms`,
        flex: 1, display: 'flex', flexDirection: 'column'
      }}>
        {children}
      </div>
    </div>
  );
}

/* ─── PREMIUM CHART CROSSFADE HOOK (Aloldalak időtáv-váltásához) ───
   Ugyanaz a "ghosting" élmény, mint a Hőmérséklet oldalon: a gombra kattintva
   a diagram és a jobb oldali kártyák elhomályosodnak / szürkülnek, majd a
   szimulált betöltés (1.2s) után lágyan éleseddnek vissza az új adattal. */
/* ─── PREMIUM CHART CROSSFADE HOOK (Valós API hívással és Lokális Fallback-el) ─── */
function useChartCrossfade(targetRange, mockDatasets) {
  const [displayRange, setDisplayRange] = useState(targetRange);
  const [isFetching, setIsFetching] = useState(false);
  const [chartData, setChartData] = useState(mockDatasets[targetRange]);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setIsFetching(true);
      try {
        const res = await fetch(`/api/history?range=${targetRange}`);
        if (!res.ok) throw new Error('API hiba');
        const json = await res.json();
        
        if (isMounted) {
          setChartData(json);
          setDisplayRange(targetRange);
          setIsFetching(false);
        }
      } catch (error) {
        // Ha lokálisan futtatod, visszaesik a gyönyörű tesztadatokra
        if (isMounted) {
          setChartData(mockDatasets[targetRange]);
          setDisplayRange(targetRange);
          setIsFetching(false);
        }
      }
    };

    fetchData(); // Azonnal lekéri az adatot váltáskor és legelső betöltéskor is
    return () => { isMounted = false; };
  }, [targetRange, mockDatasets]);

  return { 
    displayRange, isFetching, chartData, 
    fadeStyle: {
      filter: isFetching ? 'blur(4px) grayscale(20%)' : 'blur(0px) grayscale(0%)',
      opacity: isFetching ? 0.6 : 1,
      transform: isFetching ? 'translateY(4px) scale(0.99)' : 'translateY(0) scale(1)',
      transition: 'filter 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      pointerEvents: isFetching ? 'none' : 'auto'
    },
    cardFadeStyle: {
      opacity: isFetching ? 0.4 : 1,
      transition: 'opacity 0.5s'
    }
  };
}

/* ─── GHOST SHIMMER OVERLAY (fénycsóva, ami csak töltés alatt jelenik meg a diagramokon) ─── */
function ChartGhostShimmer({ th, isFetching }) {
  if (!isFetching) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 12,
      backgroundImage: `linear-gradient(110deg, transparent 30%, ${th.id === 'day' ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.1)'} 50%, transparent 70%)`,
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.5s linear infinite',
      zIndex: 10, pointerEvents: 'none'
    }} />
  );
}

/* ─── ÖNÁLLÓAN KETYEGŐ ÓRA (Nem frissíti az egész appot) ─── */
function LiveHeaderTime({ th }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ ...tech, fontSize: 'clamp(22px,2.8vw,34px)', fontWeight: 500, color: th.hClock, letterSpacing: '-0.02em', textShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 6px rgba(0,0,0,0.15)' }}>
        {time.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div style={{ ...ui, fontSize: 13, color: th.hSub, marginTop: 4, fontWeight: 500, textShadow: '0 2px 12px rgba(0,0,0,0.3), 0 0 4px rgba(0,0,0,0.15)' }}>
        {time.toLocaleDateString('hu-HU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
}

/* ─── LOKÁLIS "AURA" a fejléc-szövegek mögé ───
   Nem az egész felső sávot sötétíti el, csak a szöveg közvetlen környezetét,
   és nem élesen kirajzolt dobozzal, hanem egy erősen elmosott (blur) folttal —
   ennek fizikailag nincs kemény pereme, így nem "vágódik le" sehol.
   position:relative + display:inline-block => a doboz mindig pontosan a
   tényleges szöveg méretéhez igazodik, tehát rövid ("Ked") és hosszú
   ("Csütörtök") szöveg esetén is együtt nő/zsugorodik vele. */
function TextAura({ reach = 16, blur = 26, opacity = 0.07, children }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -reach,
          zIndex: -1,
          pointerEvents: 'none',
          background: `rgba(0,0,0,${opacity})`,
          filter: `blur(${blur}px)`,
          borderRadius: 999,
        }}
      />
      {children}
    </div>
  );
}

/* ─── BLUR-FADE TEXT (Vajsima, hiba nélküli áttűnés) ─── */
function BlurFadeText({ text, style }) {
  const [display, setDisplay] = useState(text);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (text !== display) {
      setFading(true); // 1. Eltüntetjük a régit
      const t = setTimeout(() => {
        setDisplay(text); // 2. Kicseréljük
        setFading(false); // 3. Visszahozzuk az újat
      }, 250); // Gyorsabb, 250ms-os rejtett csere
      return () => clearTimeout(t);
    }
    // Fontos: a 'display'-t kivettük a megfigyeltek közül, így nincs "végtelen hurok"
  }, [text]); 

  return (
    <span style={{
      display: 'inline-block',
      filter: fading ? 'blur(6px)' : 'blur(0px)',
      opacity: fading ? 0 : 1,
      transform: fading ? 'translateY(4px) scale(0.96)' : 'translateY(0) scale(1)',
      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      ...style
    }}>
      {display}
    </span>
  );
}

/* ─── LÁTÓTÁVOLSÁG BECSLÉSE (Harmatpont-depresszió + csapadék alapján) ───
   Nincs dedikált látótávolság-szenzor, ezért ezt a meteorológiában elterjedt,
   közelítő módszerrel becsüljük: minél kisebb a hőmérséklet és a harmatpont
   közötti különbség (spread), annál nagyobb a köd/pára kockázata, és annál
   rosszabb a látótávolság. Csapadék esetén ezt tovább csökkentjük. */
function estimateVisibility(temp, dewPoint, rainRate) {
  const spread = Math.max(0, temp - dewPoint);

  // Aszimptotikusan 20 km felé tartó becslés a harmatpont-spread alapján
  let vis = 20 * (1 - Math.exp(-spread / 3));
  vis = Math.max(0.1, Math.min(20, vis));

  // Csapadék esetén tovább romlik a látótávolság
  if (rainRate > 0) {
    const rainVis = 20 / (1 + rainRate * 2);
    vis = Math.min(vis, rainVis);
  }

  return vis;
}

/* ─── UPTIME BECSLÉSE (Deep Sleep esetén) ───
   A mikrokontroller RTC memóriájában tárolt alvási ciklusok (bootCount / sleepCycles) 
   alapján számolja ki az üzemidőt. */
function calculateUptime(cycles, cycleDurationSec = 120) {
  if (!cycles) return "00h 00m";
  
  const totalSeconds = cycles * cycleDurationSec;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  }
  return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
}

/* ─── PREMIUM DATA UPDATE COMPONENT (Tiszta áttűnés másodlagos adatokhoz) ─── */
function PremiumUpdateValue({ value, th }) {
  return (
    <span key={value} style={{ 
      display: 'inline-block', 
      /* Nappal fekete, éjszaka fehér színnel villan fel, mielőtt visszahűl az eredeti színére */
      '--flash-color': th.id === 'day' ? '#0F172A' : '#FFFFFF', 
      /* A teljes folyamat most 2 másodperc hosszú, gyönyörű rugó-görbével */
      animation: 'premium-data-update 2s cubic-bezier(0.16, 1, 0.3, 1) forwards' 
    }}>
      {value}
    </span>
  );
}

// ─── HYPER-PREMIUM WARM UPDATE: Odometer (Függőleges Számcsúszka) ───
function OdometerNumber({ value, format = (v) => v.toFixed(1) }) {
  const valStr = format(value);

  return (
    <span style={{ display: 'inline-flex', overflow: 'hidden', height: '1em', lineHeight: 1, verticalAlign: 'bottom' }}>
      {valStr.split('').map((char, index) => {
        // Stabil kulcs (key) generálása hátulról előre, hogy a számjegyek helyiértéke ne csússzon el
        const keyIndex = valStr.length - index;

        // Ha nem szám (pl. a tizedespont vagy mínusz jel), azt statikusan kiírjuk
        if (isNaN(char)) {
          return <span key={keyIndex} style={{ display: 'inline-block' }}>{char}</span>;
        }

        // Ha számjegy, legeneráljuk a függőleges 0-9 "filmcsíkot"
        const digit = parseInt(char, 10);
        return (
          <span key={keyIndex} style={{ display: 'inline-block', height: '1em' }}>
            <span style={{
              display: 'flex', flexDirection: 'column',
              // Mivel minden számjegy pontosan 1em magas, így toljuk fel a csíkot a megfelelő helyre:
              transform: `translateY(-${digit}em)`,
              // A VARÁZSLAT: A cubic-bezier(0.34, 1.56, 0.64, 1) egy fizikai rugó (spring) 
              // görbét szimulál. A szám túlszalad a célon, majd finoman visszapattan.
              transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <span key={num} style={{ height: '1em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {num}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function Bar3({ pct, color, delay = 0, show }) {
  return (
    <div style={{ height: 6, background: 'rgba(128,128,128,0.10)', borderRadius: 99, overflow: 'hidden', marginTop: 12 }}>
      <div style={{
        height: '100%', borderRadius: 99, background: color, 
        // ÚJ: width helyett 100%-os szélesség, és a GPU méretezi át (scaleX) balról jobbra!
        width: '100%', transformOrigin: 'left',
        transform: `scaleX(${show ? Math.min(pct, 100) / 100 : 0})`,
        transition: `transform 1s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
        willChange: 'transform' // Szólunk a böngészőnek, hogy készítse elő a videókártyát
      }} />
    </div>
  );
}

function WindCompass({ show, t, direction = R.windDir }) {
  const cx = 110, cy = 100, r = 78;
  const total = 2 * Math.PI * (r + 2);
  const arcLen = (direction / 360) * total;

  // Mostantól a mutatót fixen 0 fokra (Északra) rajzoljuk, és az egészet forgatjuk a CSS-el!
  const tipY = cy - r * 0.68;
  const baseTipY = cy + r * 0.28;
  const midY = cy - r * 0.28;
  const wx = 8;
  const needlePoints = `${cx},${tipY} ${cx - wx},${midY} ${cx},${baseTipY} ${cx + wx},${midY}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={220} height={210} viewBox='0 0 220 210'>
        <circle cx={cx} cy={cy} r={r + 14} fill='none' stroke={t.border} strokeWidth={1} />
        <circle cx={cx} cy={cy} r={r + 6} fill='none' stroke={t.border} strokeWidth={.6} />
        <circle cx={cx} cy={cy} r={r} fill='none' stroke={`${t.p}20`} strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={r - 24} fill='none' stroke={`${t.p}10`} strokeWidth={1} strokeDasharray='2 7' />
        {Array.from({ length: 72 }, (_, i) => {
          const a = (i * 5 - 90) * Math.PI / 180, mj = i % 18 === 0, md = i % 9 === 0;
          const r1 = mj ? r - 9 : md ? r - 5 : r - 3;
          return (<line key={i} x1={cx + r * Math.cos(a)} y1={cy + r * Math.sin(a)} x2={cx + r1 * Math.cos(a)} y2={cy + r1 * Math.sin(a)} stroke={mj ? `${t.p}60` : md ? `${t.p}30` : `${t.p}10`} strokeWidth={mj ? 1.5 : 1} />);
        })}
        {[['É', 0, t.a], ['K', 90, t.t2], ['D', 180, t.t2], ['NY', 270, t.t2]].map(([c, deg, fill]) => {
          const a = (deg - 90) * Math.PI / 180;
          return (<text key={c} x={cx + (r + 22) * Math.cos(a)} y={cy + (r + 22) * Math.sin(a)} textAnchor='middle' dominantBaseline='central' style={{ ...tech, fontSize: 12, fontWeight: 700, fill }}>{c}</text>);
        })}
        
        {/* A külső kijelző ív is folyékonyan követi az értéket */}
        {show && (<circle cx={cx} cy={cy} r={r + 2} fill='none' stroke={`${t.a}20`} strokeWidth={6} strokeDasharray={`${arcLen} ${total}`} strokeDashoffset={`${total * .25}`} style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }} />)}
        
        {/* ÍME A VARÁZSLAT: A mutató csoport rugós (Spring) forgatása! */}
        <g style={{
          transform: `rotate(${direction}deg)`,
          transformOrigin: `${cx}px ${cy}px`,
          transition: 'transform 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          <polygon points={needlePoints} fill={t.a} style={{ opacity: show ? 1 : 0, transition: 'opacity .7s ease .5s, fill 1s ease' }} />
          <line x1={cx} y1={cy} x2={cx} y2={baseTipY} stroke='rgba(255,80,80,0.6)' strokeWidth={2} strokeLinecap='round' />
        </g>
        
        <circle cx={cx} cy={cy} r={5} fill={t.id === 'day' ? '#fff' : '#0a1426'} stroke={`${t.p}80`} strokeWidth={1.5} />
      </svg>
    </div>
  );
}

/* ═══════════════ SMART CAPSULE (APPLE INTELLIGENCE STYLE) ═══════════════ */

// 1. A Prioritási Mátrix (Csak a legfontosabbat mondja el)
function getSmartInsight(phase, isRaining, isWindy, liveData) {
  // 1. SZINT: Kritikus anomáliák (Ezek mindent felülírnak)
  if (isWindy && liveData.windSpeed > 40) return { text: "Viharos erejű széllökések várhatók, érdemes rögzíteni a kerti tárgyakat.", tag: { icon: "🌬", label: "Erős szél", color: "#EF4444" } };
  if (isRaining) return { text: "Aktív csapadéktevékenység zajlik, a kinti páratartalom rohamosan nő.", tag: { icon: "☔", label: "Esős idő", color: "#0EA5E9" } };
  if (liveData.pressure < 1000) return { text: "A légnyomás drasztikus esése viharos, instabil időjárás közeledtét jelzi.", tag: { icon: "📉", label: "Nyomásesés", color: "#F59E0B" } };

  // 2. SZINT: Figyelmeztetések és Életmód
  if (phase === 'day' && liveData.uvIndex > 6) return { text: "Magas az UV-sugárzás, a déli órákban kerüld a közvetlen napfényt.", tag: { icon: "🧴", label: "Erős UV", color: "#F97316" } };
  if (liveData.temp > 30) return { text: `Kritikusan meleg van (${liveData.temp}°C), ügyelj a megfelelő folyadékpótlásra.`, tag: { icon: "🔥", label: "Hőség", color: "#EF4444" } };
  if (liveData.temp < 5) return { text: "Fagyveszély közeli hőmérséklet, az utakon síkosság képződhet.", tag: { icon: "❄️", label: "Hideg", color: "#3B82F6" } };

  // 3. SZINT: Komfortérzet
  if (liveData.feelsLike > liveData.temp + 2) return { text: "A magas páratartalom miatt a levegő fülledtebbnek, melegebbnek érződik.", tag: { icon: "💧", label: "Fülledt", color: "#10B981" } };
  if (liveData.feelsLike < liveData.temp - 2) return { text: "Az élénk légmozgás miatt a valósnál kissé hűvösebbnek érezheted a levegőt.", tag: { icon: "💨", label: "Hűvös szél", color: "#34D399" } };

  // 4. SZINT: Nyugalmi állapot
  if (phase === 'night' || phase === 'evening') return { text: "Tiszta, csendes éjszaka, stabil és kiegyensúlyozott mérési adatokkal.", tag: { icon: "🌙", label: "Nyugodt", color: "#8B5CF6" } };
  
  return { text: "Kiegyensúlyozott, kellemes időnk van, ideális a szabadtéri programokhoz.", tag: { icon: "✅", label: "Ideális", color: "#10B981" } };
}

// 2. A Vizuális Komponens (Smart Capsule)
function SmartCapsule({ th, show, phase, isRaining, isWindy, liveData, appLoaded }) {
  const insight = useMemo(() => getSmartInsight(phase, isRaining, isWindy, liveData), [phase, isRaining, isWindy, liveData]);
  
  const [displayInsight, setDisplayInsight] = useState(insight);
  const [animState, setAnimState] = useState(false);

  useEffect(() => {
    if (!show) return;

    // Ha ténylegesen megváltozik az ajánlás (pl. eláll az eső)
    if (insight.text !== displayInsight.text) {
      setAnimState(false); // 1. Eltüntetjük a régi szöveget
      const t = setTimeout(() => {
        setDisplayInsight(insight); // 2. A "függöny mögött" kicseréljük
        setAnimState(true); // 3. Beélesítjük az újat
      }, 300);
      return () => clearTimeout(t);
    } else {
      setAnimState(true); // Első betöltéskor
    }
  }, [show, insight]);

  return (
    <div style={{
      background: th.card, border: `1px solid ${th.border}`,
      borderRadius: 99, padding: '8px 10px 8px 18px', height: 48, width: '100%',
      backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
      boxShadow: th.id === 'day' ? '0 10px 30px rgba(0,0,0,0.03)' : '0 14px 40px rgba(0,0,0,0.2)',
      opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(-14px)',
      transition: 'opacity 0.6s ease, transform 0.6s ease, background 1s, border-color 1s'
    }}>
      
      <SkeletonWrapper isLoaded={appLoaded} delay={0} skeleton={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: '100%' }}>
          {/* ÚJ: flex: 1, hogy a 60% a megmaradó helyhez képest számolódjon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
            <SkeletonBlock w={24} h={24} br="50%" th={th} style={{ flexShrink: 0 }} />
            {/* ÚJ: 240px helyett most 60%-os szélességgel foglalja el a helyet */}
            <SkeletonBlock w="60%" h={14} br={4} th={th} />
          </div>
          <SkeletonBlock w={85} h={28} br={99} th={th} style={{ flexShrink: 0 }} />
        </div>
      }>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${th.p}, ${th.v})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, animation: 'live-pulse 2s infinite ease-in-out'
            }}>✨</div>
            
            <div style={{
              fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: th.t1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              filter: animState ? 'blur(0px)' : 'blur(6px)',
              opacity: animState ? 1 : 0,
              transform: animState ? 'translateZ(0) scale(1)' : 'translateZ(0) scale(0.98)',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              {displayInsight.text}
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            borderRadius: 99, flexShrink: 0,
            background: `${displayInsight.tag.color}15`, border: `1px solid ${displayInsight.tag.color}30`,
            transition: 'background 0.5s, border-color 0.5s'
          }}>
            <span style={{ fontSize: 13 }}>{displayInsight.tag.icon}</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: displayInsight.tag.color, letterSpacing: '.02em' }}>
              {displayInsight.tag.label}
            </span>
          </div>
        </div>

      </SkeletonWrapper>
    </div>
  );
}

/* ═══════════════ IOT SYNC RING (NAVBAR VERSION) ═══════════════ */
function IoTSyncRing({ lastDataTimestamp, simulatedTime, th }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const [baseWidth, setBaseWidth] = useState(88);
  const [hoverWidth, setHoverWidth] = useState(130);
  
  const baseTextRef = useRef(null);
  const hoverTextRef = useRef(null);

  // ÚJ: Saját belső óra a gyűrűhöz
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  
  // Így mindig újra kiszámolja a különbséget
  const diffMs = (Date.now() + (simulatedTime.getTime() - Date.now())) - lastDataTimestamp;
  const diffMins = diffMs / 60000;

  let state = 'normal';
  let progress = 0;
  let gradId = 'grad-normal';
  let glowColor = '#2DD4BF';
  let text = "";
  let isPulsing = false;

  // ÁLLAPOTGÉP LOGIKA
  if (diffMins < 15) {
    state = 'normal';
    progress = diffMins / 15;
    const minsLeft = Math.max(1, Math.ceil(15 - diffMins));
    text = `Frissítés: ~ ${minsLeft} perc`;
    gradId = 'grad-normal';
    glowColor = '#34D399';
  } else if (diffMins < 17) {
    state = 'grace';
    progress = 1;
    isPulsing = true;
    text = `Frissítés: ~ 1 perc`;
    gradId = 'grad-normal';
    glowColor = '#34D399';
  } else if (diffMins < 30) {
    state = 'delayed';
    progress = 1;
    gradId = 'grad-delayed';
    glowColor = '#F59E0B';
    text = `Késik / Nincs adat`;
  } else {
    state = 'offline';
    progress = 1;
    gradId = 'grad-offline';
    glowColor = '#EF4444';
    text = `Offline / Hiba`;
  }

  // A GOLYÓÁLLÓ MÉRÉS: ResizeObserver folyamatosan figyeli a DOM elemek méretváltozását
  useEffect(() => {
    const baseEl = baseTextRef.current;
    const hoverEl = hoverTextRef.current;
    if (!baseEl || !hoverEl) return;

    const observer = new ResizeObserver(() => {
      // Ha bármi miatt (font betöltés, szövegcsere) változik a méret, azonnal korrigál
      if (baseTextRef.current) setBaseWidth(baseTextRef.current.offsetWidth);
      if (hoverTextRef.current) setHoverWidth(hoverTextRef.current.offsetWidth);
    });

    observer.observe(baseEl);
    observer.observe(hoverEl);

    // Takarítás, ha a komponens megszűnik
    return () => observer.disconnect();
  }, []); // Nincs szükség függőségekre, az observer magától észreveszi a szövegváltozást is!

  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress * circ);

  const currentWidth = isHovered ? hoverWidth : baseWidth;

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'default' }}
    >
      {/* ── BIZTONSÁGOSABB MÉRŐBLOKKOK: Max-content garantálja, hogy nem törnek sorba ── */}
      <div style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column' }}>
        <div ref={baseTextRef} style={{ width: 'max-content', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '.04em' }}>
          METEO · DSHB
        </div>
        <div ref={hoverTextRef} style={{ width: 'max-content', fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '.02em' }}>
          {text}
        </div>
      </div>

      {/* ── 1. SVG GYŰRŰ ── */}
      <div style={{ 
        position: 'relative', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        animation: isPulsing ? 'live-pulse 2s infinite ease-in-out' : 'none', borderRadius: '50%'
      }}>
        <svg width="32" height="32" viewBox="0 0 32 32" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="grad-normal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2DD4BF" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="grad-delayed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
            <linearGradient id="grad-offline" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F87171" />
              <stop offset="100%" stopColor="#BE123C" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r={r} fill="none" stroke={`${glowColor}20`} strokeWidth="2.5" />
          {state !== 'offline' && (
            <circle cx="16" cy="16" r={r} fill="none" stroke={`url(#${gradId})`} strokeWidth="2.5" 
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" 
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
            />
          )}
          {state === 'offline' && (
            <>
              <line x1="11" y1="11" x2="21" y2="21" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="21" y1="11" x2="11" y2="21" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}
        </svg>
      </div>

      {/* ── 2. ANIMÁLT, DINAMIKUSAN TÁGULÓ 3D HENGER ── */}
      <div style={{ 
        position: 'relative', height: 16, 
        width: currentWidth,
        perspective: '600px',
        transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)' 
      }}>
        <div style={{
          width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d',
          transform: isHovered ? 'rotateX(90deg)' : 'rotateX(0deg)',
          transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            transform: 'translateZ(8px)', backfaceVisibility: 'hidden',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: th.t1, letterSpacing: '.04em', whiteSpace: 'nowrap'
          }}>
            METEO · DSHB
          </div>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            transform: 'rotateX(-90deg) translateZ(8px)', backfaceVisibility: 'hidden',
            fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: th.t1, letterSpacing: '.02em', whiteSpace: 'nowrap'
          }}>
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ NAVIGATION BAR (GOLYÓÁLLÓ VERZIÓ) ═══════════════ */
function NavBar({ currentPage, setCurrentPage, th, simulatedTime, lastDataTimestamp }) {
  const [hov, setHov] = useState(null);
  const scrollRef = useRef(null);
  const innerLight = th.id === 'day' ? 'inset 0 1px 0 rgba(255,255,255,0.6)' : 'inset 0 1px 0 rgba(255,255,255,0.12)';

  const mobileLabels = {
    'dashboard': 'Főoldal', 'temperature': 'Hő', 'humidity': 'Pára',
    'pressure': 'Nyomás', 'brightness': 'Fény', 'precipitation': 'Eső', 'wind': 'Szél'
  };

  /* ── VÉGLEGES JAVÍTÁS: Ultra-sima görgetőmotor MINIMÁLIS SEBESSÉGLIMITTEL ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let target = el.scrollLeft;
    let currentFloat = el.scrollLeft;
    let rafId = null;
    let snapTimer = null;

    const syncTarget = () => { 
      target = el.scrollLeft; 
      currentFloat = el.scrollLeft;
      cancelAnimationFrame(rafId);
    };

    const onWheel = (e) => {
      // Csak a függőleges görgőt alakítjuk át. A trackpadet (deltaX) meghagyjuk natívnak.
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        
        const maxScroll = el.scrollWidth - el.clientWidth;
        target = Math.max(0, Math.min(target + Math.sign(e.deltaY) * 150, maxScroll));

        const animate = () => {
          const diff = target - currentFloat;
          
          if (Math.abs(diff) > 0.5) {
            // A varázslat: Kiszámoljuk a sebességet (a hátralévő távolság 12%-a)
            let velocity = diff * 0.12; 
            
            // GARANCIA AZ AKADÁS ELLEN: A sebesség sosem eshet 1 pixel / képkocka alá!
            // Így a legvégén is stabil 60 FPS-sel, egyenletesen fejezi be a mozgást.
            if (Math.abs(velocity) < 1) {
              velocity = Math.sign(velocity) * 1;
            }

            // Ha az utolsó ugrás már túllépne a célon, pont a célra tesszük
            if (Math.abs(velocity) >= Math.abs(diff)) {
              currentFloat = target;
            } else {
              currentFloat += velocity;
            }

            el.scrollLeft = currentFloat; 
            rafId = requestAnimationFrame(animate);
          } else {
            currentFloat = target;
            el.scrollLeft = target;
          }
        };

        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(animate);
      } else {
        syncTarget(); 
      }
    };

    // Visszapattanó (Snap) logika a bal szél levágása ellen, ugyanezzel a sima sebességgel
    const onScroll = () => {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        if (el.scrollLeft > 0 && el.scrollLeft < 15) {
          target = 0;
          const snapAnimate = () => {
            const diff = target - currentFloat;
            if (Math.abs(diff) > 0.5) {
              let velocity = diff * 0.15; 
              
              // Itt is alkalmazzuk a sebességlimitet
              if (Math.abs(velocity) < 1) {
                velocity = Math.sign(velocity) * 1;
              }

              if (Math.abs(velocity) >= Math.abs(diff)) {
                currentFloat = target;
              } else {
                currentFloat += velocity;
              }

              el.scrollLeft = currentFloat;
              rafId = requestAnimationFrame(snapAnimate);
            } else {
              currentFloat = 0;
              el.scrollLeft = 0;
            }
          };
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(snapAnimate);
        }
      }, 150);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', syncTarget, { passive: true });
    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', syncTarget);
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
      clearTimeout(snapTimer);
    };
  }, []);

  return (
    <nav className="smart-nav-wrapper" style={{
      background: th.card, backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
      border: `1px solid ${th.border}`,
      boxShadow: `0 12px 40px rgba(0,0,0,0.12), ${innerLight}`,
    }}>
      
      <div className="nav-logo" style={{ 
        borderRight: `1px solid ${th.border}`, 
        paddingRight: 18,  
        marginRight: 2,   /* Visszakaptad az App_2 tökéletes elrendezését! */
        paddingLeft: 6     
      }}>
        <IoTSyncRing 
          lastDataTimestamp={lastDataTimestamp} 
          simulatedTime={simulatedTime} 
          th={th} 
        />
      </div>
      
      {/* Kőbe vésett, garantáltan működő inline CSS az eltűnő gombok ellen */}
      <div className="smart-nav-scroll" ref={scrollRef} style={{
        display: 'flex', alignItems: 'center', gap: 4, 
        paddingLeft: 12, /* Az árnyék védőzónája! */
        paddingRight: 32, height: '100%', flex: 1, 
        overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none',
        WebkitMaskImage: 'linear-gradient(to right, black 0%, black calc(100% - 32px), transparent 100%)',
        maskImage: 'linear-gradient(to right, black 0%, black calc(100% - 32px), transparent 100%)',
        transform: 'translateZ(0)', willChange: 'scroll-position'
      }}>
        {NAV_PAGES.map(({ id, icon, label }) => {
          const active = currentPage === id, isHov = hov === id;
          return (
            <button key={id} className={`nav-btn ${active ? 'active' : ''}`}
              onClick={() => setCurrentPage(id)} onMouseEnter={() => setHov(id)} onMouseLeave={() => setHov(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                borderRadius: 99, cursor: 'pointer', border: '1px solid transparent',
                outline: 'none', flexShrink: 0, whiteSpace: 'nowrap',
                transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                background: active ? (th.id === 'day' ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.08)') : isHov ? (th.id === 'day' ? 'rgba(15,23,42,0.02)' : 'rgba(255,255,255,0.03)') : 'transparent',
                color: active ? th.p : isHov ? th.t1 : th.t2,
              }}>
              <span className="nav-icon" style={{ fontSize: 12 }}>{icon}</span>
              <span className="nav-label" style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: active ? 600 : 400 }}>{label}</span>
              <span className="nav-label-mobile" style={{ fontWeight: active ? 600 : 400 }}>{mobileLabels[id]}</span>
            </button>
          );
        })}
      </div>
      
    </nav>
  );
}

/* ═══════════════ PREMIUM TOAST NOTIFICATIONS ═══════════════ */
function ToastContainer({ toasts, th }) {
  return (
    <div style={{
      position: 'fixed', top: 32, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', gap: 12, zIndex: 9999,
      pointerEvents: 'none', alignItems: 'center'
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: th.id === 'day' ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.85)',
          backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
          border: `1px solid ${th.border}`, padding: '10px 20px', borderRadius: 99,
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: th.id === 'day' ? '0 10px 40px rgba(0,0,0,0.1)' : '0 20px 40px rgba(0,0,0,0.4)',
          animation: 'toast-anim 3.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}>
          {/* Zöld pipa ikon */}
          <div style={{
            width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #34D399, #10B981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            fontSize: 14, fontWeight: 800, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
          }}>✓</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: th.t1, letterSpacing: '-0.01em' }}>Sikeres Exportálás</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, color: th.t2 }}>{t.msg}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════ DYNAMIC FORMAT PILL (MOBILE & DESKTOP) ═══════════════ */
function FormatPill({ exportFormat, setExportFormat, th, isFetching = false }) {
  // A korábbi 'hov' (hover) állapotot átneveztük isOpen-re, mert most már koppintás is nyithatja
  const [isOpen, setIsOpen] = useState(false);
  const pillRef = useRef(null);
  const formats = ['csv', 'json', 'xml'];

  // Bezárás, ha a kapszulán kívülre kattintanak/koppintanak (Mobil védelem)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pillRef.current && !pillRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    // Csak akkor terheljük a böngészőt eseményfigyeléssel, ha nyitva van a kapszula
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside); // Direkt érintőképernyőre
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div 
      ref={pillRef}
      // Asztali gép (Egér logikája)
      onMouseEnter={() => setIsOpen(true)} 
      onMouseLeave={() => setIsOpen(false)}
      // Mobil (Érintés logikája)
      onClick={() => { if (!isFetching) setIsOpen(true); }} 
      style={{ 
        display: 'flex', alignItems: 'center', 
        background: th.id === 'day' ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.05)', 
        borderRadius: 99, padding: 4, gap: isOpen ? 4 : 0,
        border: `1px solid ${th.border}`,
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', // Az eredeti Apple-stílusú rugós animáció
        cursor: isFetching ? 'not-allowed' : 'pointer', height: 40,
        opacity: isFetching ? 0.5 : 1, pointerEvents: isFetching ? 'none' : 'auto'
      }}
    >
      {formats.map(fmt => {
        const isActive = exportFormat === fmt;
        const isVisible = isActive || isOpen;

        return (
          <button
            key={fmt}
            onClick={(e) => { 
              e.stopPropagation(); // Ez nagyon fontos: megakadályozza, hogy a szülő div azonnal újra kinyissa!
              setExportFormat(fmt); 
              setIsOpen(false); // Kiválasztás után elegánsan visszazár
            }}
            style={{
              opacity: isVisible ? 1 : 0,
              maxWidth: isVisible ? 80 : 0, // A varázslat: 0-ról nő meg a szélessége
              padding: isVisible ? '0 14px' : '0',
              height: '100%', margin: 0, border: 'none', borderRadius: 99,
              background: isActive ? (th.id === 'day' ? '#fff' : '#1e293b') : 'transparent',
              color: isActive ? th.t1 : th.t2,
              boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
              fontWeight: isActive ? 700 : 500, cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              fontFamily: "'Inter', sans-serif", fontSize: 11, letterSpacing: '.04em', 
              textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden'
            }}
          >
            {fmt}
          </button>
        );
      })}
      
      {/* Kinyitó (chevron) indikátor, ami finoman eltűnik, ha nyitva van a kapszula */}
      <div style={{
        maxWidth: isOpen ? 0 : 20, opacity: isOpen ? 0 : 0.5, overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontSize: 10, color: th.t1, marginLeft: 2, marginRight: 8 }}>⏷</span>
      </div>
    </div>
  );
}


/* ─── VALÓS NAPKELTE/NAPNYUGTA SZÁMÍTÁS (NOAA-képlet, Debrecen koordinátáira) ───
   Nincs szükség külső API-ra: a dátumból és a helyi koordinátákból pontosan
   (kb. 1-2 percen belüli eltéréssel) kiszámolja a nap kelését és nyugvását. */
const DEBRECEN_LAT = 47.53;
const DEBRECEN_LON = 21.63;

function getSunTimes(date, lat = DEBRECEN_LAT, lon = DEBRECEN_LON) {
  const rad = Math.PI / 180;
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - startOfYear) / 86400000);

  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (date.getHours() - 12) / 24);

  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));

  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);

  const latRad = lat * rad;
  const zenith = 90.833 * rad; // hivatalos napkelte/napnyugta zenitszög (légköri fénytörés + napkorong mérete)

  const cosHA = (Math.cos(zenith) / (Math.cos(latRad) * Math.cos(decl))) - Math.tan(latRad) * Math.tan(decl);
  const clampedCosHA = Math.max(-1, Math.min(1, cosHA)); // védelem sarkköri szélsőségek ellen (nálunk nem fordul elő)
  const haDeg = Math.acos(clampedCosHA) / rad;

  const sunriseUTC = 720 - 4 * (lon + haDeg) - eqTime;
  const sunsetUTC  = 720 - 4 * (lon - haDeg) - eqTime;

  const tzOffsetMin = -date.getTimezoneOffset(); // a böngésző kezeli a nyári időszámítást is

  return {
    sunrise: (sunriseUTC + tzOffsetMin) / 60, // tizedes óra, pl. 5.7 = 05:42
    sunset: (sunsetUTC + tzOffsetMin) / 60,
  };
}

function formatDecimalHour(decHour) {
  const h = Math.floor(decHour);
  const m = Math.round((decHour - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}


/* ═══════════════ SENSOR LAYOUT (DRY ARCHITEKTÚRA) ═══════════════ */
function SensorLayout({ title, icon, color, th, show, children }) {
  return (
    <div className="page-container">
      {/* 1. JAVÍTÁS: A fejléc megkapta a flex elrendezést, hogy az óra jobbra kerüljön */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 32, opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(-14px)', transition: 'opacity .5s ease, transform .5s ease' }}>
        
        <TextAura>
          <div>
            <h1 style={{ ...ui, fontSize: 32, fontWeight: 700, color: th.hTitle, margin: 0, display: 'flex', alignItems: 'center', gap: 12, letterSpacing: '-0.02em', textShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 6px rgba(0,0,0,0.15)' }}>
              <span style={{ color, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))' }}>{icon}</span> {title} Analízis
            </h1>
            <p style={{ ...ui, fontSize: 14, color: th.hSub, marginTop: 6, opacity: 0.8, textShadow: '0 2px 12px rgba(0,0,0,0.3), 0 0 4px rgba(0,0,0,0.15)' }}>
              Történeti adatok, trendek és adatexportálás közvetlenül az InfluxDB adatbázisból.
            </p>
          </div>
        </TextAura>

        {/* 2. JAVÍTÁS: Itt hívjuk meg az okos, önálló órát az Aloldalakon is! */}
        <TextAura>
          <LiveHeaderTime th={th} />
        </TextAura>

      </header>

      <div className="mg" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
        {children}
      </div>
    </div>
  );
}



/* ═══════════════ TEMPERATURE PAGE (GHOSTING UPDATE) ═══════════════ */
function TemperaturePage({ th, addToast, liveData }) {
  
  // 1. A VARÁZSLAT: Kettéválasztjuk a gombot és az adatot!
  const [show, setShow] = useState(false);
  const [range, setRange] = useState('1d'); // Egységesítve a többi oldallal
  const [activeBtn, setActiveBtn] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');

  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 90);
    return () => clearTimeout(t);
  }, []);

  // Meghívjuk a felokosított Hookot
  const { displayRange, isFetching, fadeStyle, cardFadeStyle, chartData } = useChartCrossfade(range, TEMP_DATASETS);
  const data = chartData;
  const temps = data.map(d => d.temp);
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const avgT = parseFloat((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1));
  const currentT = temps[temps.length - 1];

  const lookback = Math.min(3, temps.length - 1);
  const prevT = temps[temps.length - 1 - lookback];
  const trendDiff = parseFloat((currentT - prevT).toFixed(1));
  const intervalLabels = { '1h': '15p', '1d': 'ó', '1w': '6ó', '1mo': 'nap' };

  /* Meteorológiai trend skála */
  const intervalHours = { '1h': 0.25, '1d': 1, '1w': 6, '1mo': 24 };
  const ratePerHour = parseFloat((trendDiff / (lookback * intervalHours[displayRange])).toFixed(2));
  
  let trendColor, trendLabel, trendArrow;
  if (ratePerHour >= 1.0) { trendColor = '#EF4444'; trendLabel = 'Gyorsan melegedő'; trendArrow = '⇡'; }
  else if (ratePerHour > 0.15) { trendColor = '#F59E0B'; trendLabel = 'Enyhén melegedő'; trendArrow = '↑'; }
  else if (ratePerHour >= -0.15 && ratePerHour <= 0.15) { trendColor = th.t2; trendLabel = 'Stabil'; trendArrow = '→'; }
  else if (ratePerHour > -1.0) { trendColor = '#0EA5E9'; trendLabel = 'Enyhén hűlő'; trendArrow = '↓'; }
  else { trendColor = '#3B82F6'; trendLabel = 'Gyorsan hűlő'; trendArrow = '⇣'; }

  const rangeButtons = [
    { id: '1h', label: '1 Óra' },
    { id: '1d', label: '1 Nap' },
    { id: '1w', label: '1 Hét' },
    { id: '1mo', label: '1 Hónap' },
  ];

  /* Fájlgenerátor funkciók (Hőmérséklethez igazítva) */
  const downloadCSV = () => {
    const rows = ['Időpont,Hőmérséklet (°C)', ...data.map(d => `${d.t},${d.temp}`)].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `homerseklet_${displayRange}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportJSON = () => {
    const payload = { exportedAt: new Date().toISOString(), range: displayRange, unit: '°C', records: data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `homerseklet_${displayRange}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportXML = () => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<telemetry>\n`;
    xml += `  <metadata>\n    <exportedAt>${new Date().toISOString()}</exportedAt>\n    <range>${displayRange}</range>\n    <unit>C</unit>\n  </metadata>\n`;
    xml += `  <records>\n`;
    data.forEach(d => {
      xml += `    <record>\n      <time>${d.t}</time>\n      <temp>${d.temp}</temp>\n    </record>\n`;
    });
    xml += `  </records>\n</telemetry>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `homerseklet_${displayRange}.xml`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExport = () => {
    if (exportFormat === 'csv') downloadCSV();
    else if (exportFormat === 'json') exportJSON();
    else if (exportFormat === 'xml') exportXML();
    addToast(`A(z) ${exportFormat.toUpperCase()} adatcsomag letöltése elindult.`);
  };

  const TempTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 16, padding: '10px 16px', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', backdropFilter: 'blur(20px)' }}>
        <div style={{ ...ui, fontSize: 11, color: th.lbl, fontWeight: 600, marginBottom: 6, letterSpacing: '.04em' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ ...tech, fontSize: 22, fontWeight: 700, color: th.w }}>{payload[0]?.value?.toFixed(1)}</span>
          <span style={{ ...ui, fontSize: 13, color: th.t2 }}>°C</span>
        </div>
        {payload[0]?.value <= minT && <div style={{ ...ui, fontSize: 10, color: '#0EA5E9', marginTop: 4 }}>▼ Minimum</div>}
        {payload[0]?.value >= maxT && <div style={{ ...ui, fontSize: 10, color: '#EF4444', marginTop: 4 }}>▲ Maximum</div>}
      </div>
    );
  };

  // A gombok stílusa már a selectedRange (azonnali) állapotra reagál
  const btnStyle = (id) => ({
    padding: '5px 14px', borderRadius: 99, cursor: 'pointer',
    background: range === id ? (th.id === 'day' ? 'rgba(15,23,42,0.07)' : 'rgba(255,255,255,0.10)') : activeBtn === id ? (th.id === 'day' ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.04)') : 'transparent',
    border: range === id ? `1px solid ${th.border}` : '1px solid transparent',
    color: range === id ? th.p : th.t2,
    ...ui, fontSize: 12, fontWeight: range === id ? 600 : 400, transition: 'all 0.2s',
  });

  return (
    <SensorLayout title="Hőmérséklet" icon="🌡" color={th.w} th={th} show={show}>

      {/* ── BAL OLDAL (8 oszlop): DIAGRAM + EXPORT KÁRTYA ── */}
      <div className="gc8" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        <Card show={show} delay={80} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 380 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <Lbl t={th}>Hőmérséklet Idősora</Lbl>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ ...tech, fontSize: 38, fontWeight: 700, color: th.w, letterSpacing: '-0.03em', lineHeight: 1 }}>{liveData.temp.toFixed(1)}</span>
                <span style={{ ...ui, fontSize: 16, color: th.t2, fontWeight: 400 }}>°C</span>
                <span style={{ ...ui, fontSize: 12, color: trendColor, fontWeight: 600, marginLeft: 4 }}>
                  {trendArrow} {trendLabel}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {rangeButtons.map(({ id, label }) => (
                <button key={id} style={btnStyle(id)} onClick={() => setRange(id)} onMouseEnter={() => setActiveBtn(id)} onMouseLeave={() => setActiveBtn(null)}>
                    {label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. A GHOSTING EFFEKTUS: Amikor tölt, bebluröl és megjelenik a fénycsóva! */}
          <div style={{ 
            flex: 1, width: '100%', minHeight: 280, position: 'relative',
            filter: isFetching ? 'blur(4px) grayscale(20%)' : 'blur(0px) grayscale(0%)',
            opacity: isFetching ? 0.6 : 1,
            transform: isFetching ? 'translateY(4px) scale(0.99)' : 'translateY(0) scale(1)',
            transition: 'filter 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: isFetching ? 'none' : 'auto'

            /*
            flex: 1, width: '100%', minHeight: 280, position: 'relative',
            filter: isFetching ? 'blur(4px) grayscale(20%)' : 'blur(0px) grayscale(0%)',
            opacity: isFetching ? 0.6 : 1,
            transition: 'filter 0.5s ease, opacity 0.5s ease',
            pointerEvents: isFetching ? 'none' : 'auto'
            */
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart key={displayRange} data={data} margin={{ top: 8, right: 28, bottom: 0, left: -20 }}>                <defs>
                  <linearGradient id="gTempFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={th.w} stopOpacity={0.25} />
                    <stop offset="70%" stopColor={th.w} stopOpacity={0.05} />
                    <stop offset="100%" stopColor={th.w} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4" stroke={`${th.t2}15`} vertical={false} />
                <XAxis dataKey="t" tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} domain={[Math.floor(minT - 1), Math.ceil(maxT + 1)]} tickFormatter={v => `${v}°`} />
                <Tooltip content={<TempTip />} cursor={{ stroke: `${th.w}40`, strokeWidth: 1.5, strokeDasharray: '4 3' }} />
                <Area
                  type="monotone" dataKey="temp" stroke={th.w} strokeWidth={2.5} fill="url(#gTempFill)" dot={false}
                  activeDot={{ r: 5, fill: th.w, stroke: th.id === 'day' ? '#fff' : '#0a1426', strokeWidth: 2 }}
                  isAnimationActive={true}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
                <ReferenceLine y={avgT} stroke={`${th.t2}60`} strokeDasharray="6 4" strokeWidth={1.5}
                  label={(p) => <RefLineTag viewBox={p.viewBox} text={`Átl. ${avgT}°C`} color={th.t2} th={th} />} />
              </AreaChart>
            </ResponsiveContainer>

            {/* A Láthatatlan Szellemkép-csóva, ami csak isFetching alatt jelenik meg */}
            {isFetching && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 12,
                backgroundImage: `linear-gradient(110deg, transparent 30%, ${th.id === 'day' ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.1)'} 50%, transparent 70%)`,
                backgroundSize: '200% 100%',
                animation: 'skeleton-shimmer 1.5s linear infinite',
                zIndex: 10
              }} />
            )}
          </div>

          {/* Az alsó sáv is ghostol */}
          <div style={{ 
            display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${th.border}`,
            opacity: isFetching ? 0.4 : 1, transition: 'opacity 0.5s'
          }}>
            {[[th.w, 'Hőmérséklet (°C)'], [th.p, `Átlag (${avgT}°C)`]].map(([col, lbl]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 20, height: 2.5, background: col, borderRadius: 99 }} />
                <span style={{ ...ui, fontSize: 12, color: th.t2 }}>{lbl}</span>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', ...tech, fontSize: 11, color: th.t3 }}>
              {data.length} mérési pont · {displayRange === '1h' ? '15 perces' : displayRange === '1d' ? 'óránkénti' : displayRange === '1w' ? '6 órás' : 'napi'} felbontás
            </div>
          </div>
        </Card>

        {/* ... (Az alatta lévő export kártya és a jobb oldali oszlop ugyanaz marad, 
            csak megkapják az új displayRange változókat) ... */}
        
        <Card show={show} delay={260} t={th}>
          <Lbl t={th}>Adat Exportálás</Lbl>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
            <p style={{ ...ui, fontSize: 13, color: th.t2, margin: 0, flex: '1 1 200px', lineHeight: 1.5 }}>
              A <strong style={{ color: th.t1 }}>{rangeButtons.find(b => b.id === displayRange)?.label}</strong> időszak {data.length} mérési pontja tölthető le.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <FormatPill exportFormat={exportFormat} setExportFormat={setExportFormat} th={th} isFetching={isFetching} />
              <button onClick={handleExport} disabled={isFetching} style={{ padding: '10px 24px', background: th.p, color: '#FFFFFF', border: 'none', borderRadius: 10, fontWeight: 600, cursor: isFetching ? 'not-allowed' : 'pointer', ...ui, fontSize: 13, transition: 'all 0.3s', whiteSpace: 'nowrap', opacity: isFetching ? 0.6 : 1 }}>
                {isFetching ? '⏳ Előkészítés...' : '↓ Letöltés'}
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* ── JOBB OLDAL (4 oszlop): TREND + STATISZTIKA KÁRTYÁK ── */}
      <div className="gc4" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        <Card show={show} delay={140} t={th}>
          <Lbl t={th}>Trend & Változási Sebesség</Lbl>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, opacity: isFetching ? 0.4 : 1, transition: 'opacity 0.5s' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: ratePerHour >= -0.15 && ratePerHour <= 0.15 ? `${th.t3}22` : `${trendColor}22`,
              border: `1px solid ${ratePerHour >= -0.15 && ratePerHour <= 0.15 ? th.border : trendColor + '40'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 36, lineHeight: 1, color: trendColor, fontWeight: 700 }}>{trendArrow}</span>
            </div>
            <div>
              <div style={{ ...tech, fontSize: 28, fontWeight: 700, color: trendColor, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {trendDiff > 0 ? '+' : ''}{trendDiff}°C
              </div>
              <div style={{ ...ui, fontSize: 12, color: th.t2, marginTop: 4 }}>
                az előző {lookback}× {intervalLabels[displayRange]} óta
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${th.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: isFetching ? 0.4 : 1, transition: 'opacity 0.5s' }}>
            <div>
              <div style={{ ...ui, fontSize: 11, color: th.lbl, letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>Óránkénti ráta</div>
              <div style={{ ...tech, fontSize: 18, fontWeight: 600, color: trendColor }}>
                {ratePerHour > 0 ? '+' : ''}{ratePerHour} °C/h
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...ui, fontSize: 11, color: th.lbl, letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>Állapot</div>
              <div style={{ ...ui, fontSize: 13, fontWeight: 600, color: trendColor }}>{trendLabel}</div>
            </div>
          </div>
        </Card>

        <Card show={show} delay={200} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <Lbl t={th}>Statisztikák & Komfortindex</Lbl>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, opacity: isFetching ? 0.4 : 1, transition: 'opacity 0.5s' }}>
              {[
                { label: 'Minimum', value: `${minT}°C`, color: '#0EA5E9', icon: '▼' },
                { label: 'Maximum', value: `${maxT}°C`, color: '#EF4444', icon: '▲' },
                { label: 'Időszaki Átlag', value: `${avgT}°C`, color: th.t1, icon: '≈' },
                { label: 'Hőérzet', value: `${liveData.feelsLike}°C`, color: th.w, icon: '🌡' },
                { label: 'Harmatpont', value: `${liveData.dewPoint}°C`, color: th.p, icon: '💧' },
              ].map(({ label, value, color, icon }, i, arr) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '11px 0', borderBottom: i < arr.length - 1 ? `1px solid ${th.border}` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, width: 18, textAlign: 'center', color, flexShrink: 0 }}>{icon}</span>
                    <span style={{ ...ui, fontSize: 13, color: th.t2 }}>{label}</span>
                  </div>
                  <span style={{ ...tech, fontSize: 14, fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${th.border}`, opacity: isFetching ? 0.4 : 1, transition: 'opacity 0.5s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...ui, fontSize: 11, color: th.t3, marginBottom: 6 }}>
              <span>{minT}°C</span>
              <span style={{ color: th.t2 }}>Jelenlegi: {currentT}°C</span>
              <span>{maxT}°C</span>
            </div>
            <div style={{ height: 6, background: `${th.t3}30`, borderRadius: 99, position: 'relative', overflow: 'visible' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%', width: '100%', borderRadius: 99,
                background: `linear-gradient(90deg, ${th.w}40, ${th.w})`,
                transformOrigin: 'left',
                transform: `scaleX(${Math.max(0, Math.min(100, ((currentT - minT) / (maxT - minT)) * 100)) / 100})`,
                transition: 'transform 1.4s cubic-bezier(0.16,1,0.3,1) .4s',
                willChange: 'transform'
              }} />
              <div style={{
                position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none',
                transform: `translateX(${Math.max(0, Math.min(100, ((currentT - minT) / (maxT - minT)) * 100))}%)`,
                transition: 'transform 1.4s cubic-bezier(0.16,1,0.3,1) .4s',
                willChange: 'transform'
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translate(-50%,-50%)',
                  width: 12, height: 12, borderRadius: '50%',
                  background: th.id === 'day' ? '#fff' : th.t1, boxShadow: `0 0 10px rgba(0,0,0,0.5)`
                }} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </SensorLayout>
  );
}

/* ─────────────── HUMIDITY PAGE MOCK DATA ─────────────── */
const humData1h = Array.from({ length: 5 }, (_, i) => ({ t: `14:${String(i*15).padStart(2,'0')}`, hum: parseFloat((45 + i*1.2 + Math.random()).toFixed(1)) }));
const humData1d = Array.from({ length: 24 }, (_, i) => ({ t: `${String(i).padStart(2,'0')}:00`, hum: Math.round(55 + Math.sin(i * Math.PI / 12) * 20) }));
const humData1w = Array.from({ length: 28 }, (_, i) => ({ t: `Nap ${Math.floor(i/4)+1}`, hum: Math.round(50 + Math.cos(i * Math.PI / 14) * 15) }));
const humData1mo = Array.from({ length: 30 }, (_, i) => ({ t: `${i+1}.`, hum: Math.round(55 + Math.sin(i * Math.PI / 7) * 25) }));
const HUMIDITY_DATASETS = { '1h': humData1h, '1d': humData1d, '1w': humData1w, '1mo': humData1mo };

/* ═══════════════ HUMIDITY PAGE ═══════════════ */
function HumidityPage({ th, addToast, liveData }) {
  const [show, setShow] = useState(false);
  const [range, setRange] = useState('1d');
  const [activeBtn, setActiveBtn] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv'); // <-- Visszakerült a state!

  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 90);
    return () => clearTimeout(t);
  }, []);

  const { displayRange, isFetching, fadeStyle, cardFadeStyle, chartData } = useChartCrossfade(range, HUMIDITY_DATASETS);
  const data = chartData;
  const hums = data.map(d => d.hum);
  const minH = Math.min(...hums);
  const maxH = Math.max(...hums);
  const avgH = parseFloat((hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(1));
  const currentH = hums[hums.length - 1];

  const lookback = Math.min(3, hums.length - 1);
  const prevH = hums[hums.length - 1 - lookback];
  const trendDiff = parseFloat((currentH - prevH).toFixed(1));
  const intervalLabels = { '1h': '15p', '1d': 'ó', '1w': '6ó', '1mo': 'nap' };

  /* Meteorológiai trend skála: Páratartalom logikával */
  const intervalHours = { '1h': 0.25, '1d': 1, '1w': 6, '1mo': 24 };
  const ratePerHour = parseFloat((trendDiff / (lookback * intervalHours[displayRange])).toFixed(2));
  
  let trendColor, trendLabel, trendArrow;
  if (ratePerHour >= 2.0) { trendColor = '#0284C7'; trendLabel = 'Erős párásodás'; trendArrow = '⇡'; }
  else if (ratePerHour > 0.5) { trendColor = '#0EA5E9'; trendLabel = 'Párásodó'; trendArrow = '↑'; }
  else if (ratePerHour >= -0.5 && ratePerHour <= 0.5) { trendColor = th.t2; trendLabel = 'Stabil'; trendArrow = '→'; }
  else if (ratePerHour > -2.0) { trendColor = '#F59E0B'; trendLabel = 'Száradó'; trendArrow = '↓'; }
  else { trendColor = '#EA580C'; trendLabel = 'Erős száradás'; trendArrow = '⇣'; }

  /* Komfortindex logika */
  let comfortLabel, comfortColor;
  if (liveData.humidity < 30) { comfortLabel = 'Túl száraz'; comfortColor = '#EA580C'; }
  else if (liveData.humidity <= 60) { comfortLabel = 'Ideális'; comfortColor = '#10B981'; }
  else { comfortLabel = 'Fülledt / Magas'; comfortColor = '#0284C7'; }

  const rangeButtons = [
    { id: '1h', label: '1 Óra' },
    { id: '1d', label: '1 Nap' },
    { id: '1w', label: '1 Hét' },
    { id: '1mo', label: '1 Hónap' },
  ];

  /* Fájlgenerátor funkciók */
  const downloadCSV = () => {
    const rows = ['Időpont,Páratartalom (%)', ...data.map(d => `${d.t},${d.hum}`)].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `paratartalom_${displayRange}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportJSON = () => {
    const payload = { exportedAt: new Date().toISOString(), range: displayRange, unit: '%', records: data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `paratartalom_${displayRange}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportXML = () => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<telemetry>\n`;
    xml += `  <metadata>\n    <exportedAt>${new Date().toISOString()}</exportedAt>\n    <range>${displayRange}</range>\n    <unit>%</unit>\n  </metadata>\n`;
    xml += `  <records>\n`;
    data.forEach(d => {
      xml += `    <record>\n      <time>${d.t}</time>\n      <value>${d.hum}</value>\n    </record>\n`;
    });
    xml += `  </records>\n</telemetry>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `paratartalom_${displayRange}.xml`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Eredeti letöltés funkció visszarakva
  const handleExport = () => {
    if (exportFormat === 'csv') downloadCSV();
    else if (exportFormat === 'json') exportJSON();
    else if (exportFormat === 'xml') exportXML();
    
    addToast(`A(z) ${exportFormat.toUpperCase()} adatcsomag letöltése elindult.`);
  };

  const HumTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 16, padding: '10px 16px', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', backdropFilter: 'blur(20px)' }}>
        <div style={{ ...ui, fontSize: 11, color: th.lbl, fontWeight: 600, marginBottom: 6, letterSpacing: '.04em' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ ...tech, fontSize: 22, fontWeight: 700, color: th.p }}>{payload[0]?.value?.toFixed(1)}</span>
          <span style={{ ...ui, fontSize: 13, color: th.t2 }}>%</span>
        </div>
        {payload[0]?.value <= minH && <div style={{ ...ui, fontSize: 10, color: '#F59E0B', marginTop: 4 }}>▼ Minimum</div>}
        {payload[0]?.value >= maxH && <div style={{ ...ui, fontSize: 10, color: '#0284C7', marginTop: 4 }}>▲ Maximum</div>}
      </div>
    );
  };

  const btnStyle = (id) => ({
    padding: '5px 14px', borderRadius: 99, cursor: 'pointer',
    background: range === id ? (th.id === 'day' ? 'rgba(15,23,42,0.07)' : 'rgba(255,255,255,0.10)') : activeBtn === id ? (th.id === 'day' ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.04)') : 'transparent',
    border: range === id ? `1px solid ${th.border}` : '1px solid transparent',
    color: range === id ? th.p : th.t2,
    ...ui, fontSize: 12, fontWeight: range === id ? 600 : 400, transition: 'all 0.2s',
  });

  return (
    <SensorLayout title="Páratartalom" icon="💧" color={th.p} th={th} show={show}>

      {/* ── BAL OLDAL (8 oszlop): DIAGRAM + EXPORT KÁRTYA ── */}
      <div className="gc8" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* DIAGRAM KÁRTYA */}
        <Card show={show} delay={80} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 380 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <Lbl t={th}>Páratartalom Idősora</Lbl>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ ...tech, fontSize: 38, fontWeight: 700, color: th.p, letterSpacing: '-0.03em', lineHeight: 1 }}>{liveData.humidity}</span>
                <span style={{ ...ui, fontSize: 16, color: th.t2, fontWeight: 400 }}>%</span>
                <span style={{ ...ui, fontSize: 12, color: trendColor, fontWeight: 600, marginLeft: 4 }}>
                  {trendArrow} {trendLabel}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {rangeButtons.map(({ id, label }) => (
                <button key={id} style={btnStyle(id)} onClick={() => setRange(id)} onMouseEnter={() => setActiveBtn(id)} onMouseLeave={() => setActiveBtn(null)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Ghosting effekt: elmosódás + szürkítés + fénycsóva, mint a Hőmérséklet oldalon */}
          <div style={{ flex: 1, width: '100%', minHeight: 280, position: 'relative', ...fadeStyle }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart key={displayRange} data={data} margin={{ top: 8, right: 28, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gHumFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={th.p} stopOpacity={0.25} />
                    <stop offset="70%" stopColor={th.p} stopOpacity={0.05} />
                    <stop offset="100%" stopColor={th.p} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4" stroke={`${th.t2}15`} vertical={false} />
                <XAxis dataKey="t" tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip content={<HumTip />} cursor={{ stroke: `${th.p}40`, strokeWidth: 1.5, strokeDasharray: '4 3' }} />
                <Area type="monotone" dataKey="hum" stroke={th.p} strokeWidth={2.5} fill="url(#gHumFill)" dot={false} activeDot={{ r: 5, fill: th.p, stroke: th.id === 'day' ? '#fff' : '#0a1426', strokeWidth: 2 }} />
                <ReferenceLine y={avgH} stroke={`${th.t2}60`} strokeDasharray="6 4" strokeWidth={1.5}
                  label={(p) => <RefLineTag viewBox={p.viewBox} text={`Átl. ${avgH}%`} color={th.t2} th={th} />} />
              </AreaChart>
            </ResponsiveContainer>
            <ChartGhostShimmer th={th} isFetching={isFetching} />
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${th.border}`, opacity: isFetching ? 0.4 : 1, transition: 'opacity 0.5s' }}>
            {[[th.p, 'Relatív Páratartalom (%)']].map(([col, lbl]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 20, height: 2.5, background: col, borderRadius: 99 }} />
                <span style={{ ...ui, fontSize: 12, color: th.t2 }}>{lbl}</span>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', ...tech, fontSize: 11, color: th.t3 }}>
              {data.length} mérési pont · {displayRange === '1h' ? '15 perces' : displayRange === '1d' ? 'óránkénti' : displayRange === '1w' ? '6 órás' : 'napi'} felbontás
            </div>
          </div>
        </Card>

        {/* EXPORT KÁRTYA */}
        <Card show={show} delay={260} t={th}>
          <Lbl t={th}>Adat Exportálás</Lbl>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
            <p style={{ ...ui, fontSize: 13, color: th.t2, margin: 0, flex: '1 1 200px', lineHeight: 1.5 }}>
              A <strong style={{ color: th.t1 }}>{rangeButtons.find(b => b.id === displayRange)?.label}</strong> időszak {data.length} mérési pontja tölthető le.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <FormatPill exportFormat={exportFormat} setExportFormat={setExportFormat} th={th} isFetching={isFetching} />
              <button onClick={handleExport} disabled={isFetching} style={{ padding: '10px 24px', background: th.p, color: '#FFFFFF', border: 'none', borderRadius: 10, fontWeight: 600, cursor: isFetching ? 'not-allowed' : 'pointer', ...ui, fontSize: 13, transition: 'all 0.3s', whiteSpace: 'nowrap', opacity: isFetching ? 0.6 : 1 }}>
                {isFetching ? '⏳ Előkészítés...' : '↓ Letöltés'}
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* ── JOBB OLDAL (4 oszlop): TREND + STATISZTIKA ── */}
      <div className="gc4" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        <Card show={show} delay={140} t={th}>
          <Lbl t={th}>Trend & Változási Sebesség</Lbl>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, ...cardFadeStyle }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: ratePerHour >= -0.5 && ratePerHour <= 0.5 ? `${th.t3}22` : `${trendColor}22`,
              border: `1px solid ${ratePerHour >= -0.5 && ratePerHour <= 0.5 ? th.border : trendColor + '40'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 36, lineHeight: 1, color: trendColor, fontWeight: 700 }}>{trendArrow}</span>
            </div>
            <div>
              <div style={{ ...tech, fontSize: 28, fontWeight: 700, color: trendColor, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {trendDiff > 0 ? '+' : ''}{trendDiff}%
              </div>
              <div style={{ ...ui, fontSize: 12, color: th.t2, marginTop: 4 }}>
                az előző {lookback}× {intervalLabels[displayRange]} óta
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${th.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...cardFadeStyle }}>
            <div>
              <div style={{ ...ui, fontSize: 11, color: th.lbl, letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>Óránkénti ráta</div>
              <div style={{ ...tech, fontSize: 18, fontWeight: 600, color: trendColor }}>
                {ratePerHour > 0 ? '+' : ''}{ratePerHour} %/h
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...ui, fontSize: 11, color: th.lbl, letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>Állapot</div>
              <div style={{ ...ui, fontSize: 13, fontWeight: 600, color: trendColor }}>{trendLabel}</div>
            </div>
          </div>
        </Card>

        <Card show={show} delay={200} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <Lbl t={th}>Statisztikák & Levegőminőség</Lbl>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, ...cardFadeStyle }}>
              {[
                { label: 'Minimum (Időszak)', value: `${minH}%`, color: th.t1, icon: '▼' },
                { label: 'Maximum (Időszak)', value: `${maxH}%`, color: th.t1, icon: '▲' },
                { label: 'Komfortérzet', value: comfortLabel, color: comfortColor, icon: '☺' },
                { label: 'Harmatpont', value: `${liveData.dewPoint}°C`, color: th.p, icon: '💧' },
              ].map(({ label, value, color, icon }, i, arr) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '11px 0', borderBottom: i < arr.length - 1 ? `1px solid ${th.border}` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, width: 18, textAlign: 'center', color, flexShrink: 0 }}>{icon}</span>
                    <span style={{ ...ui, fontSize: 13, color: th.t2 }}>{label}</span>
                  </div>
                  <span style={{ ...tech, fontSize: 14, fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${th.border}`, ...cardFadeStyle }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...ui, fontSize: 11, color: th.t3, marginBottom: 6 }}>
              <span>0% (Száraz)</span>
              <span style={{ color: th.t2 }}>Jelenlegi: {liveData.humidity}%</span>
              <span>100% (Nedves)</span>
            </div>
            <div style={{ height: 6, background: `${th.t3}30`, borderRadius: 99, position: 'relative', overflow: 'visible' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%', width: '100%', borderRadius: 99,
                background: `linear-gradient(90deg, #F59E0B, #10B981, #0284C7)`,
                transformOrigin: 'left',
                transform: `scaleX(${Math.max(0, Math.min(100, liveData.humidity)) / 100})`,
                transition: 'transform 1.4s cubic-bezier(0.16,1,0.3,1) .4s',
                willChange: 'transform'
              }} />
              <div style={{
                position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none',
                transform: `translateX(${Math.max(0, Math.min(100, liveData.humidity))}%)`,
                transition: 'transform 1.4s cubic-bezier(0.16,1,0.3,1) .4s',
                willChange: 'transform'
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translate(-50%,-50%)',
                  width: 12, height: 12, borderRadius: '50%',
                  background: th.id === 'day' ? '#fff' : th.t1, boxShadow: `0 0 10px rgba(0,0,0,0.5)`
                }} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </SensorLayout>
  );
}

/* ─────────────── PRESSURE PAGE MOCK DATA ─────────────── */
const presData1h = Array.from({ length: 5 }, (_, i) => ({ t: `14:${String(i*15).padStart(2,'0')}`, pres: parseFloat((1012.5 + i*0.1 + (Math.random()*0.2 - 0.1)).toFixed(1)) }));
const presData1d = Array.from({ length: 24 }, (_, i) => ({ t: `${String(i).padStart(2,'0')}:00`, pres: parseFloat((1015 + Math.sin(i * Math.PI / 12) * 4).toFixed(1)) }));
const presData1w = Array.from({ length: 28 }, (_, i) => ({ t: `Nap ${Math.floor(i/4)+1}`, pres: parseFloat((1008 + Math.cos(i * Math.PI / 14) * 12).toFixed(1)) }));
const presData1mo = Array.from({ length: 30 }, (_, i) => ({ t: `${i+1}.`, pres: parseFloat((1010 + Math.sin(i * Math.PI / 7) * 18).toFixed(1)) }));
const PRESSURE_DATASETS = { '1h': presData1h, '1d': presData1d, '1w': presData1w, '1mo': presData1mo };

/* ═══════════════ PRESSURE PAGE ═══════════════ */
function PressurePage({ th, addToast, liveData }) {
  const [show, setShow] = useState(false);
  const [range, setRange] = useState('1d');
  const [activeBtn, setActiveBtn] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');

  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 90);
    return () => clearTimeout(t);
  }, []);

  const { displayRange, isFetching, fadeStyle, cardFadeStyle, chartData } = useChartCrossfade(range, PRESSURE_DATASETS);
  const data = chartData;
  const press = data.map(d => d.pres);
  const minP = Math.min(...press);
  const maxP = Math.max(...press);
  const avgP = parseFloat((press.reduce((a, b) => a + b, 0) / press.length).toFixed(1));
  const currentP = press[press.length - 1];

  const lookback = Math.min(3, press.length - 1);
  const prevP = press[press.length - 1 - lookback];
  const trendDiff = parseFloat((currentP - prevP).toFixed(1));
  const intervalLabels = { '1h': '15p', '1d': 'ó', '1w': '6ó', '1mo': 'nap' };

  /* Meteorológiai trend skála: Légnyomás (Barométer) logikával */
  const intervalHours = { '1h': 0.25, '1d': 1, '1w': 6, '1mo': 24 };
  const ratePerHour = parseFloat((trendDiff / (lookback * intervalHours[displayRange])).toFixed(2));
  
  let trendColor, trendLabel, trendArrow;
  if (ratePerHour >= 1.0) { trendColor = '#10B981'; trendLabel = 'Gyorsan javuló idő'; trendArrow = '⇡'; }
  else if (ratePerHour > 0.2) { trendColor = '#34D399'; trendLabel = 'Javuló'; trendArrow = '↑'; }
  else if (ratePerHour >= -0.2 && ratePerHour <= 0.2) { trendColor = th.t2; trendLabel = 'Változatlan'; trendArrow = '→'; }
  else if (ratePerHour > -1.0) { trendColor = '#F59E0B'; trendLabel = 'Romló'; trendArrow = '↓'; }
  else { trendColor = '#EF4444'; trendLabel = 'Vihar közeledik!'; trendArrow = '⇣'; }

  /* Időjárási helyzet (Ciklon/Anticiklon) */
  let weatherPrediction, weatherIcon, weatherColor;
  if (liveData.pressure > 1020) { weatherPrediction = 'Anticiklon (Tiszta)'; weatherIcon = '☀'; weatherColor = '#FBBF24'; }
  else if (liveData.pressure >= 1005) { weatherPrediction = 'Változó'; weatherIcon = '⛅'; weatherColor = th.t1; }
  else { weatherPrediction = 'Ciklon (Csapadékos)'; weatherIcon = '🌧'; weatherColor = '#0EA5E9'; }

  const rangeButtons = [
    { id: '1h', label: '1 Óra' },
    { id: '1d', label: '1 Nap' },
    { id: '1w', label: '1 Hét' },
    { id: '1mo', label: '1 Hónap' },
  ];

  /* Fájlgenerátor funkciók */
  const downloadCSV = () => {
    const rows = ['Időpont,Légnyomás (hPa)', ...data.map(d => `${d.t},${d.pres}`)].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `legnyomas_${displayRange}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportJSON = () => {
    const payload = { exportedAt: new Date().toISOString(), range: displayRange, unit: 'hPa', records: data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `legnyomas_${displayRange}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportXML = () => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<telemetry>\n`;
    xml += `  <metadata>\n    <exportedAt>${new Date().toISOString()}</exportedAt>\n    <range>${displayRange}</range>\n    <unit>hPa</unit>\n  </metadata>\n`;
    xml += `  <records>\n`;
    data.forEach(d => {
      xml += `    <record>\n      <time>${d.t}</time>\n      <value>${d.pres}</value>\n    </record>\n`;
    });
    xml += `  </records>\n</telemetry>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `legnyomas_${displayRange}.xml`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExport = () => {
    if (exportFormat === 'csv') downloadCSV();
    else if (exportFormat === 'json') exportJSON();
    else if (exportFormat === 'xml') exportXML();
    
    addToast(`A(z) ${exportFormat.toUpperCase()} adatcsomag letöltése elindult.`);
  };

  const PresTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 16, padding: '10px 16px', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', backdropFilter: 'blur(20px)' }}>
        <div style={{ ...ui, fontSize: 11, color: th.lbl, fontWeight: 600, marginBottom: 6, letterSpacing: '.04em' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ ...tech, fontSize: 22, fontWeight: 700, color: th.v }}>{payload[0]?.value?.toFixed(1)}</span>
          <span style={{ ...ui, fontSize: 13, color: th.t2 }}>hPa</span>
        </div>
        {payload[0]?.value <= minP && <div style={{ ...ui, fontSize: 10, color: '#EF4444', marginTop: 4 }}>▼ Helyi Minimum</div>}
        {payload[0]?.value >= maxP && <div style={{ ...ui, fontSize: 10, color: '#10B981', marginTop: 4 }}>▲ Helyi Maximum</div>}
      </div>
    );
  };

  const btnStyle = (id) => ({
    padding: '5px 14px', borderRadius: 99, cursor: 'pointer',
    background: range === id ? (th.id === 'day' ? 'rgba(15,23,42,0.07)' : 'rgba(255,255,255,0.10)') : activeBtn === id ? (th.id === 'day' ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.04)') : 'transparent',
    border: range === id ? `1px solid ${th.border}` : '1px solid transparent',
    color: range === id ? th.v : th.t2,
    ...ui, fontSize: 12, fontWeight: range === id ? 600 : 400, transition: 'all 0.2s',
  });

  return (
    <SensorLayout title="Légnyomás" icon="◎" color={th.v} th={th} show={show}>

      {/* ── BAL OLDAL (8 oszlop): DIAGRAM + EXPORT KÁRTYA ── */}
      <div className="gc8" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* DIAGRAM KÁRTYA */}
        <Card show={show} delay={80} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 380 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <Lbl t={th}>Barometrikus Idősor</Lbl>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ ...tech, fontSize: 38, fontWeight: 700, color: th.v, letterSpacing: '-0.03em', lineHeight: 1 }}>{liveData.pressure.toFixed(1)}</span>
                <span style={{ ...ui, fontSize: 16, color: th.t2, fontWeight: 400 }}>hPa</span>
                <span style={{ ...ui, fontSize: 12, color: trendColor, fontWeight: 600, marginLeft: 4 }}>
                  {trendArrow} {trendLabel}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {rangeButtons.map(({ id, label }) => (
                <button key={id} style={btnStyle(id)} onClick={() => setRange(id)} onMouseEnter={() => setActiveBtn(id)} onMouseLeave={() => setActiveBtn(null)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, width: '100%', minHeight: 280, position: 'relative', ...fadeStyle }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart key={displayRange} data={data} margin={{ top: 8, right: 28, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gPresFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={th.v} stopOpacity={0.25} />
                    <stop offset="70%" stopColor={th.v} stopOpacity={0.05} />
                    <stop offset="100%" stopColor={th.v} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4" stroke={`${th.t2}15`} vertical={false} />
                <XAxis dataKey="t" tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} domain={[Math.floor(minP - 2), Math.ceil(maxP + 2)]} tickFormatter={v => `${v}`} />
                <Tooltip content={<PresTip />} cursor={{ stroke: `${th.v}40`, strokeWidth: 1.5, strokeDasharray: '4 3' }} />
                <Area type="monotone" dataKey="pres" stroke={th.v} strokeWidth={2.5} fill="url(#gPresFill)" dot={false} activeDot={{ r: 5, fill: th.v, stroke: th.id === 'day' ? '#fff' : '#0a1426', strokeWidth: 2 }} />
                <ReferenceLine y={avgP} stroke={`${th.t2}60`} strokeDasharray="6 4" strokeWidth={1.5}
                  label={(p) => <RefLineTag viewBox={p.viewBox} text={`Átl. ${avgP}`} color={th.t2} th={th} />} />
              </AreaChart>
            </ResponsiveContainer>
            <ChartGhostShimmer th={th} isFetching={isFetching} />
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${th.border}`, opacity: isFetching ? 0.4 : 1, transition: 'opacity 0.5s' }}>
            {[[th.v, 'Abszolút Légnyomás (hPa)']].map(([col, lbl]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 20, height: 2.5, background: col, borderRadius: 99 }} />
                <span style={{ ...ui, fontSize: 12, color: th.t2 }}>{lbl}</span>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', ...tech, fontSize: 11, color: th.t3 }}>
              {data.length} mérési pont · {displayRange === '1h' ? '15 perces' : displayRange === '1d' ? 'óránkénti' : displayRange === '1w' ? '6 órás' : 'napi'} felbontás
            </div>
          </div>
        </Card>

        {/* EXPORT KÁRTYA */}
        <Card show={show} delay={260} t={th}>
          <Lbl t={th}>Adat Exportálás</Lbl>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
            <p style={{ ...ui, fontSize: 13, color: th.t2, margin: 0, flex: '1 1 200px', lineHeight: 1.5 }}>
              A <strong style={{ color: th.t1 }}>{rangeButtons.find(b => b.id === displayRange)?.label}</strong> időszak {data.length} mérési pontja tölthető le.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <FormatPill exportFormat={exportFormat} setExportFormat={setExportFormat} th={th} isFetching={isFetching} />
              <button onClick={handleExport} disabled={isFetching} style={{ padding: '10px 24px', background: th.v, color: '#FFFFFF', border: 'none', borderRadius: 10, fontWeight: 600, cursor: isFetching ? 'not-allowed' : 'pointer', ...ui, fontSize: 13, transition: 'all 0.3s', whiteSpace: 'nowrap', opacity: isFetching ? 0.6 : 1 }}>
                {isFetching ? '⏳ Előkészítés...' : '↓ Letöltés'}
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* ── JOBB OLDAL (4 oszlop): TREND + STATISZTIKA ── */}
      <div className="gc4" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        <Card show={show} delay={140} t={th}>
          <Lbl t={th}>Barometrikus Trend</Lbl>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, ...cardFadeStyle }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: ratePerHour >= -0.2 && ratePerHour <= 0.2 ? `${th.t3}22` : `${trendColor}22`,
              border: `1px solid ${ratePerHour >= -0.2 && ratePerHour <= 0.2 ? th.border : trendColor + '40'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 36, lineHeight: 1, color: trendColor, fontWeight: 700 }}>{trendArrow}</span>
            </div>
            <div>
              <div style={{ ...tech, fontSize: 28, fontWeight: 700, color: trendColor, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {trendDiff > 0 ? '+' : ''}{trendDiff}
              </div>
              <div style={{ ...ui, fontSize: 12, color: th.t2, marginTop: 4 }}>
                az előző {lookback}× {intervalLabels[displayRange]} óta
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${th.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...cardFadeStyle }}>
            <div>
              <div style={{ ...ui, fontSize: 11, color: th.lbl, letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>Óránkénti ráta</div>
              <div style={{ ...tech, fontSize: 18, fontWeight: 600, color: trendColor }}>
                {ratePerHour > 0 ? '+' : ''}{ratePerHour} hPa/h
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...ui, fontSize: 11, color: th.lbl, letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>Előrejelzés</div>
              <div style={{ ...ui, fontSize: 13, fontWeight: 600, color: trendColor }}>{trendLabel}</div>
            </div>
          </div>
        </Card>

        <Card show={show} delay={200} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <Lbl t={th}>Statisztikák & Időjelzés</Lbl>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, ...cardFadeStyle }}>
              {[
                { label: 'Helyi Minimum', value: `${minP} hPa`, color: th.t1, icon: '▼' },
                { label: 'Helyi Maximum', value: `${maxP} hPa`, color: th.t1, icon: '▲' },
                { label: 'Időszaki Átlag', value: `${avgP} hPa`, color: th.t1, icon: '≈' },
                { label: 'Időjárási Helyzet', value: weatherPrediction, color: weatherColor, icon: weatherIcon },
              ].map(({ label, value, color, icon }, i, arr) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '11px 0', borderBottom: i < arr.length - 1 ? `1px solid ${th.border}` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, width: 18, textAlign: 'center', color, flexShrink: 0 }}>{icon}</span>
                    <span style={{ ...ui, fontSize: 13, color: th.t2 }}>{label}</span>
                  </div>
                  <span style={{ ...tech, fontSize: 14, fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${th.border}`, ...cardFadeStyle }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...ui, fontSize: 11, color: th.t3, marginBottom: 6 }}>
              <span>Ciklon (990)</span>
              <span style={{ color: th.t2 }}>Jelenlegi: {liveData.pressure.toFixed(1)}</span>
              <span>Anticiklon (1030)</span>
            </div>
            <div style={{ height: 6, background: `${th.t3}30`, borderRadius: 99, position: 'relative', overflow: 'visible' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%', width: '100%', borderRadius: 99,
                background: `linear-gradient(90deg, #0EA5E9, #10B981, #FBBF24)`,
                transformOrigin: 'left',
                transform: `scaleX(${Math.max(0, Math.min(100, ((liveData.pressure - 990) / (1030 - 990)) * 100)) / 100})`,
                transition: 'transform 1.4s cubic-bezier(0.16,1,0.3,1) .4s',
                willChange: 'transform'
              }} />
              <div style={{
                position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none',
                transform: `translateX(${Math.max(0, Math.min(100, ((liveData.pressure - 990) / (1030 - 990)) * 100))}%)`,
                transition: 'transform 1.4s cubic-bezier(0.16,1,0.3,1) .4s',
                willChange: 'transform'
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translate(-50%,-50%)',
                  width: 12, height: 12, borderRadius: '50%',
                  background: th.id === 'day' ? '#fff' : th.t1, boxShadow: `0 0 10px rgba(0,0,0,0.5)`
                }} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </SensorLayout>
  );
}


/* ─────────────── BRIGHTNESS & UV PAGE MOCK DATA ─────────────── */
const genLightData = () => {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Nappali/éjszakai szimuláció a lux és UV adatokhoz
  const getLuxAndUV = (h, randomFactor = 0.5) => {
    if (h < 5 || h > 19) return { lux: 0, uv: 0 };
    if (h >= 5 && h < 8) return { lux: 2000 + randomFactor * 2000, uv: 0.5 + randomFactor };
    if (h >= 18 && h <= 19) return { lux: 1500 + randomFactor * 1000, uv: 0.3 + randomFactor * 0.5 };
    // Csúcsidő
    const peakFactor = 1 - Math.abs(h - 13) / 6; // 13:00 a csúcs
    return { 
      lux: Math.round(peakFactor * 80000 + randomFactor * 10000), 
      uv: parseFloat((peakFactor * 9 + randomFactor * 2).toFixed(1)) 
    };
  };

  // 1 órás nézet (15 perces bontás) - aktuális óra körül
  const data1h = Array.from({ length: 5 }, (_, i) => {
    const h = currentHour;
    const vals = getLuxAndUV(h, i * 0.15); // Finom átmenetes zaj
    return { t: `${h}:${String(i*15).padStart(2,'0')}`, lux: vals.lux, uv: vals.uv };
  });

  // 1 napos nézet (óránként)
  const data1d = Array.from({ length: 24 }, (_, i) => {
    // Szinusz hullámmal generálunk szép, stabil ívet a véletlen zaj helyett
    const noise = Math.abs(Math.sin(i * 1.5));
    const vals = getLuxAndUV(i, noise);
    return { t: `${String(i).padStart(2,'0')}:00`, lux: vals.lux, uv: vals.uv };
  });

  // Determinisztikus "időjárási" felhőzet minta a napi csúcsokhoz (30 napra)
  // 1.0 = tiszta égbolt (maximális UV), 0.3 = nagyon felhős/viharos (alacsony UV)
  const cloudPattern = [
    1.0, 0.9, 0.4, 0.3, 0.8, 1.0, 1.0, 0.9, 0.6, 0.2,
    0.5, 1.0, 1.0, 1.0, 0.8, 0.4, 0.7, 1.0, 0.9, 1.0,
    1.0, 0.8, 0.5, 0.9, 1.0, 1.0, 0.3, 0.6, 1.0, 1.0
  ];

  const getDailyPeak = (dayIndex) => {
    const base = getLuxAndUV(13, 0.5); // Napi maximum a 13:00-ás, déli értékből
    const cloudy = cloudPattern[dayIndex]; // A konkrét naphoz tartozó felhősödés
    return {
      lux: Math.round(base.lux * cloudy),
      uv: parseFloat((base.uv * cloudy).toFixed(1))
    };
  };

  const _DAY_LBL = ['H','K','Sze','Cs','P','Szo','V'];

  // 1 hetes nézet (Már csak NAPI 1 ÉRTÉK, a napi maximum)
  const data1w = Array.from({ length: 7 }, (_, i) => {
    // A heti nézet a 30 napos "hónap" utolsó 7 napját mutatja (23-tól 29-es indexig)
    // Így a heti grafikon pontról pontra megegyezik a havi grafikon végével!
    const vals = getDailyPeak(23 + i);
    return { t: _DAY_LBL[i], lux: vals.lux, uv: vals.uv };
  });

  // 1 havi nézet (NAPI 1 ÉRTÉK, a napi maximum)
  const data1mo = Array.from({ length: 30 }, (_, i) => {
    const vals = getDailyPeak(i);
    return { t: `${i+1}.`, lux: vals.lux, uv: vals.uv };
  });

  return { '1h': data1h, '1d': data1d, '1w': data1w, '1mo': data1mo };
};

const BRIGHTNESS_DATASETS = genLightData();

/* ─── GLOBÁLIS UV INDEX LOGIKA (WHO Standard) ─── */
const getUvInfo = (val) => {
  if (val < 3) return { color: '#10B981', label: 'Alacsony', time: 'Nincs korlát', advice: 'Biztonságos kint tartózkodni.' };
  if (val < 6) return { color: '#FBBF24', label: 'Mérsékelt', time: '~45 perc', advice: 'Déli órákban árnyék keresése javasolt.' };
  if (val < 8) return { color: '#F97316', label: 'Magas', time: '~30 perc', advice: 'Fényvédelem (kalap, naptej) kötelező!' };
  if (val < 11) return { color: '#EF4444', label: 'Nagyon Magas', time: '~15 perc', advice: 'Kerüld a napot 11:00 és 15:00 között!' };
  return { color: '#8B5CF6', label: 'Extrém', time: '< 10 perc', advice: 'Maradj beltérben! Azonnali leégésveszély.' };
};

/* ═══════════════ BRIGHTNESS & UV PAGE (GÖRGETŐS NÉZET + DINAMIKUS ÉGI ÍV) ═══════════════ */
function BrightnessPage({ th, addToast, liveData }) {
  const [show, setShow] = useState(false);
  const [range, setRange] = useState('1d');
  const [activeBtn, setActiveBtn] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');

  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 90);
    return () => clearTimeout(t);
  }, []);

  const { displayRange, isFetching, fadeStyle, cardFadeStyle, chartData } = useChartCrossfade(range, BRIGHTNESS_DATASETS);
  const data = chartData;
  const luxs = data.map(d => d.lux);
  const uvs = data.map(d => d.uv);
  
  const currentLux = luxs[luxs.length - 1];
  const currentUV = uvs[uvs.length - 1];
  const maxLux = Math.max(...luxs);
  const maxUV = Math.max(...uvs);

  const rangeButtons = [
    { id: '1h', label: '1 Óra' },
    { id: '1d', label: '1 Nap' },
    { id: '1w', label: '1 Hét' },
    { id: '1mo', label: '1 Hónap' },
  ];

  //* ─── UV INDEX ÉS BŐRTÍPUS LOGIKA ─── */
  const cUV = getUvInfo(currentUV);

  const calcBurnTime = (uvi, factor) => {
    if (uvi <= 1) return 'Nincs';
    const mins = Math.round((150 / uvi) * factor);
    return mins > 120 ? '>2 óra' : `${mins} perc`;
  };
  const burnLight = calcBurnTime(currentUV, 0.8);  
  const burnMedium = calcBurnTime(currentUV, 1.8); 
  const burnDark = calcBurnTime(currentUV, 4.0);   

  const protectionIcons = [
    { icon: '🕶️', label: 'Szemüveg', active: currentUV >= 3 },
    { icon: '🧴', label: 'Naptej', active: currentUV >= 3 },
    { icon: '🧢', label: 'Kalap', active: currentUV >= 6 },
    { icon: '⛱️', label: 'Árnyék', active: currentUV >= 8 }
  ];

  /* ─── FÉNYERŐ, ÉGBOLT ÉS FELHŐZET LOGIKA ─── */
  const now = new Date();
  const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
  const { sunrise: sunriseTime, sunset: sunsetTime } = getSunTimes(new Date()); // ← IDE KERÜLT FEL

  
  const dayLength = sunsetTime - sunriseTime;
  const expectedMaxLux = Math.max(0, Math.sin(((currentHourDecimal - sunriseTime) / dayLength) * Math.PI) * 100000);
  
  let skyCondition, skyIcon, cloudCoverPct;
  if (expectedMaxLux < 1000) {
    skyCondition = 'Éjszaka / Sötét'; skyIcon = '🌙';
    cloudCoverPct = 15; // Éjszakai becslés
  } else {
    // Kiszámoljuk a felhőzetet: a jelenlegi fényerő és az elvárt max fényerő arányából
    const cloudRatio = currentLux / expectedMaxLux;
    cloudCoverPct = Math.max(0, Math.min(100, Math.round((1 - cloudRatio) * 100)));
    
    if (cloudCoverPct < 20) { skyCondition = 'Derült, napos'; skyIcon = '☀️'; }
    else if (cloudCoverPct < 60) { skyCondition = 'Változóan felhős'; skyIcon = '⛅'; }
    else { skyCondition = 'Erősen borult'; skyIcon = '☁️'; }
  }

  /* ─── 🌟 DINAMIKUS ÉJSZAKAI / NAPPALI ÍV MATEMATIKA ─── */
  const isDay = currentHourDecimal >= sunriseTime && currentHourDecimal < sunsetTime;
  
  let progress, leftLabel, rightLabel, leftSub, rightSub, bodyColor, glowColor;

  if (isDay) {
    // Nappali mód
    progress = (currentHourDecimal - sunriseTime) / (sunsetTime - sunriseTime);
    leftLabel = formatDecimalHour(sunriseTime); rightLabel = formatDecimalHour(sunsetTime);
    leftSub = "Napkelte"; rightSub = "Napnyugta";
    
    // Golden hour színezés
    if (progress < 0.1 || progress > 0.9) { bodyColor = '#F97316'; glowColor = '#F97316'; } // Mély narancs
    else if (progress < 0.2 || progress > 0.8) { bodyColor = '#F59E0B'; glowColor = '#F59E0B'; } // Arany/Sárga
    else { bodyColor = '#FEF08A'; glowColor = '#FDE047'; } // Ragyogó fehér-sárga (Zenit)
  } else {
    // Éjszakai mód
    const nightDuration = (24 - sunsetTime) + sunriseTime;
    const elapsedNight = currentHourDecimal >= sunsetTime 
      ? currentHourDecimal - sunsetTime 
      : (24 - sunsetTime) + currentHourDecimal;
    progress = elapsedNight / nightDuration;
    
    leftLabel = formatDecimalHour(sunsetTime); rightLabel = formatDecimalHour(sunriseTime);
    leftSub = "Napnyugta"; rightSub = "Napkelte";
    
    // Éjszakai Hold színek
    bodyColor = '#BAE6FD'; glowColor = '#38BDF8';
  }

  // Időtartamok kiszámolása (Naphossz és Hátralévő idő)
  const daylightHoursLength = Math.floor(sunsetTime - sunriseTime);
  const daylightMinsLength = Math.round(((sunsetTime - sunriseTime) % 1) * 60);

  let timeLabel, timeHours, timeMins;
  if (isDay) {
    const rem = sunsetTime - currentHourDecimal;
    timeLabel = "Hátralévő nappal";
    timeHours = Math.floor(rem);
    timeMins = Math.round((rem % 1) * 60);
  } else {
    // Éjszaka kiszámoljuk mennyi idő van még a holnapi napkeltéig
    const rem = currentHourDecimal >= sunsetTime ? (24 - currentHourDecimal) + sunriseTime : sunriseTime - currentHourDecimal;
    timeLabel = "Következő napkelte";
    timeHours = Math.floor(rem);
    timeMins = Math.round((rem % 1) * 60);
  }

  // Biztonsági korlátok az SVG-hez
  progress = Math.max(0, Math.min(1, progress));
  
  // Szög és koordináták kiszámítása az SVG félkörívhez (Ellipszis)
  const sunAngle = Math.PI - (progress * Math.PI);
  const cx = 150, cy = 110, rx = 100, ry = 80;
  const pathX = cx + rx * Math.cos(sunAngle);
  const pathY = cy - ry * Math.sin(sunAngle);

  /* ─── FÁJL GENERÁTOROK ÉS TOOLTIPEK ─── */
  const downloadCSV = () => {
    const rows = ['Időpont,Fényerő (Lux),UV Index', ...data.map(d => `${d.t},${d.lux},${d.uv}`)].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `feny_uv_${displayRange}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportJSON = () => {
    const payload = { exportedAt: new Date().toISOString(), range: displayRange, records: data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `feny_uv_${displayRange}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportXML = () => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<telemetry>\n`;
    xml += `  <metadata>\n    <exportedAt>${new Date().toISOString()}</exportedAt>\n    <range>${displayRange}</range>\n  </metadata>\n`;
    xml += `  <records>\n`;
    data.forEach(d => {
      xml += `    <record>\n      <time>${d.t}</time>\n      <lux>${d.lux}</lux>\n      <uv>${d.uv}</uv>\n    </record>\n`;
    });
    xml += `  </records>\n</telemetry>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `feny_uv_${displayRange}.xml`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExport = () => {
    if (exportFormat === 'csv') downloadCSV();
    else if (exportFormat === 'json') exportJSON();
    else if (exportFormat === 'xml') exportXML();
    addToast(`A(z) ${exportFormat.toUpperCase()} adatcsomag letöltése elindult.`);
  };

  const LuxTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 16, padding: '10px 16px', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', backdropFilter: 'blur(20px)' }}>
        <div style={{ ...ui, fontSize: 11, color: th.lbl, fontWeight: 600, marginBottom: 6 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ ...tech, fontSize: 22, fontWeight: 700, color: th.w }}>{payload[0]?.value?.toLocaleString('hu-HU')}</span>
          <span style={{ ...ui, fontSize: 13, color: th.t2 }}>Lux</span>
        </div>
      </div>
    );
  };

  const UVTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const val = payload[0].value;
    const info = getUvInfo(val);
    return (
      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 16, padding: '10px 16px', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', backdropFilter: 'blur(20px)' }}>
        <div style={{ ...ui, fontSize: 11, color: th.lbl, fontWeight: 600, marginBottom: 6 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ ...tech, fontSize: 22, fontWeight: 700, color: info.color }}>{val?.toFixed(1)}</span>
          <span style={{ ...ui, fontSize: 13, color: th.t2 }}>UVI</span>
        </div>
        <div style={{ ...ui, fontSize: 10, color: info.color, marginTop: 4, fontWeight: 600 }}>{info.label}</div>
      </div>
    );
  };

  const btnStyle = (id, baseColor) => ({
    padding: '5px 14px', borderRadius: 99, cursor: 'pointer',
    background: range === id ? (th.id === 'day' ? 'rgba(15,23,42,0.07)' : 'rgba(255,255,255,0.10)') : activeBtn === id ? (th.id === 'day' ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.04)') : 'transparent',
    border: range === id ? `1px solid ${th.border}` : '1px solid transparent',
    color: range === id ? baseColor : th.t2,
    ...ui, fontSize: 12, fontWeight: range === id ? 600 : 400, transition: 'all 0.2s',
  });

  return (
    <SensorLayout title="UV Sugárzás & Fényerő" icon="☀" color={cUV.color} th={th} show={show}>

      {/* ════════════ 1. SOR: UV INDEX ÉS BŐRTÍPUS (Most már ez a Hero szekció!) ════════════ */}
      <div className="gc8" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column' }}>
        <Card show={show} delay={80} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 380 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <Lbl t={th}>UV Sugárzás Idősora</Lbl>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ ...tech, fontSize: 38, fontWeight: 700, color: cUV.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{currentUV.toFixed(1)}</span>
                <span style={{ ...ui, fontSize: 16, color: th.t2, fontWeight: 400 }}>UVI</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {rangeButtons.map(({ id, label }) => (
                <button key={id} style={btnStyle(id, cUV.color)} onClick={() => setRange(id)} onMouseEnter={() => setActiveBtn(id)} onMouseLeave={() => setActiveBtn(null)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, width: '100%', minHeight: 280, position: 'relative', ...fadeStyle }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={displayRange} data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="4" stroke={`${th.t2}15`} vertical={false} />
                <XAxis dataKey="t" tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} domain={[0, Math.max(11, Math.ceil(maxUV))]} />
                <Tooltip content={<UVTip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="uv" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getUvInfo(entry.uv).color} />
                  ))}
                </Bar>
                <ReferenceLine y={8} stroke="#EF4444" strokeDasharray="4 4"
                  label={(p) => <RefLineChip viewBox={p.viewBox} text="Magas kockázat" color="#EF4444" th={th} dy={-16} />} />
              </BarChart>
            </ResponsiveContainer>
            <ChartGhostShimmer th={th} isFetching={isFetching} />
          </div>
        </Card>
      </div>

      <div className="gc4" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column' }}>
        <Card show={show} delay={140} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ ...cardFadeStyle, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Lbl t={th}>Napvédelem & Bőrtípus</Lbl>
              <span style={{ padding: '2px 8px', borderRadius: 6, background: `${cUV.color}15`, color: cUV.color, ...ui, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                {cUV.label}
              </span>
            </div>
            
            {/* Védekezési Piktogramok */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              {protectionIcons.map((p, i) => (
                <div key={i} style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  opacity: p.active ? 1 : 0.2, filter: p.active ? 'none' : 'grayscale(100%)',
                  transition: 'all 0.3s'
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: th.id === 'day' ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {p.icon}
                  </div>
                  <span style={{ ...ui, fontSize: 10, color: th.t2, fontWeight: 500 }}>{p.label}</span>
                </div>
              ))}
            </div>

            <p style={{ ...ui, fontSize: 13, color: th.t1, marginTop: 'auto', marginBottom: 0, lineHeight: 1.55, fontWeight: 500 }}>
              {cUV.advice}
            </p>
          </div>

          {/* Bőrtípus szerinti Színátmenetes Vonal */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${th.border}`, ...cardFadeStyle }}>
            <div style={{ ...ui, fontSize: 11, color: th.lbl, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
              Becsült leégési idő bőrtípus szerint
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, ...tech, fontSize: 12, fontWeight: 600, color: th.t1 }}>
              <span>{burnLight}</span>
              <span>{burnMedium}</span>
              <span>{burnDark}</span>
            </div>
            
            <div style={{ height: 8, borderRadius: 99, background: 'linear-gradient(90deg, #FDE0C1 0%, #D2996C 50%, #5C3A21 100%)', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '0%', top: '50%', transform: 'translateY(-50%)', width: 4, height: 4, background: '#fff', borderRadius: '50%', opacity: 0.5 }} />
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 4, height: 4, background: '#fff', borderRadius: '50%', opacity: 0.5 }} />
              <div style={{ position: 'absolute', right: '0%', top: '50%', transform: 'translateY(-50%)', width: 4, height: 4, background: '#fff', borderRadius: '50%', opacity: 0.5 }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, ...ui, fontSize: 10, color: th.t2 }}>
              <span>Világos (I-II)</span>
              <span>Normál (III-IV)</span>
              <span>Sötét (V-VI)</span>
            </div>
          </div>
        </Card>
      </div>


      {/* ════════════ 2. SOR: FÉNYERŐ (LUX) ÉS ÉGBOLT ÍV (Lekerült a 2. sorba) ════════════ */}
      <div className="gc8" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', marginTop: 20 }}>
        <Card show={show} delay={200} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 380 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <Lbl t={th}>Látható Fény Idősora</Lbl>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ ...tech, fontSize: 38, fontWeight: 700, color: th.w, letterSpacing: '-0.03em', lineHeight: 1 }}>{currentLux.toLocaleString('hu-HU')}</span>
                <span style={{ ...ui, fontSize: 16, color: th.t2, fontWeight: 400 }}>Lux</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {rangeButtons.map(({ id, label }) => (
                <button key={id} style={btnStyle(id, th.w)} onClick={() => setRange(id)} onMouseEnter={() => setActiveBtn(id)} onMouseLeave={() => setActiveBtn(null)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, width: '100%', minHeight: 280, position: 'relative', ...fadeStyle }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart key={displayRange} data={data} margin={{ top: 8, right: 28, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gLuxFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={th.w} stopOpacity={0.3} />
                    <stop offset="80%" stopColor={th.w} stopOpacity={0.05} />
                    <stop offset="100%" stopColor={th.w} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4" stroke={`${th.t2}15`} vertical={false} />
                <XAxis dataKey="t" tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} domain={[0, Math.ceil(maxLux * 1.1) || 1000]} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                <Tooltip content={<LuxTip />} cursor={{ stroke: `${th.w}40`, strokeWidth: 1.5, strokeDasharray: '4 3' }} />
                <Area type="monotone" dataKey="lux" stroke={th.w} strokeWidth={2.5} fill="url(#gLuxFill)" dot={false} animationDuration={600} animationEasing="ease-in-out" />
              </AreaChart>
            </ResponsiveContainer>
            <ChartGhostShimmer th={th} isFetching={isFetching} />
          </div>
        </Card>
      </div>

      <div className="gc4" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', marginTop: 20 }}>
        <Card show={show} delay={260} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ ...cardFadeStyle, display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            <Lbl t={th}>{isDay ? 'Égbolt Állapot & Felhőzet' : 'Éjszakai Állapot'}</Lbl>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
              <div style={{ fontSize: 52, lineHeight: 1, filter: `drop-shadow(0 4px 12px ${isDay ? '#F59E0B40' : '#38BDF840'})` }}>
                {skyIcon}
              </div>
              <div>
                <div style={{ ...ui, fontSize: 20, color: th.t1, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {skyCondition}
                </div>
                <div style={{ ...ui, fontSize: 13, color: th.t2, marginTop: 4, fontWeight: 500 }}>
                  Felhőborítottság: <span style={{ color: th.t1, fontWeight: 700 }}>{cloudCoverPct}%</span>
                </div>
              </div>
            </div>
            
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 160, margin: '12px 0' }}>
              <svg width="100%" height="100%" viewBox="0 0 300 150" style={{ overflow: 'visible', maxHeight: 150 }}>
                <defs>
                  <linearGradient id="dayPath" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#F97316" />
                    <stop offset="50%" stopColor="#FDE047" />
                    <stop offset="100%" stopColor="#F97316" />
                  </linearGradient>
                  <linearGradient id="nightPath" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="50%" stopColor="#BAE6FD" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>
                <line x1="20" y1="110" x2="280" y2="110" stroke={`${th.t2}30`} strokeWidth="1.5" strokeDasharray="3 4" />
                <path d="M 50 110 A 100 80 0 0 1 250 110" fill="none" stroke={`${th.t2}15`} strokeWidth="4" strokeLinecap="round" />
                {progress > 0 && (
                  <path d={`M 50 110 A 100 80 0 0 1 ${pathX} ${pathY}`} fill="none" 
                        stroke={isDay ? "url(#dayPath)" : "url(#nightPath)"} 
                        strokeWidth="4" strokeLinecap="round" 
                        style={{ filter: `drop-shadow(0 0 6px ${isDay ? '#F59E0B80' : '#38BDF880'})` }} />
                )}
                <g style={{ transition: 'all 0.5s ease' }}>
                  <circle cx={pathX} cy={pathY} r={24} fill={glowColor} opacity="0.1" />
                  <circle cx={pathX} cy={pathY} r={14} fill={glowColor} opacity="0.3" />
                  <circle cx={pathX} cy={pathY} r={6} fill={bodyColor} />
                  {!isDay && <circle cx={pathX + 2.5} cy={pathY - 2.5} r={5} fill={th.card} />}
                </g>
                <text x="50" y="132" textAnchor="middle" fill={th.t1} fontSize="12" fontWeight="600" fontFamily="'JetBrains Mono', monospace">{leftLabel}</text>
                <text x="50" y="146" textAnchor="middle" fill={th.t3} fontSize="9" textTransform="uppercase" letterSpacing="0.05em">{leftSub}</text>
                <text x="250" y="132" textAnchor="middle" fill={th.t1} fontSize="12" fontWeight="600" fontFamily="'JetBrains Mono', monospace">{rightLabel}</text>
                <text x="250" y="146" textAnchor="middle" fill={th.t3} fontSize="9" textTransform="uppercase" letterSpacing="0.05em">{rightSub}</text>
              </svg>
            </div>
          
            <div style={{ paddingTop: 14, borderTop: `1px solid ${th.border}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ ...ui, fontSize: 11, color: th.lbl, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Naphossz ma</div>
                  <div style={{ ...tech, fontSize: 16, fontWeight: 600, color: th.t1 }}>
                    {daylightHoursLength}ó {daylightMinsLength}p
                  </div>
                </div>
                <div>
                  <div style={{ ...ui, fontSize: 11, color: th.lbl, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{timeLabel}</div>
                  <div style={{ ...tech, fontSize: 16, fontWeight: 600, color: isDay ? th.w : '#38BDF8' }}>
                    {timeHours}ó {timeMins}p
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </Card>
      </div>

      {/* ════════════ 3. SOR: KÖZÖS EXPORT KÁRTYA ════════════ */}
      <div className="gc8" style={{ gridColumn: 'span 8', marginTop: 20 }}>
        <Card show={show} delay={320} t={th}>
          <Lbl t={th}>Adat Exportálás</Lbl>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
            <p style={{ ...ui, fontSize: 13, color: th.t2, margin: 0, flex: '1 1 200px', lineHeight: 1.5 }}>
              A kombinált <strong style={{ color: th.t1 }}>{rangeButtons.find(b => b.id === displayRange)?.label}</strong> adatcsomag (Lux és UVI) letöltése.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <FormatPill exportFormat={exportFormat} setExportFormat={setExportFormat} th={th} isFetching={isFetching} />
              <button onClick={handleExport} disabled={isFetching} style={{ padding: '10px 24px', background: th.t1, color: th.card, border: 'none', borderRadius: 10, fontWeight: 600, cursor: isFetching ? 'not-allowed' : 'pointer', ...ui, fontSize: 13, transition: 'all 0.3s', whiteSpace: 'nowrap', opacity: isFetching ? 0.6 : 1 }}>
                {isFetching ? '⏳ Előkészítés...' : '↓ Letöltés'}
              </button>
            </div>
          </div>
        </Card>
      </div>

    </SensorLayout>
  );
}


/* ─────────────── PRECIPITATION PAGE MOCK DATA ─────────────── */
const genRainData = () => {
  // Egy kis "eső-szimulátor", ami nagyrészt nullákat generál, néha viszont vihart
  const generateStorm = (chance, maxIntensity) => {
    if (Math.random() > chance) return { intensity: 0, acc: 0 };
    const intensity = Math.random() * maxIntensity; // mm/h
    const acc = intensity * (Math.random() * 0.5 + 0.1); // leesett mm az adott időszakban
    return { intensity: parseFloat(intensity.toFixed(1)), acc: parseFloat(acc.toFixed(1)) };
  };

  const data1h = Array.from({ length: 5 }, (_, i) => {
    // 1 órás nézet (15 perces bontás) - Tegyük fel, hogy épp most állt el az eső
    const isRaining = i < 3; 
    const int = isRaining ? parseFloat((12 - i*4 + Math.random()).toFixed(1)) : 0;
    const acc = isRaining ? parseFloat((int * 0.25).toFixed(1)) : 0;
    return { t: `14:${String(i*15).padStart(2,'0')}`, intensity: int, acc: acc };
  });

  const data1d = Array.from({ length: 24 }, (_, i) => {
    // 1 napos nézet: Legyen egy délutáni zivatar 14:00 és 17:00 között
    let int = 0, acc = 0;
    if (i >= 14 && i <= 16) {
      int = parseFloat((15 + Math.sin(i)*10).toFixed(1));
      acc = parseFloat((int * 0.8).toFixed(1)); // Kb ennyi esett összegezve abban az órában
    }
    return { t: `${String(i).padStart(2,'0')}:00`, intensity: int, acc: acc };
  });

  const _DAY_LBL = ['H','K','Sze','Cs','P','Szo','V'];
  const data1w = Array.from({ length: 7 }, (_, i) => {
    // Heti nézet (Napi csúcsintenzitás és Napi összeg)
    const storm = generateStorm(0.4, 40); // 40% esély esőre egy nap
    return { t: _DAY_LBL[i], intensity: storm.intensity, acc: storm.acc * 5 }; // felszorozva a napi összeghez
  });

  const data1mo = Array.from({ length: 30 }, (_, i) => {
    const storm = generateStorm(0.3, 50);
    return { t: `${i+1}.`, intensity: storm.intensity, acc: storm.acc * 4 };
  });

  return { '1h': data1h, '1d': data1d, '1w': data1w, '1mo': data1mo };
};

const RAIN_DATASETS = genRainData();

/* ═══════════════ PRECIPITATION PAGE (CSAPADÉK) ═══════════════ */
function PrecipitationPage({ th, addToast, liveData }) {
  const [show, setShow] = useState(false);
  const [range, setRange] = useState('1w'); // Alapértelmezetten 1 hét, hogy lássunk is esőt
  const [activeBtn, setActiveBtn] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');

  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 90);
    return () => clearTimeout(t);
  }, []);

  const { displayRange, isFetching, fadeStyle, cardFadeStyle, chartData } = useChartCrossfade(range, RAIN_DATASETS);
  const data = chartData;
  const intensities = data.map(d => d.intensity);
  const accumulations = data.map(d => d.acc);
  
  const currentInt = liveData.precipitation;
  const maxInt = Math.max(...intensities);
  const totalAcc = parseFloat(accumulations.reduce((a, b) => a + b, 0).toFixed(1));
  const maxAcc = Math.max(...accumulations);

  /* ─── INTENZITÁS ÉS STÁTUSZ LOGIKA ─── */
  let rainStatus, rainIcon, rainColor;
  if (currentInt === 0) { rainStatus = 'Száraz idő'; rainIcon = '🌥️'; rainColor = th.t2; }
  else if (currentInt < 2.5) { rainStatus = 'Szitálás / Gyenge eső'; rainIcon = '🌧️'; rainColor = '#0EA5E9'; }
  else if (currentInt < 10) { rainStatus = 'Mérsékelt eső'; rainIcon = '🌧️'; rainColor = '#3B82F6'; }
  else if (currentInt < 50) { rainStatus = 'Zápor'; rainIcon = '⛈️'; rainColor = '#6366F1'; }
  else { rainStatus = 'Felhőszakadás'; rainIcon = '🌩️'; rainColor = '#8B5CF6'; }

  // Utolsó esőzés keresése a mock adatokban (visszafelé)
  let daysSinceRain = "N/A";
  for (let i = intensities.length - 1; i >= 0; i--) {
    if (intensities[i] > 0) {
      const diff = (intensities.length - 1) - i;
      if (diff === 0) daysSinceRain = "Jelenleg is esik";
      else daysSinceRain = `${diff} ${displayRange === '1w' ? 'napja' : displayRange === '1d' ? 'órája' : 'időegysége'}`;
      break;
    }
    if (i === 0) daysSinceRain = `Több mint 1 ${displayRange === '1w' ? 'hete' : 'hónapja'}`;
  }

  /* ─── VÍZGAZDÁLKODÁS ÉS ÖNTÖZÉS LOGIKA (DINAMIKUS) ─── */
  const referenceValues = { '1h': 0.1, '1d': 1.5, '1w': 10.5, '1mo': 45.0 };
  const currentRef = referenceValues[displayRange] || 25.0;

  let irrigationAdvice;
  if (totalAcc === 0) {
    irrigationAdvice = 'Kritikusan száraz. Öntözés kötelező!';
  } else if (totalAcc < currentRef * 0.4) {
    irrigationAdvice = 'Száraz talaj. Öntözés javasolt.';
  } else if (totalAcc < currentRef * 1.2) {
    irrigationAdvice = 'Optimális talajnedvesség.';
  } else {
    irrigationAdvice = 'Telített talaj. Öntözés nem szükséges.';
  }

  /* ─── TENDENCIA LOGIKA ─── */
  const prevInt = intensities[intensities.length - 2] || 0;
  let rainTrendLabel = 'Stagnál';
  let rainTrendColor = th.t1;
  if (currentInt > prevInt) { rainTrendLabel = 'Erősödő ↗'; rainTrendColor = '#8B5CF6'; }
  else if (currentInt < prevInt) { rainTrendLabel = 'Gyengülő ↘'; rainTrendColor = '#0EA5E9'; }
  else if (currentInt === 0) { rainTrendLabel = 'Csapadékmentes'; rainTrendColor = th.t2; }

  const rangeButtons = [
    { id: '1h', label: '1 Óra' },
    { id: '1d', label: '1 Nap' },
    { id: '1w', label: '1 Hét' },
    { id: '1mo', label: '1 Hónap' },
  ];

  /* Fájlgenerátor funkciók */
  const downloadCSV = () => {
    const rows = ['Időpont,Intenzitás (mm/h),Összeg (mm)', ...data.map(d => `${d.t},${d.intensity},${d.acc}`)].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `csapadek_${displayRange}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportJSON = () => {
    const payload = { exportedAt: new Date().toISOString(), range: displayRange, records: data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `csapadek_${displayRange}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportXML = () => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<telemetry>\n`;
    xml += `  <metadata>\n    <exportedAt>${new Date().toISOString()}</exportedAt>\n    <range>${displayRange}</range>\n  </metadata>\n`;
    xml += `  <records>\n`;
    data.forEach(d => {
      xml += `    <record>\n      <time>${d.t}</time>\n      <intensity>${d.intensity}</intensity>\n      <accumulation>${d.acc}</accumulation>\n    </record>\n`;
    });
    xml += `  </records>\n</telemetry>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `csapadek_${displayRange}.xml`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExport = () => {
    if (exportFormat === 'csv') downloadCSV();
    else if (exportFormat === 'json') exportJSON();
    else if (exportFormat === 'xml') exportXML();
    addToast(`A(z) ${exportFormat.toUpperCase()} adatcsomag letöltése elindult.`);
  };

  const IntTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 16, padding: '10px 16px', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', backdropFilter: 'blur(20px)' }}>
        <div style={{ ...ui, fontSize: 11, color: th.lbl, fontWeight: 600, marginBottom: 6 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ ...tech, fontSize: 22, fontWeight: 700, color: '#0EA5E9' }}>{payload[0]?.value?.toFixed(1)}</span>
          <span style={{ ...ui, fontSize: 13, color: th.t2 }}>mm/h</span>
        </div>
      </div>
    );
  };

  const AccTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 16, padding: '10px 16px', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', backdropFilter: 'blur(20px)' }}>
        <div style={{ ...ui, fontSize: 11, color: th.lbl, fontWeight: 600, marginBottom: 6 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ ...tech, fontSize: 22, fontWeight: 700, color: '#3B82F6' }}>{payload[0]?.value?.toFixed(1)}</span>
          <span style={{ ...ui, fontSize: 13, color: th.t2 }}>mm</span>
        </div>
      </div>
    );
  };

  const btnStyle = (id, baseColor) => ({
    padding: '5px 14px', borderRadius: 99, cursor: 'pointer',
    background: range === id ? (th.id === 'day' ? 'rgba(15,23,42,0.07)' : 'rgba(255,255,255,0.10)') : activeBtn === id ? (th.id === 'day' ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.04)') : 'transparent',
    border: range === id ? `1px solid ${th.border}` : '1px solid transparent',
    color: range === id ? baseColor : th.t2,
    ...ui, fontSize: 12, fontWeight: range === id ? 600 : 400, transition: 'all 0.2s',
  });

  return (
    <SensorLayout title="Csapadék & Vízgazdálkodás" icon="🌧" color="#0EA5E9" th={th} show={show}>

      {/* ════════════ 1. SOR: CSAPADÉKINTENZITÁS (AREA CHART) ════════════ */}
      <div className="gc8" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column' }}>
        <Card show={show} delay={80} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 380 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <Lbl t={th}>Csapadékintenzitás (Rain Rate)</Lbl>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ ...tech, fontSize: 38, fontWeight: 700, color: currentInt > 0 ? '#0EA5E9' : th.t2, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {currentInt.toFixed(1)}
                </span>
                <span style={{ ...ui, fontSize: 16, color: th.t2, fontWeight: 400 }}>mm/h</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {rangeButtons.map(({ id, label }) => (
                <button key={id} style={btnStyle(id, '#0EA5E9')} onClick={() => setRange(id)} onMouseEnter={() => setActiveBtn(id)} onMouseLeave={() => setActiveBtn(null)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, width: '100%', minHeight: 280, position: 'relative', ...fadeStyle }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart key={displayRange} data={data} margin={{ top: 8, right: 28, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gIntFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4" stroke={`${th.t2}15`} vertical={false} />
                <XAxis dataKey="t" tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} minTickGap={20} />
                {/* Ha nincs eső, ne omoljon össze a skála, tartson meg egy 0-5 mm/h limitet */}
                <YAxis tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} domain={[0, Math.max(5, Math.ceil(maxInt))]} />
                <Tooltip content={<IntTip />} cursor={{ stroke: `#0EA5E940`, strokeWidth: 1.5, strokeDasharray: '4 3' }} />
                <Area type="monotone" dataKey="intensity" stroke="#0EA5E9" strokeWidth={2.5} fill="url(#gIntFill)" dot={false} animationDuration={600} animationEasing="ease-in-out" />
              </AreaChart>
            </ResponsiveContainer>
            <ChartGhostShimmer th={th} isFetching={isFetching} />
          </div>
        </Card>
      </div>

      <div className="gc4" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column' }}>
        <Card show={show} delay={140} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', ...cardFadeStyle }}>
              <Lbl t={th}>Aktuális Állapot & Statisztika</Lbl>
              <span style={{ fontSize: 24, lineHeight: 1 }}>{rainIcon}</span>
            </div>
            <div style={{ ...ui, fontSize: 20, color: rainColor, fontWeight: 700, marginTop: 4, letterSpacing: '-0.02em', ...cardFadeStyle }}>
              {rainStatus}
            </div>
            
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16, ...cardFadeStyle }}>
              <div>
                <div style={{ ...ui, fontSize: 11, color: th.lbl, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Időszakos Max. Intenzitás</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ ...tech, fontSize: 20, fontWeight: 600, color: maxInt > 0 ? '#6366F1' : th.t2 }}>{maxInt.toFixed(1)}</span>
                  <span style={{ ...ui, fontSize: 12, color: th.t2 }}>mm/h</span>
                </div>
              </div>
              <div>
                <div style={{ ...ui, fontSize: 11, color: th.lbl, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Utolsó esőzés</div>
                <div style={{ ...ui, fontSize: 15, fontWeight: 500, color: th.t1 }}>{daysSinceRain}</div>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${th.border}`, ...cardFadeStyle }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ ...ui, fontSize: 12, color: th.t2 }}>Csapadék tendenciája</span>
              <span style={{ ...ui, fontSize: 12, fontWeight: 700, color: rainTrendColor }}>{rainTrendLabel}</span>
            </div>
          </div>
        </Card>
      </div>


      {/* ════════════ 2. SOR: CSAPADÉKÖSSZEG (BAR CHART) ÉS MÉRŐHENGER ════════════ */}
      <div className="gc8" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', marginTop: 20 }}>
        <Card show={show} delay={200} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 380 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <Lbl t={th}>Csapadékösszeg (Accumulation)</Lbl>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, ...cardFadeStyle }}>
                <span style={{ ...tech, fontSize: 38, fontWeight: 700, color: '#3B82F6', letterSpacing: '-0.03em', lineHeight: 1 }}>{totalAcc.toFixed(1)}</span>
                <span style={{ ...ui, fontSize: 16, color: th.t2, fontWeight: 400 }}>mm összesen</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {rangeButtons.map(({ id, label }) => (
                <button key={id} style={btnStyle(id, '#3B82F6')} onClick={() => setRange(id)} onMouseEnter={() => setActiveBtn(id)} onMouseLeave={() => setActiveBtn(null)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, width: '100%', minHeight: 280, position: 'relative', ...fadeStyle }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={displayRange} data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gAccFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4" stroke={`${th.t2}15`} vertical={false} />
                <XAxis dataKey="t" tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} domain={[0, Math.max(2, Math.ceil(maxAcc))]} />
                <Tooltip content={<AccTip />} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
                <Bar dataKey="acc" fill="url(#gAccFill)" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
            <ChartGhostShimmer th={th} isFetching={isFetching} />
          </div>
        </Card>
      </div>

      <div className="gc4" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', marginTop: 20 }}>
        <Card show={show} delay={260} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Lbl t={th}>Vízgazdálkodás & Öntözés</Lbl>
            </div>
            
            <div style={{ display: 'flex', gap: 20, marginTop: 12, alignItems: 'center', ...cardFadeStyle }}>
              {/* Vizuális Csapadékmérő Henger */}
              <div style={{ width: 40, height: 120, borderRadius: 20, background: th.id === 'day' ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.05)', border: `2px solid ${th.border}`, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                {/* Mérővonalak */}
                <div style={{ position: 'absolute', width: '30%', height: 1, background: th.border, top: '25%', left: 0 }} />
                <div style={{ position: 'absolute', width: '50%', height: 1, background: th.border, top: '50%', left: 0 }} />
                <div style={{ position: 'absolute', width: '30%', height: 1, background: th.border, top: '75%', left: 0 }} />
                
                {/* Folyadék Animáció */}
                <div style={{ 
                  position: 'absolute', bottom: 0, left: 0, right: 0, 
                  height: `${Math.min(100, (totalAcc / Math.max(1, currentRef * 1.5)) * 100)}%`, // A henger az elvárt referencia 150%-ánál telik meg
                  background: 'linear-gradient(180deg, #38BDF8 0%, #0284C7 100%)',
                  transition: 'height 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
                  opacity: totalAcc > 0 ? 0.9 : 0
                }}>
                  {/* Kis hullám effekt a tetején */}
                  {totalAcc > 0 && <div style={{ position: 'absolute', top: -2, left: 0, right: 0, height: 4, background: '#fff', opacity: 0.3, borderRadius: '50%' }} />}
                </div>
              </div>

              {/* Szöveges adatok a henger mellett */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ ...ui, fontSize: 11, color: th.lbl, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>Időszaki Összeg</div>
                  <div style={{ ...tech, fontSize: 24, fontWeight: 700, color: '#3B82F6', lineHeight: 1 }}>{totalAcc.toFixed(1)} <span style={{ ...ui, fontSize: 12, fontWeight: 500, color: th.t2 }}>mm</span></div>
                </div>
                <div>
                  <div style={{ ...ui, fontSize: 11, color: th.lbl, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>Referencia (Átlag)</div>
                  <div style={{ ...tech, fontSize: 16, fontWeight: 500, color: th.t1 }}>~ {currentRef.toFixed(1)} <span style={{ ...ui, fontSize: 12, fontWeight: 400, color: th.t2 }}>mm</span></div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, padding: 14, background: th.id === 'day' ? 'rgba(15,23,42,0.02)' : 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px solid ${th.border}`, ...cardFadeStyle }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>{totalAcc < 5 ? '💧' : '🌱'}</span>
                <span style={{ ...ui, fontSize: 12, fontWeight: 600, color: th.t1, textTransform: 'uppercase' }}>Talajállapot</span>
              </div>
              <p style={{ ...ui, fontSize: 13, color: totalAcc < 5 ? '#F59E0B' : th.t2, margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                {irrigationAdvice}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ════════════ 3. SOR: KÖZÖS EXPORT KÁRTYA ════════════ */}
      <div className="gc8" style={{ gridColumn: 'span 8', marginTop: 20 }}>
        <Card show={show} delay={320} t={th}>
          <Lbl t={th}>Adat Exportálás</Lbl>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
            <p style={{ ...ui, fontSize: 13, color: th.t2, margin: 0, flex: '1 1 200px', lineHeight: 1.5 }}>
              A kombinált <strong style={{ color: th.t1 }}>{rangeButtons.find(b => b.id === displayRange)?.label}</strong> adatcsomag (Intenzitás és Összeg) letöltése.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <FormatPill exportFormat={exportFormat} setExportFormat={setExportFormat} th={th} isFetching={isFetching} />
              <button onClick={handleExport} disabled={isFetching} style={{ padding: '10px 24px', background: '#0EA5E9', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: isFetching ? 'not-allowed' : 'pointer', ...ui, fontSize: 13, transition: 'all 0.3s', whiteSpace: 'nowrap', opacity: isFetching ? 0.6 : 1 }}>
                {isFetching ? '⏳ Előkészítés...' : '↓ Letöltés'}
              </button>
            </div>
          </div>
        </Card>
      </div>

    </SensorLayout>
  );
}


/* ─────────────── WIND PAGE MOCK DATA ─────────────── */
const genWindData = () => {
  // Lökésszerű, "gust-os" szélgenerátor: az alapszél fölé időnként erősebb lökések kerülnek
  const gustFactor = () => 1.25 + Math.random() * 0.55;

  const data1h = Array.from({ length: 5 }, (_, i) => {
    const speed = parseFloat((11 + i * 0.6 + Math.sin(i) * 1.4).toFixed(1));
    return { t: `${String(13 + Math.floor((i*15)/60)).padStart(2,'0')}:${String((i*15)%60).padStart(2,'0')}`, speed, gust: parseFloat((speed * gustFactor()).toFixed(1)) };
  });

  const data1d = Array.from({ length: 24 }, (_, i) => {
    const speed = parseFloat((6 + Math.sin((i - 14) * Math.PI / 12) * 5 + Math.max(0, Math.cos(i * Math.PI / 6)) * 3).toFixed(1));
    return { t: `${String(i).padStart(2,'0')}:00`, speed: Math.max(0, speed), gust: parseFloat((Math.max(0, speed) * gustFactor()).toFixed(1)) };
  });

  const _DAY_LBL = ['H','K','Sze','Cs','P','Szo','V'];
  const data1w = Array.from({ length: 7 }, (_, i) => {
    const speed = parseFloat((8 + Math.sin(i * 1.1) * 5 + Math.random() * 3).toFixed(1));
    return { t: _DAY_LBL[i], speed: Math.max(0, speed), gust: parseFloat((Math.max(0, speed) * gustFactor()).toFixed(1)) };
  });

  const data1mo = Array.from({ length: 30 }, (_, i) => {
    const speed = parseFloat((9 + Math.sin(i * Math.PI / 9) * 6 + Math.cos(i * Math.PI / 4) * 2).toFixed(1));
    return { t: `${i + 1}.`, speed: Math.max(0, speed), gust: parseFloat((Math.max(0, speed) * gustFactor()).toFixed(1)) };
  });

  return { '1h': data1h, '1d': data1d, '1w': data1w, '1mo': data1mo };
};

const WIND_DATASETS = genWindData();

/* Beaufort-skála besorolás */
const BEAUFORT = [
  { max: 1,   scale: 0,  label: 'Szélcsend' },
  { max: 5,   scale: 1,  label: 'Gyenge fuvallat' },
  { max: 11,  scale: 2,  label: 'Könnyű szél' },
  { max: 19,  scale: 3,  label: 'Gyenge szél' },
  { max: 28,  scale: 4,  label: 'Mérsékelt szél' },
  { max: 38,  scale: 5,  label: 'Élénk szél' },
  { max: 49,  scale: 6,  label: 'Erős szél' },
  { max: 61,  scale: 7,  label: 'Viharos szél' },
  { max: 74,  scale: 8,  label: 'Vihar' },
  { max: 88,  scale: 9,  label: 'Erős vihar' },
  { max: 102, scale: 10, label: 'Pusztító vihar' },
  { max: 117, scale: 11, label: 'Szélvihar' },
  { max: Infinity, scale: 12, label: 'Orkán' },
];
const getBeaufort = kmh => BEAUFORT.find(b => kmh <= b.max) || BEAUFORT[BEAUFORT.length - 1];

/* Szélirány-eloszlás (rózsa) — a fő mérési irány körül súlyozva */
const ROSE_DIRS = ['É', 'ÉK', 'K', 'DK', 'D', 'DNY', 'NY', 'ÉNY'];
const genRoseData = () => {
  const dominantIdx = Math.round(R.windDir / 45) % 8;
  const raw = ROSE_DIRS.map((d, i) => {
    const dist = Math.min(Math.abs(i - dominantIdx), 8 - Math.abs(i - dominantIdx));
    return Math.max(2, 28 - dist * 7 + Math.random() * 4);
  });
  const sum = raw.reduce((a, b) => a + b, 0);
  return ROSE_DIRS.map((d, i) => ({ dir: d, pct: parseFloat((raw[i] / sum * 100).toFixed(1)) }));
};
const ROSE_DATA = genRoseData();

/* ═══════════════ WIND PAGE (SZÉLADATOK) ═══════════════ */
function WindPage({ th, addToast, liveData}) {
  const [show, setShow] = useState(false);
  const [range, setRange] = useState('1d');
  const [activeBtn, setActiveBtn] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');

  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 90);
    return () => clearTimeout(t);
  }, []);

  const { displayRange, isFetching, fadeStyle, cardFadeStyle, chartData } = useChartCrossfade(range, WIND_DATASETS);
  const data = chartData;
  const speeds = data.map(d => d.speed);

  const currentSpeed = liveData.windSpeed;
  const maxSpeed = Math.max(...speeds);
  const avgSpeed = parseFloat((speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1));

  const bf = getBeaufort(currentSpeed);

  // ─── ÚJ: DINAMIKUS SZÉLRÓZSA SZÁMÍTÁS AZ AKTUÁLIS IDŐABLAK ALAPJÁN ───
  const dynamicRoseData = useMemo(() => {
    const DIRS = ['É', 'ÉK', 'K', 'DK', 'D', 'DNY', 'NY', 'ÉNY'];
    if (!data || data.length === 0) return DIRS.map(dir => ({ dir, pct: 0 }));

    let validCount = 0;
    const counts = new Array(8).fill(0);

    data.forEach(d => {
      // Rugalmasan keresjük a szélirány kulcsot (attól függően, hogy a Vercel backend hogy küldi)
      const deg = d.windDir ?? d.wind_direction ?? d.dir;
      if (deg !== undefined && deg !== null) {
        // A 360 fokot besoroljuk a 8 fő égtáj (45 fokos) "vödrébe"
        const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
        counts[idx]++;
        validCount++;
      }
    });

    // Biztonsági háló: Ha az API history (még) nem adná vissza a szélirányt, 
    // akkor átmenetileg az élő, pillanatnyi adattal tartjuk életben a grafikont
    if (validCount === 0) {
       const liveIdx = Math.round(((liveData.windDir % 360) + 360) % 360 / 45) % 8;
       return DIRS.map((dir, i) => ({ dir, pct: i === liveIdx ? 100 : 0 }));
    }

    // Százalékos eloszlás kiszámítása
    return DIRS.map((dir, i) => ({
      dir,
      pct: parseFloat(((counts[i] / validCount) * 100).toFixed(1))
    }));
  }, [data, liveData.windDir]);

  // A legnagyobb százalékú égtáj (domináns szél) kiválasztása
  const dominantRose = dynamicRoseData.reduce((a, b) => (b.pct > a.pct ? b : a), dynamicRoseData[0]);
  
  const windLabel = getWindLabel(liveData.windDir);

  /* ─── TENDENCIA LOGIKA ─── */
  const prevSpeed = speeds[speeds.length - 2] || 0;
  let windTrendLabel = 'Stabil';
  let windTrendColor = th.t2;
  if (currentSpeed > prevSpeed + 1) { windTrendLabel = 'Erősödő ↗'; windTrendColor = th.w; }
  else if (currentSpeed < prevSpeed - 1) { windTrendLabel = 'Mérséklődő ↘'; windTrendColor = '#10B981'; }

  const rangeButtons = [
    { id: '1h', label: '1 Óra' },
    { id: '1d', label: '1 Nap' },
    { id: '1w', label: '1 Hét' },
    { id: '1mo', label: '1 Hónap' },
  ];

  /* Fájlgenerátor funkciók (Lökések eltávolítva) */
  const downloadCSV = () => {
    const rows = ['Időpont,Szélsebesség (km/h)', ...data.map(d => `${d.t},${d.speed}`)].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `szeladatok_${displayRange}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportJSON = () => {
    const payload = { exportedAt: new Date().toISOString(), range: displayRange, windDirectionDeg: liveData.windDir, windDirectionLabel: windLabel, records: data.map(d => ({ t: d.t, speed: d.speed })) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `szeladatok_${displayRange}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportXML = () => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<telemetry>\n`;
    xml += `  <metadata>\n    <exportedAt>${new Date().toISOString()}</exportedAt>\n    <range>${displayRange}</range>\n    <windDirectionDeg>${liveData.windDir}</windDirectionDeg>\n    <windDirectionLabel>${windLabel}</windDirectionLabel>\n  </metadata>\n`;
    xml += `  <records>\n`;
    data.forEach(d => {
      xml += `    <record>\n      <time>${d.t}</time>\n      <speed>${d.speed}</speed>\n    </record>\n`;
    });
    xml += `  </records>\n</telemetry>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `szeladatok_${displayRange}.xml`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExport = () => {
    if (exportFormat === 'csv') downloadCSV();
    else if (exportFormat === 'json') exportJSON();
    else if (exportFormat === 'xml') exportXML();
    addToast(`A(z) ${exportFormat.toUpperCase()} adatcsomag letöltése elindult.`);
  };

  const SpeedTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 16, padding: '10px 16px', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', backdropFilter: 'blur(20px)' }}>
        <div style={{ ...ui, fontSize: 11, color: th.lbl, fontWeight: 600, marginBottom: 6 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ ...tech, fontSize: 18, fontWeight: 700, color: th.a }}>{payload[0]?.value?.toFixed(1)}</span>
          <span style={{ ...ui, fontSize: 12, color: th.t2 }}>km/h</span>
        </div>
      </div>
    );
  };

  const RoseTip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 16, padding: '10px 16px', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', backdropFilter: 'blur(20px)' }}>
        <div style={{ ...ui, fontSize: 11, color: th.lbl, fontWeight: 600, marginBottom: 6 }}>{payload[0]?.payload?.dir} irány</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ ...tech, fontSize: 20, fontWeight: 700, color: th.p }}>{payload[0]?.value?.toFixed(1)}</span>
          <span style={{ ...ui, fontSize: 13, color: th.t2 }}>%</span>
        </div>
      </div>
    );
  };

  const btnStyle = (id, baseColor) => ({
    padding: '5px 14px', borderRadius: 99, cursor: 'pointer',
    background: range === id ? (th.id === 'day' ? 'rgba(15,23,42,0.07)' : 'rgba(255,255,255,0.10)') : activeBtn === id ? (th.id === 'day' ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.04)') : 'transparent',
    border: range === id ? `1px solid ${th.border}` : '1px solid transparent',
    color: range === id ? baseColor : th.t2,
    ...ui, fontSize: 12, fontWeight: range === id ? 600 : 400, transition: 'all 0.2s',
  });

  return (
    <SensorLayout title="Szélsebesség & Irány" icon="💨" color={th.a} th={th} show={show}>

      {/* ════════════ 1. SOR: SZÉLSEBESSÉG & LÖKÉS (AREA CHART) ════════════ */}
      <div className="gc8" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column' }}>
        <Card show={show} delay={80} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 380 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <Lbl t={th}>Szélsebesség</Lbl>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ ...tech, fontSize: 38, fontWeight: 700, color: th.a, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {currentSpeed.toFixed(1)}
                </span>
                <span style={{ ...ui, fontSize: 16, color: th.t2, fontWeight: 400 }}>km/h</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {rangeButtons.map(({ id, label }) => (
                <button key={id} style={btnStyle(id, th.a)} onClick={() => setRange(id)} onMouseEnter={() => setActiveBtn(id)} onMouseLeave={() => setActiveBtn(null)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, width: '100%', minHeight: 280, position: 'relative', ...fadeStyle }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart key={displayRange} data={chartData} margin={{ top: 8, right: 28, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gWindFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={th.a} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={th.a} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4" stroke={`${th.t2}15`} vertical={false} />
                <XAxis dataKey="t" tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} domain={[0, Math.max(5, Math.ceil(maxSpeed))]} />
                <Tooltip content={<SpeedTip />} cursor={{ stroke: th.a, strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="speed" stroke={th.a} strokeWidth={2.5} fill="url(#gWindFill)" animationDuration={700} animationEasing="ease-in-out" />
              </AreaChart>
            </ResponsiveContainer>
            <ChartGhostShimmer th={th} isFetching={isFetching} />
          </div>
        </Card>
      </div>

      {/* ════════════ SZÉLIRÁNY KOMPASZ ════════════ */}
      <div className="gc4" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column' }}>
        <Card show={show} delay={140} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Lbl t={th}>Aktuális Szélirány</Lbl>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <WindCompass show={show} t={th} direction={liveData.windDir} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: -8 }}>
              <span style={{ ...tech, fontSize: 26, fontWeight: 700, color: th.t1 }}>{liveData.windDir}°</span>
              <span style={{ ...ui, fontSize: 15, color: th.t2, fontWeight: 500 }}>{windLabel}</span>
            </div>
          </div>
          <div style={{ marginTop: 8, paddingTop: 14, borderTop: `1px solid ${th.border}`, display: 'flex', justifyContent: 'space-between', ...cardFadeStyle }}>
            <span style={{ ...ui, fontSize: 12, color: th.t2 }}>Domináns irány (időszak)</span>
            <span style={{ ...tech, fontSize: 12, fontWeight: 600, color: th.t1 }}>{dominantRose.dir} ({dominantRose.pct}%)</span>
          </div>
        </Card>
      </div>

      {/* ════════════ 2. SOR: SZÉLRÓZSA (IRÁNYELOSZLÁS) ════════════ */}
      <div className="gc8" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', marginTop: 20 }}>
        <Card show={show} delay={220} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 320 }}>
          <Lbl t={th}>Szélirány-eloszlás (Szélrózsa)</Lbl>
          <div style={{ flex: 1, width: '100%', minHeight: 240, marginTop: 8, position: 'relative', ...fadeStyle }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicRoseData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="4" stroke={`${th.t2}15`} vertical={false} />
                <XAxis dataKey="dir" tick={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fill: th.t2, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={<RoseTip />} cursor={{ fill: `${th.a}10` }} />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={42} animationDuration={600} animationEasing="ease-in-out">
                  {dynamicRoseData.map((d, i) => (
                    <Cell key={i} fill={d.dir === dominantRose.dir ? th.a : `${th.a}40`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ChartGhostShimmer th={th} isFetching={isFetching} />
          </div>
        </Card>
      </div>

      {/* ════════════ ÁLTALÁNOS STATISZTIKA ════════════ */}
      <div className="gc4" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', marginTop: 20 }}>
        <Card show={show} delay={280} t={th} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Lbl t={th}>Általános Statisztika</Lbl>
              <span style={{ fontSize: 22, lineHeight: 1 }}>💨</span>
            </div>
            <div style={{ ...ui, fontSize: 18, color: th.a, fontWeight: 700, marginTop: 2, letterSpacing: '-0.02em', ...cardFadeStyle }}>
              Beaufort {bf.scale} · {bf.label}
            </div>

            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14, ...cardFadeStyle }}>
              {[
                ['Időszaki Átlagsebesség', `${avgSpeed.toFixed(1)} km/h`, th.t1],
                ['Időszaki Max. Sebesség', `${maxSpeed.toFixed(1)} km/h`, th.a],
              ].map(([l, v, c]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', ...ui, fontSize: 13 }}>
                  <span style={{ color: th.t2 }}>{l}</span>
                  <span style={{ ...tech, fontWeight: 600, color: c }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${th.border}`, ...cardFadeStyle }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ ...ui, fontSize: 12, color: th.t2 }}>Légmozgás tendenciája</span>
              <span style={{ ...ui, fontSize: 12, fontWeight: 700, color: windTrendColor }}>{windTrendLabel}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ════════════ 3. SOR: KÖZÖS EXPORT KÁRTYA ════════════ */}
      <div className="gc8" style={{ gridColumn: 'span 8', marginTop: 20 }}>
        <Card show={show} delay={340} t={th}>
          <Lbl t={th}>Adat Exportálás</Lbl>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
            <p style={{ ...ui, fontSize: 13, color: th.t2, margin: 0, flex: '1 1 200px', lineHeight: 1.5 }}>
              A kombinált <strong style={{ color: th.t1 }}>{rangeButtons.find(b => b.id === displayRange)?.label}</strong> adatcsomag (Szélsebesség, Irány) letöltése.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <FormatPill exportFormat={exportFormat} setExportFormat={setExportFormat} th={th} isFetching={isFetching} />
              <button onClick={handleExport} disabled={isFetching} style={{ padding: '10px 24px', background: th.a, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: isFetching ? 'not-allowed' : 'pointer', ...ui, fontSize: 13, transition: 'all 0.3s', whiteSpace: 'nowrap', opacity: isFetching ? 0.6 : 1 }}>
                {isFetching ? '⏳ Előkészítés...' : '↓ Letöltés'}
              </button>
            </div>
          </div>
        </Card>
      </div>

    </SensorLayout>
  );
}

/* ═══════════════ DASHBOARD MAIN CONTENT ═══════════════ */
function DashboardContent({ phase, th, isRaining, isWindy, setCurrentPage, appLoaded, liveData, chartHourly, chartWeekly }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(false); 
    const t = setTimeout(() => setShow(true), 90);
    return () => clearTimeout(t);
  }, []);

  // --- ÚJ: MIN/MAX SZÁMÍTÁS A 24 ÓRÁS ADATOKBÓL ---
  // Kinyerjük a hőmérsékleteket a grafikon tömbjéből (csak a valós értékeket)
  // Figyelem: A kulcs 't' helyett 'temp' lett az InfluxDB kompatibilitás miatt!
  const hourlyTemps = chartHourly.map(d => d.temp).filter(v => v != null);
  const tempMin = Math.min(...hourlyTemps, liveData.temp);
  const tempMax = Math.max(...hourlyTemps, liveData.temp);
  const tempPct = tempMin === tempMax ? 50 : Math.max(0, Math.min(100, ((liveData.temp - tempMin) / (tempMax - tempMin)) * 100));
  const activeRangeW = show ? tempPct : 0;

  const metrics = [
    { label: 'Páratartalom', value: liveData.humidity, unit: '%', color: th.p, bar: liveData.humidity, icon: '💧', format: v => Math.round(v).toString() },
    { label: 'Légnyomás', value: liveData.pressure, unit: 'hPa', color: th.v, bar: ((liveData.pressure - 980) / 60) * 100, icon: '◎', format: v => v.toFixed(1) },
    { label: 'Szélerősség', value: liveData.windSpeed, unit: 'km/h', color: th.a, bar: (liveData.windSpeed / 60) * 100, icon: '⟁', format: v => v.toFixed(1) },
    { label: 'UV Index', value: liveData.uvIndex, unit: '', color: getUvInfo(liveData.uvIndex).color, bar: (liveData.uvIndex / 11) * 100, icon: '☀', format: v => v.toFixed(1) },
  ];
  
  const status = [
    { label: 'Akkumulátor', value: liveData.battery, color: th.a, unit: '%', bar: liveData.battery, format: v => Math.round(v).toString() },
    { label: 'Wi-Fi Jelerősség', value: liveData.wifi, color: th.p, unit: '%', bar: liveData.wifi, format: v => Math.round(v).toString() },
    { label: 'Belső Hőmérséklet', value: liveData.internalTemp, color: th.v, unit: '°C', bar: Math.min(100, liveData.internalTemp), format: v => v.toFixed(1) }, 
  ];

  // ── ÚJ: Dinamikus grafikon-adat (A Path Morphing előkészítése) ──
  // Lemásoljuk a statikus grafikon adatokat, de a LEGUTOLSÓ pontot rákötjük az élő szenzorra!
  const dynamicHourly = useMemo(() => {
    if (!chartHourly || chartHourly.length === 0) return [];
    const dataCopy = [...chartHourly];
    dataCopy[dataCopy.length - 1] = {
      ...dataCopy[dataCopy.length - 1],
      temp: liveData.temp,
      hum: liveData.humidity
    };
    return dataCopy;
  }, [liveData.temp, liveData.humidity, chartHourly]);

  const ChartTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 16, padding: '10px 14px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
        <div style={{ ...ui, fontSize: 11, color: th.lbl, fontWeight: 600, marginBottom: 6 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
            <span style={{ ...tech, fontSize: 13, fontWeight: 600, color: p.color }}>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
            <span style={{ ...ui, fontSize: 12, color: th.t2 }}>{p.dataKey === 'temp' ? '°C' : '%'}</span>          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="page-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 32, opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(-14px)', transition: 'opacity .5s ease, transform .5s ease' }}>
        <TextAura>
          <div>
            <h1 style={{ ...ui, fontSize: 'clamp(22px,3.2vw,36px)', fontWeight: 700, color: th.hTitle, margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em', textShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 6px rgba(0,0,0,0.15)' }}>Telemetriai Dashboard</h1>
            <p style={{ ...ui, fontSize: 13, color: th.hSub, margin: '6px 0 0', opacity: 0.85, textShadow: '0 2px 12px rgba(0,0,0,0.3), 0 0 4px rgba(0,0,0,0.15)' }}>Hajdúböszörmény · Kliensoldali Vezérlőpult v1.0</p>
          </div>
        </TextAura>

        {/* Itt hívjuk meg az elszigetelt, független órát! */}
        <TextAura>
          <LiveHeaderTime th={th} />
        </TextAura>
      </header>

      <div style={{ marginBottom: 24 }}>
        <SmartCapsule th={th} show={show} phase={phase} isRaining={isRaining} isWindy={isWindy} liveData={liveData} appLoaded={appLoaded} />
      </div>

      <div className='mg' style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 20 }}>

        {/* ── 1. HŐMÉRSÉKLET KÁRTYA ── */}
        <Card show={show} delay={80} t={th} className='gc4' style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column' }}>
          <Lbl t={th}>Hőmérséklet</Lbl>
          <div style={{ flex: 1, minHeight: 180 }}>
            {/* LÉPÉSZETES IDŐZÍTÉS: delay={0} */}
            <SkeletonWrapper isLoaded={appLoaded} delay={0} skeleton={
              <>
                <SkeletonBlock w="60%" h={64} br={16} th={th} style={{ marginTop: 4 }} />
                <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
                  <div><SkeletonBlock w={50} h={12} br={4} th={th} style={{ marginBottom: 6 }} /><SkeletonBlock w={70} h={20} br={6} th={th} /></div>
                  <div><SkeletonBlock w={50} h={12} br={4} th={th} style={{ marginBottom: 6 }} /><SkeletonBlock w={70} h={20} br={6} th={th} /></div>
                </div>
                <SkeletonBlock w="100%" h={6} br={99} th={th} style={{ marginTop: 34 }} />
              </>
            }>
              <div style={{ ...tech, fontWeight: 600, fontSize: 'clamp(54px,5.5vw,82px)', color: th.w, lineHeight: 1, marginTop: 4, letterSpacing: '-0.04em' }}>
                <OdometerNumber value={liveData.temp} />
                <span style={{ ...ui, fontSize: '.4em', color: th.t2, fontWeight: 300, marginLeft: 2, verticalAlign: 'super', letterSpacing: 0 }}>°C</span>
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 18, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ ...ui, fontSize: 11, color: th.t2, marginBottom: 2 }}>Hőérzet</div>
                  <div style={{ ...tech, fontSize: 15, color: th.t1, fontWeight: 500, display: 'flex', alignItems: 'baseline' }}>
                    <OdometerNumber value={liveData.feelsLike} /><span style={{ marginLeft: 1 }}>°C</span>
                  </div>
                </div>
                <div>
                  <div style={{ ...ui, fontSize: 11, color: th.t2, marginBottom: 2 }}>Harmatpont</div>
                  <div style={{ ...tech, fontSize: 15, color: th.t1, fontWeight: 500, display: 'flex', alignItems: 'baseline' }}>
                    <OdometerNumber value={liveData.dewPoint} /><span style={{ marginLeft: 1 }}>°C</span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, ...ui, fontSize: 11, color: th.t2 }}>
                  <span>Min {tempMin.toFixed(1)}°C</span>
                  <span>Max {tempMax.toFixed(1)}°C</span>
                </div>
                <div style={{ height: 6, background: 'rgba(128,128,128,0.10)', borderRadius: 99, position: 'relative' }}>
                  {/* 1. Folyadék vonal GPU gyorsítással (scaleX) */}
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${th.p},${th.w})`, width: '100%', transformOrigin: 'left', transform: `scaleX(${activeRangeW / 100})`, transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1) .1s', willChange: 'transform' }} />
                  
                  {/* 2. ÚJ: A csúszka golyója egy hardvergyorsított "hordozó" réteget kap (translateX) a darabos 'left' animáció helyett! */}
                  <div style={{ 
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                    transform: `translateX(${activeRangeW}%)`, 
                    transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1) .1s', 
                    willChange: 'transform', pointerEvents: 'none' 
                  }}>
                    {/* Maga a golyó statikusan ül a hordozó bal szélén, és csak a saját középpontjához van igazítva */}
                    <div style={{ 
                      position: 'absolute', top: '50%', left: 0, transform: 'translate(-50%,-50%)', 
                      width: 12, height: 11, borderRadius: '50%', background: th.w, boxShadow: `0 0 10px ${th.w}` 
                    }} />
                  </div>
                </div>
              </div>
            </SkeletonWrapper>
          </div>
        </Card>

        {/* ── 2. AKTUÁLIS ÁLLAPOT KÁRTYA ── */}
        <Card show={show} delay={140} t={th} className='gc4' style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column' }}>
          <Lbl t={th}>Aktuális Állapot</Lbl>
          <div style={{ flex: 1, minHeight: 180 }}>
            {/* LÉPÉSZETES IDŐZÍTÉS: delay={150} */}
            <SkeletonWrapper isLoaded={appLoaded} delay={150} skeleton={
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 12 }}>
                  <SkeletonBlock w={44} h={44} br="50%" th={th} />
                  <div style={{ flex: 1 }}><SkeletonBlock w="70%" h={22} br={6} th={th} style={{ marginBottom: 8 }} /><SkeletonBlock w="40%" h={14} br={4} th={th} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 'auto', paddingTop: 16 }}>
                  <SkeletonBlock w="100%" h={64} br={16} th={th} /><SkeletonBlock w="100%" h={64} br={16} th={th} />
                </div>
              </div>
            }>
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                  {/* HELYES POZÍCIÓ: Itt a valós tartalomban hívjuk meg a BlurFadeText-et! */}
                  <BlurFadeText 
                    text={isRaining ? '🌧' : (phase === 'night' || phase === 'evening') ? '🌙' : (phase === 'dawn' || phase === 'sunset') ? '🌅' : '⛅'} 
                    style={{ fontSize: 44, lineHeight: 1 }} 
                  />
                  <div>
                    <BlurFadeText 
                      text={isRaining ? 'Csapadékos Idő' : (phase === 'night' || phase === 'evening') ? 'Tiszta Éjszaka' : (phase === 'dawn') ? 'Napfelkelte' : (phase === 'sunset') ? 'Naplemente' : 'Enyhén Felhős'} 
                      style={{ ...ui, fontSize: 18, fontWeight: 600, color: th.t1, letterSpacing: '-0.01em', display: 'block' }} 
                    />
                    <div style={{ ...ui, fontSize: 13, color: th.t2, marginTop: 2 }}>Mérési folyamat stabil</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 'auto', paddingTop: 16 }}>
                  {[{ l: 'Látótávolság', v: liveData.visibility, u: 'km' }, { l: 'Csapadék', v: liveData.precipitation, u: 'mm/h' }].map(({ l, v, u }) => (
                    <div key={l} style={{ background: th.id==='day'?'rgba(15,23,42,0.02)':'rgba(255,255,255,0.02)', borderRadius: 16, padding: '12px 14px', border: `1px solid ${th.border}` }}>
                      <div style={{ ...ui, fontSize: 11, color: th.t2, marginBottom: 4 }}>{l}</div>
                      <div style={{ ...tech, fontSize: 18, fontWeight: 600, color: th.t1, display: 'flex', alignItems: 'baseline' }}>
                        <OdometerNumber value={v} format={n => n.toFixed(1)} />
                        <span style={{ ...ui, fontSize: 12, color: th.t2, marginLeft: 2, fontWeight: 400 }}>{u}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SkeletonWrapper>
          </div>
        </Card>

        {/* ── 3. A 4 KIS METRIKA ── */}
        <div className='mini2' style={{ gridColumn: 'span 4', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12 }}>
          {/* JAVÍTÁS: Itt adtuk hozzá a 'format' változót a kicsomagoláshoz! */}
          {metrics.map(({ label, value, unit, color, bar, icon, format }, i) => (
            <Card key={label} show={show} delay={190 + i * 55} t={th} style={{ padding: '16px 14px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                <Lbl t={th} style={{ flex: 1, minWidth: 0, marginBottom: 4, paddingRight: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</Lbl>
                <span style={{ fontSize: 14, opacity: .5, flexShrink: 0 }}>{icon}</span>
              </div>
              <div style={{ flex: 1, minHeight: 46 }}>
                <SkeletonWrapper isLoaded={appLoaded} delay={300 + i * 50} skeleton={
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
                    <SkeletonBlock w="70%" h={28} br={6} th={th} style={{ marginTop: 2 }} />
                    <SkeletonBlock w="100%" h={6} br={99} th={th} style={{ marginTop: 14 }} />
                  </div>
                }>
                  <div style={{ ...tech, fontSize: 24, fontWeight: 600, color, lineHeight: 1, marginTop: 4, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    
                    {/* Itt már biztonságosan megkapja a format szabályt */}
                    <OdometerNumber value={value} format={format} />
                    
                    <span style={{ ...ui, fontSize: 12, color: th.t2, fontWeight: 400, marginLeft: 2 }}>{unit}</span>
                  </div>
                  <Bar3 pct={bar} color={color} show={show} delay={300 + i * 50} />
                </SkeletonWrapper>
              </div>
            </Card>
          ))}
        </div>

        {/* ── 4. 24 ÓRÁS TRENDEK ── */}
        <Card show={show} delay={410} t={th} className='gc8' style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <Lbl t={th}>24 Órás Trendek</Lbl>
              <div style={{ ...ui, fontSize: 14, fontWeight: 500, color: th.t1 }}>Hőmérséklet és Relatív Páratartalom</div>
            </div>
            <div style={{ display: 'flex', gap: 16, ...ui, fontSize: 12 }}>
              {[[th.cT, 'Hőmérséklet °C'], [th.cH, 'Páratartalom %']].map(([col, lbl]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 3, background: col, borderRadius: 99 }} />
                  <span style={{ color: th.t2 }}>{lbl}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, width: '100%', minHeight: 210 }}>
            {/* LÉPÉSZETES IDŐZÍTÉS: delay={500} */}
            <SkeletonWrapper isLoaded={appLoaded} delay={500} skeleton={<SkeletonBlock w="100%" h="100%" br={12} th={th} />}>
              <ResponsiveContainer width='100%' height="100%">
                <AreaChart data={dynamicHourly} margin={{ top: 4, right: 24, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id='gT' x1='0' y1='0' x2='0' y2='1'><stop offset='5%' stopColor={th.cT} stopOpacity={.15} /><stop offset='95%' stopColor={th.cT} stopOpacity={0} /></linearGradient>
                    <linearGradient id='gH' x1='0' y1='0' x2='0' y2='1'><stop offset='5%' stopColor={th.cH} stopOpacity={.10} /><stop offset='95%' stopColor={th.cH} stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray='4' stroke={`${th.t2}15`} vertical={false} />
                  <XAxis dataKey='t' tick={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis tick={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  
                  {/* Figyelem: A dataKey 'temp' és 'hum' lett a régi 't' és 'rh' helyett */}
                  <Area type='monotone' dataKey='temp' stroke={th.cT} strokeWidth={2} fill='url(#gT)' dot={false} isAnimationActive={true} animationDuration={1200} animationEasing="ease-in-out" />
                  <Area type='monotone' dataKey='hum' stroke={th.cH} strokeWidth={1.5} fill='url(#gH)' dot={false} isAnimationActive={true} animationDuration={1200} animationEasing="ease-in-out" />
                </AreaChart>
              </ResponsiveContainer>
            </SkeletonWrapper>
          </div>
        </Card>

        {/* ── 5. SZÉL KOMPASZ ── */}
        <Card show={show} delay={460} t={th} className='gc4' style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column' }}>
          <Lbl t={th}>Széladatok</Lbl>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 210 }}>
            {/* LÉPÉSZETES IDŐZÍTÉS: delay={600} */}
            <SkeletonWrapper isLoaded={appLoaded} delay={600} skeleton={<SkeletonBlock w={180} h={180} br="50%" th={th} />}>
              
              <WindCompass show={show} t={th} direction={liveData.windDir} />
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: -8 }}>
                <div style={{ ...tech, fontSize: 26, fontWeight: 700, color: th.t1, display: 'flex' }}>
                  <OdometerNumber value={liveData.windDir} format={v => Math.round(v).toString()} />°
                </div>
                {/* ÚJ: Szöveges irányjelző áttűnése (pl. É-ÉK) */}
                <BlurFadeText 
                  text={getWindLabel(liveData.windDir)} 
                  style={{ ...ui, fontSize: 15, color: th.t2, fontWeight: 500 }} 
                />
              </div>

            </SkeletonWrapper>
          </div>
        </Card>

        {/* ── 6. CSAPADÉK BAR CHART ── */}
        <Card show={show} delay={510} t={th} className='gc8' style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 20 }}>
            <Lbl t={th}>Heti Csapadékmennyiség</Lbl>
            <div style={{ ...ui, fontSize: 14, fontWeight: 500, color: th.t1 }}>7 Napos Összesített Statisztika (mm)</div>
          </div>
          <div style={{ flex: 1, width: '100%', minHeight: 155 }}>
            {/* LÉPÉSZETES IDŐZÍTÉS: delay={700} */}
            <SkeletonWrapper isLoaded={appLoaded} delay={700} skeleton={<SkeletonBlock w="100%" h="100%" br={12} th={th} />}>
              <ResponsiveContainer width='100%' height="100%">
                <BarChart data={chartWeekly} margin={{ top: 4, right: 24, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray='4' stroke={`${th.t2}15`} vertical={false} />
                  <XAxis dataKey='t' tick={{ fontFamily: "'Inter',sans-serif", fontSize: 11, fill: th.t2, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fill: th.t2 }} axisLine={false} tickLine={false} />
                  
                  <Bar dataKey='acc' fill={th.cB} radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </SkeletonWrapper>
          </div>
        </Card>

        {/* ── 7. RENDSZER ÁLLAPOT ── */}
        <Card show={show} delay={560} t={th} className='gc4' style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column' }}>
          <Lbl t={th}>Rendszer Állapot</Lbl>
          <div style={{ flex: 1, minHeight: 155 }}>
            {/* LÉPÉSZETES IDŐZÍTÉS: delay={800} */}
            <SkeletonWrapper isLoaded={appLoaded} delay={800} skeleton={
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', marginTop: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><SkeletonBlock w="40%" h={14} br={4} th={th} /><SkeletonBlock w="15%" h={14} br={4} th={th} /></div>
                      <SkeletonBlock w="100%" h={6} br={99} th={th} />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: 14 }}><SkeletonBlock w="100%" h={110} br={8} th={th} /></div>
              </div>
            }>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {status.map(({ label, value, color, unit, bar, format }, i) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, ...ui, fontSize: 13 }}>
                      <span style={{ color: th.t2 }}>{label}</span>
                      <span style={{ ...tech, color, fontWeight: 600, display: 'flex', alignItems: 'baseline' }}>
                        <PremiumUpdateValue value={format(value)} th={th} />
                        <span style={{ ...ui, fontSize: 11, color: th.t2, marginLeft: 2, fontWeight: 500 }}>{unit}</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(128,128,128,0.10)', borderRadius: 99, overflow: 'hidden' }}>
                      {/* ÚJ: Rendszeradatok GPU gyorsított vajsima rugóanimációja */}
                      <div style={{ height: '100%', borderRadius: 99, background: color, width: '100%', transformOrigin: 'left', transform: `scaleX(${show ? bar / 100 : 0})`, transition: `transform 1s cubic-bezier(0.34, 1.56, 0.64, 1) ${720 + i * 110}ms`, willChange: 'transform' }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 6, paddingTop: 14, borderTop: `1px solid ${th.border}` }}>
                  {[
                    ['Alvó Ciklusok (Ma)', liveData.sleepCycles, th.a],
                    ['Deep Sleep Arány', `${liveData.deepSleep}%`, th.p],
                    ['Uptime diagnosztika', calculateUptime(liveData.sleepCycles), th.t1], // Élő kalkuláció!                    ['Sikeres Adatcsomagok', liveData.packets.toLocaleString('hu-HU'), th.v],
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, ...ui, fontSize: 12.5 }}>
                      <span style={{ color: th.t2 }}>{l}</span>
                      <span style={{ ...tech, color: c, fontWeight: 500 }}>
    {l === 'Uptime diagnosztika' ? v : <PremiumUpdateValue value={v} th={th} />}
  </span>
                    </div>
                  ))}
                </div>
              </div>
            </SkeletonWrapper>
          </div>
        </Card>
      </div>

      
    </div>
  );
}

/* ═══════════════ PREMIUM GLOBAL SMOOTH SCROLL (Awwwards Style) ═══════════════ */
function SmoothScroll({ children }) {
  const scrollRef = useRef(null);
  const [pageHeight, setPageHeight] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // 1. Eszköz érzékelése: Mobilon/Tableten visszaadjuk a natív, oprendszer szintű tökéletes görgetést
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 900 || window.matchMedia("(pointer: coarse)").matches);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 2. A tartalom valós magasságának figyelése (ha lenyitsz egy menüt, a magasság dinamikusan nő)
  useEffect(() => {
    if (isMobile || !scrollRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      setPageHeight(entries[0].contentRect.height);
    });
    resizeObserver.observe(scrollRef.current);
    return () => resizeObserver.disconnect();
  }, [children, isMobile]);

  // 3. A GPU gyorsított fizikai görgetőmotor (Lerp animáció)
  useEffect(() => {
    if (isMobile) return;
    let current = window.scrollY;
    let target = window.scrollY;
    let rafId;

    const animate = () => {
      target = window.scrollY;
      
      // Interpoláció: a jelenlegi pozíció mindig 8%-kal közelít a cél felé képkockánként
      if (Math.abs(target - current) > 0.1) {
        current += (target - current) * 0.08;
        if (scrollRef.current) {
          scrollRef.current.style.transform = `translate3d(0, -${current}px, 0)`;
        }
      }
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isMobile]);

  if (isMobile) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Ez a láthatatlan doboz csapja be a böngészőt, hogy létrehozzon egy natív görgetősávot */}
      <div style={{ height: pageHeight }} />
      
      {/* Ez a rögzített üveglap mozgatja a tartalmat a GPU-val, miközben a görgetősávot húzod */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        overflow: 'hidden', pointerEvents: 'none', zIndex: 10
      }}>
        <div ref={scrollRef} style={{ pointerEvents: 'auto', width: '100%', willChange: 'transform' }}>
          {children}
        </div>
      </div>
    </>
  );
}

/* ═══════════════ MAIN APP ROUTER ═══════════════ */
export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [simPhase, setSimPhase] = useState('day');
  const [simRain, setSimRain] = useState(false);
  const [simWind, setSimWind] = useState(false);
  // ─── IOT IDŐGÉP ÉS SZIMULÁTOR ───
  const [mockTimeOffset, setMockTimeOffset] = useState(0);
  const [lastDataTimestamp, setLastDataTimestamp] = useState(Date.now());
  const simulatedTime = new Date(Date.now() + mockTimeOffset);

  // ─── TOAST: 1. A memóriatároló és az indító függvény ───
  const [toasts, setToasts] = useState([]);

  // ─── HIDEGINDÍTÁS (COLD START) ÁLLAPOT ───
  const [appLoaded, setAppLoaded] = useState(false);

  // ÚJ: Grafikonok globális állapota a "Csúszó Ablak" (Sliding Window) effektushoz
  const [chartHourly, setChartHourly] = useState(hourly);
  const [chartWeekly, setChartWeekly] = useState(weekly);

  // Élő, frissülő adat szimulációja minden kártyához
  const [liveData, setLiveData] = useState({
    temp: R.temp,
    humidity: R.humidity,
    pressure: R.pressure,
    windSpeed: R.windSpeed,
    uvIndex: R.uvIndex,
    lux: R.lux,
    windDir: R.windDir,
    feelsLike: R.feelsLike,
    dewPoint: R.dewPoint,
    visibility: R.visibility,
    precipitation: R.precipitation,
    // ÚJ RENDSZER ADATOK:
    battery: 78,
    wifi: 92,
    internalTemp: 42.5, // ÚJ: ESP32-S3 Belső hőmérséklet
    packets: 12864,
    sleepCycles: 247,
    deepSleep: 91.3
  });
  useEffect(() => {
    const fetchLatestData = async () => {
      try {
        // BIZTONSÁGI HÁLÓ: Letiltjuk a cache-elést, hogy mindig friss adat jöjjön!
        const response = await fetch(`/api/latest?_=${Date.now()}`, { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (!response.ok) throw new Error('API nem elérhető lokálisan');
        
        const data = await response.json();
        
        if (data.temperature !== undefined) {
          const t = Number(data.temperature);
          const h = Number(data.humidity);

          // Harmatpont (Magnus-formula)
          const a = 17.27, b = 237.7;
          const alpha = (a * t) / (b + t) + Math.log(h / 100);
          const dewPoint = (b * alpha) / (a - alpha);

          // Hőérzet (egyszerűsített)
          const feelsLike = (t <= 10 && data.wind_speed > 4.8)
            ? 13.12 + 0.6215 * t - 11.37 * Math.pow(data.wind_speed, 0.16) + 0.3965 * t * Math.pow(data.wind_speed, 0.16)
            : t;

          setLiveData(prev => ({
            ...prev,
            temp: t !== undefined ? Number(t) : prev.temp,
            humidity: h !== undefined ? Number(h) : prev.humidity,
            pressure: data.pressure !== undefined ? Number(data.pressure) : prev.pressure,
            windSpeed: data.wind_speed !== undefined ? Number(data.wind_speed) : prev.windSpeed,
            windDir: data.wind_direction !== undefined ? Number(data.wind_direction) : prev.windDir,
            precipitation: data.rain !== undefined ? Number(data.rain) : prev.precipitation,
            uvIndex: data.uv !== undefined ? Number(data.uv) : prev.uvIndex,
            lux: data.lux !== undefined ? Number(data.lux) : prev.lux,
            dewPoint: parseFloat((dewPoint || 0).toFixed(1)),
            feelsLike: parseFloat((feelsLike || 0).toFixed(1)),
            visibility: parseFloat(estimateVisibility(t || 0, dewPoint || 0, data.rain || 0).toFixed(1)),
            battery: data.battery_voltage ? Math.min(100, Math.round((Number(data.battery_voltage) / 4.2) * 100)) : prev.battery,

            wifi: data.wifi_signal !== undefined ? Number(data.wifi_signal) : prev.wifi,
            internalTemp: data.internal_temp !== undefined ? Number(data.internal_temp) : prev.internalTemp,
            packets: data.packets_sent !== undefined ? Number(data.packets_sent) : prev.packets,
            sleepCycles: data.sleep_cycles !== undefined ? Number(data.sleep_cycles) : prev.sleepCycles,
            deepSleep: data.deep_sleep_pct !== undefined ? Number(data.deep_sleep_pct) : prev.deepSleep
          }));
          if (data._time) setLastDataTimestamp(new Date(data._time).getTime());
        }
        setAppLoaded(true);
      } catch (error) {
        // Lokális fejlesztésnél ide ugrik be, így a MOCK DATA marad a képernyőn!
        console.log("Lokális mód: Statikus adatok használata az élő adatok helyett.");
        setAppLoaded(true); 
      }
    };

    fetchLatestData();
    // const interval = setInterval(fetchLatestData, 15 * 60 * 1000);
    const interval = setInterval(fetchLatestData, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── ÚJ: A GRAFIKONOK (1 Nap és 1 Hét) ADATAINAK PÁRHUZAMOS LEKÉRÉSE ───
  useEffect(() => {
    const fetchHistoryData = async () => {
      try {
        // Promise.all: Egyszerre (párhuzamosan) indítjuk a két hálózati kérést, így kétszer olyan gyors!
        const [resDaily, resWeekly] = await Promise.all([
          fetch(`/api/history?range=1d&_=${Date.now()}`, { cache: 'no-store' }),
          fetch(`/api/history?range=1w&_=${Date.now()}`, { cache: 'no-store' })
        ]);
        
        if (!resDaily.ok || !resWeekly.ok) throw new Error('API nem elérhető');
        
        const dataDaily = await resDaily.json();
        const dataWeekly = await resWeekly.json();
        
        if (dataDaily && dataDaily.length > 0) {
          setChartHourly(dataDaily); // 24 Órás Hőmérséklet/Pára grafikon
        }
        if (dataWeekly && dataWeekly.length > 0) {
          setChartWeekly(dataWeekly); // 7 Napos Csapadék grafikon
        }
      } catch (error) {
        console.log("Lokális mód: Grafikonok tesztadatokkal futnak.");
      }
    };

    fetchHistoryData();
    const interval = setInterval(fetchHistoryData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const addToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg }]);
    // 3.6 másodperc után töröljük a memóriából
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3600); 
  };
  // ────────────────────────────────────────────────────────

  // JAVÍTÁS: Most már a liveData-t figyelik, így a gombnyomásra reagálni fognak!
  const currentHour = new Date().getHours();
  const phase = simPhase || getPhase(currentHour);
  const isRaining = simRain || (liveData.precipitation > 0);
  const isWindy = simWind || (liveData.windSpeed > 25);
  const th = TH[phase];

  // Automatikus görgetés a lap tetejére oldalváltáskor
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  useEffect(() => {
    const lk = document.createElement('link');
    lk.rel = 'stylesheet';
    lk.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(lk);
    const st = document.createElement('style');
    st.textContent = `
      @keyframes star-twinkle { 0%,100%{ opacity:var(--so,0.4); } 50%{ opacity:calc(var(--so,0.4)*.18); } }
      @keyframes temp-glow { 0%,100%{ text-shadow:0 0 24px rgba(255,179,71,0.15); } 50%{ text-shadow:0 0 32px rgba(255,179,71,0.35); } }

      /* ─── SMART INSIGHT ANIMÁCIÓK ─── */
      @keyframes insight-shimmer { 0%{ background-position:200% 0; } 100%{ background-position:-200% 0; } }
      @keyframes insight-cursor-blink { 0%,100%{ opacity:1; } 50%{ opacity:0; } }
      .insight-cursor { display:inline-block; margin-left:1px; animation: insight-cursor-blink 0.85s step-start infinite; }
      @keyframes insight-tags-in { from{ opacity:0; transform:translateY(6px); } to{ opacity:1; transform:translateY(0); } }
      @keyframes live-pulse { 0%,100%{ box-shadow:0 0 0 0 rgba(57,255,159,.4),0 0 6px rgba(57,255,159,.2); } 50%{ box-shadow:0 0 0 5px rgba(57,255,159,0),0 0 14px rgba(57,255,159,.5); } }
      
      /* ─── PREMIUM SKELETON SHIMMER ─── */
      @keyframes skeleton-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      .skeleton-base {
        background-size: 200% 100%;
        animation: skeleton-shimmer 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      }

      /* ─── ULTRA-PREMIUM APPLE-STYLE UPDATE ANIMATION ─── */
      @keyframes premium-data-update {
        0% { opacity: 0; transform: translateY(4px) scale(0.95); color: var(--flash-color); }
        12% { opacity: 1; transform: translateY(0) scale(1); color: var(--flash-color); }
        100% { opacity: 1; transform: translateY(0) scale(1); color: inherit; }
      }

      /* A TOAST ANIMÁCIÓJA */
      @keyframes toast-anim {
        0% { opacity: 0; transform: translateY(-30px) scale(0.9); filter: blur(8px); }
        8% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        92% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        100% { opacity: 0; transform: translateY(-20px) scale(0.95); filter: blur(8px); }
      }

      /* PREMIUM 3D CARD HOVER */
      .meteo-card:hover {
        --start-y: -4px !important;
        box-shadow: 0 22px 44px rgba(0,0,0,0.15) !important;
        filter: brightness(1.02);
      }
      
      .card-glare {
        opacity: 0;
        transition: opacity 0.5s ease;
      }
      
      .meteo-card:hover .card-glare {
        opacity: 1;
      }
      
      /* Mobilon (ahol nincs egér) kikapcsoljuk a térbeli dőlést és a csillogást */
      @media (hover: none) {
        .card-glare { display: none !important; }
        .meteo-card { transform: translateY(var(--start-y, 22px)) !important; }
      }
      
      .page-container {
        position: relative; z-index: 1; max-width: 1440px; margin: 0 auto;
        padding: 102px 24px 80px; 
        transition: padding 0.4s ease;
      }

      .smart-nav-wrapper {
        position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
        z-index: 200; height: 52px; width: calc(100% - 32px); max-width: 1000px;
        border-radius: 99px; overflow: hidden; display: flex; align-items: center; 
        padding: 0 0 0 16px; transition: background 1s ease, border-color 1s ease, bottom 0.4s ease, top 0.4s ease;
      }
      
      /* A smart-nav-scroll eltűnt, mert inline style-okba tettük a GPU gyorsításhoz */

      .nav-logo { display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-right: 8px; padding-right: 12px; }
      .nav-btn { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 99px; cursor: pointer; border: 1px solid transparent; transition: all 0.3s cubic-bezier(0.16,1,0.3,1); outline: none; flex-shrink: 0; white-space: nowrap; }
      .nav-icon { font-size: 12px; transition: all 0.3s; }
      .nav-label { font-family: 'Inter', sans-serif; font-size: 12px; transition: all 0.3s; }
      .nav-label-mobile { display: none; }

      @media(max-width: 900px) {
        .page-container { padding: 40px 24px 110px !important; }
        .smart-nav-wrapper { top: auto !important; bottom: 16px !important; width: calc(100% - 24px) !important; height: auto !important; border-radius: 24px !important; padding: 0 4px !important; }
        /* .smart-nav-scroll { padding: 8px 0 !important; justify-content: space-between !important; width: 100%; -webkit-mask-image: none !important; mask-image: none !important; } */        .nav-logo { display: none !important; }
        .nav-btn { flex-direction: column !important; gap: 4px !important; padding: 8px 2px !important; flex: 1 1 0px !important; min-width: 0 !important; border-radius: 16px !important; }
        .nav-icon { font-size: 20px !important; }
        .nav-label { display: none !important; }
        .nav-label-mobile { display: block !important; font-family: 'Inter', sans-serif; font-size: 9px; letter-spacing: -0.02em; white-space: nowrap; text-align: center; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
      }

      @media(max-width:900px){ .mg{ grid-template-columns:repeat(4,1fr)!important; } .gc8, .gc4{ grid-column:span 4!important; } .mini2{ grid-template-columns:1fr 1fr!important; } }
      @media(max-width:560px){ .mg{ grid-template-columns:1fr 1fr!important; } .gc8,.gc4{ grid-column:span 2!important; } .mini2{ grid-template-columns:1fr 1fr!important; } }

      /* ÚJ: Megakadályozza, hogy a CSS Grid oszlopok szétnyomják a képernyőt (CSS Grid Blowout fix) */
      .mg > * { min-width: 0; }
      `;
    document.head.appendChild(st);
    return () => { try { document.head.removeChild(lk); document.head.removeChild(st); } catch (e) { } };
  }, []);

// ─── DINAMIKUS BÖNGÉSZŐFÜL (FAVICON ÉS CÍMSOR) ───
  useEffect(() => {
    // 1. Kapcsolat ellenőrzése (Offline védelem)
    const diffMins = (simulatedTime.getTime() - lastDataTimestamp) / 60000;
    const isOffline = diffMins >= 30;

    // 2. Favicon logika (Prioritás: Offline -> Vihar -> Eső -> Napszak)
    let currentIcon = '☀️';
    if (isOffline) {
      currentIcon = '⚠️';
    } else if (isRaining) {
      currentIcon = '🌧️';
    } else if (isWindy) {
      currentIcon = '💨';
    } else if (phase === 'night' || phase === 'evening') {
      currentIcon = '🌙';
    } else if (phase === 'dawn' || phase === 'sunset') {
      currentIcon = '🌅';
    }

    // SVG generálás és beillesztés (középre igazítva, hogy ne vágódjon le a szél)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="100">${currentIcon}</text></svg>`;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(svg)}`);

    // 3. Szöveg logika (Kontextusfüggő adatok)
    const pageLabels = {
      'dashboard': 'Főoldal', 'temperature': 'Hőmérséklet', 'humidity': 'Páratartalom',
      'pressure': 'Légnyomás', 'brightness': 'UV és Fényerő', 'precipitation': 'Csapadék', 'wind': 'Széladatok'
    };

    // Kiválasztjuk az aloldalhoz illő legfontosabb adatot (ÉLŐ adatból, nem a statikus mock-ból!)
    let activeData = `${liveData.temp.toFixed(1)}°C`; // Alapértelmezett
    
    if (isOffline) {
      activeData = 'Offline';
    } else {
          switch (currentPage) {
            case 'humidity':      activeData = `${liveData.humidity}%`; break;
            case 'pressure':      activeData = `${Math.round(liveData.pressure)} hPa`; break;
            case 'wind':          activeData = `${liveData.windSpeed.toFixed(1)} km/h`; break;
            case 'precipitation': activeData = `${liveData.precipitation.toFixed(1)} mm`; break;
            case 'brightness':    activeData = `${liveData.uvIndex.toFixed(1)} UVI`; break;
            default:              activeData = `${liveData.temp.toFixed(1)}°C`; // Hőmérséklet és Dashboard
          }
        }

    // Címsor beállítása
    document.title = `${activeData} · ${pageLabels[currentPage]} · METEO`;

  }, [currentPage, phase, isRaining, isWindy, liveData, simulatedTime, lastDataTimestamp]);

  // ─── TOAST: 2. Az addToast függvény átadása az aloldalaknak ───
  const renderPage = () => {
    switch (currentPage) {
      case 'temperature':   return <TemperaturePage th={th} addToast={addToast} liveData={liveData} />;
      case 'humidity': return <HumidityPage th={th} addToast={addToast} liveData={liveData} />;
      case 'pressure': return <PressurePage th={th} addToast={addToast} liveData={liveData} />;
      case 'brightness':    return <BrightnessPage th={th} isRaining={isRaining} addToast={addToast} />;
      case 'precipitation': return <PrecipitationPage th={th} addToast={addToast} liveData={liveData} />;
      case 'wind':          return <WindPage th={th} addToast={addToast} liveData={liveData} />;
      default: return <DashboardContent phase={phase} th={th} isRaining={isRaining} isWindy={isWindy} setCurrentPage={setCurrentPage} appLoaded={appLoaded} liveData={liveData} chartHourly={chartHourly} chartWeekly={chartWeekly} />;
    }  };
  // ─────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden', color: th.t1, fontFamily: "'Inter', sans-serif", transition: 'color 1.5s ease' }}>
      
      <SkyBackground phase={phase} hour={currentHour} isRaining={isRaining} isWindy={isWindy} />
      <NavBar 
        currentPage={currentPage} setCurrentPage={setCurrentPage} th={th} 
        simulatedTime={simulatedTime} lastDataTimestamp={lastDataTimestamp} 
      />

      {/* ─── TOAST: 3. A megjelenítő konténer beillesztése ─── */}
      <ToastContainer toasts={toasts} th={th} />
      {/* ─────────────────────────────────────────────────── */}

      <SmoothScroll>
        {renderPage()}
      </SmoothScroll>
      
      {/* Vezérlőgombok (Demo) */}
      <div style={{ position: 'fixed', bottom: 18, right: 18, zIndex: 300, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 320 }}>
          {['night', 'dawn', 'day', 'sunset', 'evening'].map(ph => (
            <button key={ph} onClick={() => setSimPhase(simPhase === ph ? null : ph)}
              style={{
                padding: '4px 9px', borderRadius: 8, cursor: 'pointer',
                background: simPhase === ph ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.28)',
                color: simPhase === ph ? '#111' : 'rgba(255,255,255,0.75)',
                fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: '.08em', textTransform: 'capitalize'
              }}>
              {ph}
            </button>
          ))}
          <button onClick={() => setSimRain(r => !r)}
            style={{ padding: '4px 10px', borderRadius: 8, cursor: 'pointer', background: simRain ? 'rgba(100,180,255,0.85)' : 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.28)', color: simRain ? '#0a2140' : 'rgba(255,255,255,0.75)', fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: '.08em' }}>
            🌧 Rain
          </button>
          <button onClick={() => setSimWind(w => !w)}
            style={{ padding: '4px 10px', borderRadius: 8, cursor: 'pointer', background: simWind ? 'rgba(180,220,255,0.80)' : 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.28)', color: simWind ? '#0a2140' : 'rgba(255,255,255,0.75)', fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: '.08em' }}>
            💨 Wind
          </button>
          {/* ELVÁLASZTÓ */}
          <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.15)', margin: '2px 0' }} />
          
          {/* TIME MACHINE GOMBOK */}
          <button onClick={() => setMockTimeOffset(prev => prev + 60000)}
            style={{ padding: '4px 10px', borderRadius: 8, cursor: 'pointer', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.28)', color: 'rgba(255,255,255,0.75)', fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: '.08em' }}>
            ⏱ +1 Perc
          </button>
          <button onClick={() => { 
            setLastDataTimestamp(simulatedTime.getTime()); 
            
            setLiveData(prev => {
              // Nagyobb kilengések, hogy látványosabb legyen a grafikon hajlása
              const newTemp = parseFloat((prev.temp + (Math.random() > 0.5 ? 0.9 : -0.9)).toFixed(1));
              const newHum = Math.max(0, Math.min(100, Math.round(prev.humidity + (Math.random() > 0.5 ? 4 : -4))));
              
              // Csapadék szimulálása: 40% esély egy hirtelen zuhéra (0 - 2.5 mm között)
              const precipSpike = Math.random() > 0.6 ? parseFloat((Math.random() * 2.5).toFixed(1)) : 0;
              const newPrecip = parseFloat((prev.precipitation + precipSpike).toFixed(1));

              // 1. GÖRDÜLŐ ABLAK (Sliding Window): A 24 órás trendhez
              setChartHourly(prevChart => {
                const newChart = [...prevChart.slice(1)];
                const lastEntry = prevChart[prevChart.length - 1];
                const lastTime = lastEntry.t || lastEntry.h || '00:00';  // ÚJ: rugalmas, mindkét formátumot kezeli
                let [hh] = lastTime.split(':');
                let nextH = (parseInt(hh, 10) + 1) % 24;
                newChart.push({ t: `${String(nextH).padStart(2, '0')}:00`, temp: newTemp, hum: newHum });
                return newChart;
              });

              // 2. FOLYADÉK OSZLOP: A heti csapadékhoz
              if (precipSpike > 0) {
                setChartWeekly(prevChart => {
                  const newChart = [...prevChart];
                  newChart[newChart.length - 1] = {
                    ...newChart[newChart.length - 1],
                    acc: parseFloat((newChart[newChart.length - 1].acc + precipSpike).toFixed(1))
                  };
                  return newChart;
                });
              }

              return {
                ...prev,
                temp: newTemp, humidity: newHum, precipitation: newPrecip,
                pressure: parseFloat((prev.pressure + (Math.random() > 0.5 ? 1.2 : -1.2)).toFixed(1)),
                windSpeed: parseFloat((Math.max(0, prev.windSpeed + (Math.random() > 0.5 ? 2.5 : -1.5))).toFixed(1)),
                uvIndex: parseFloat((Math.max(0, prev.uvIndex + (Math.random() > 0.5 ? 0.4 : -0.4))).toFixed(1)),
                windDir: Math.round((prev.windDir + (Math.random() * 50 - 25) + 360) % 360),
                feelsLike: parseFloat((newTemp - 1.2 + Math.random() * 0.5).toFixed(1)), 
                dewPoint: parseFloat((newTemp - 6.5 + Math.random() * 0.5).toFixed(1)),  
                visibility: parseFloat((Math.max(1, prev.visibility + (Math.random() > 0.5 ? 0.2 : -0.2))).toFixed(1)),
                battery: Math.max(0, Math.min(100, prev.battery + (Math.random() > 0.8 ? -1 : 0))), 
                wifi: Math.max(0, Math.min(100, Math.round(prev.wifi + (Math.random() > 0.5 ? 3 : -3)))), 
                // A belső hő egy picit követi a külső hőt, de melegebb
                internalTemp: parseFloat((newTemp + 18 + Math.random() * 2).toFixed(1)),
                packets: prev.packets + Math.floor(Math.random() * 8 + 1),
                sleepCycles: prev.sleepCycles + (Math.random() > 0.6 ? 1 : 0),
                deepSleep: parseFloat((Math.max(0, Math.min(100, prev.deepSleep + (Math.random() > 0.5 ? 0.2 : -0.2)))).toFixed(1))
              };
            });
            addToast("Új szenzor adatcsomag beérkezett!"); 
          }}
            style={{ padding: '4px 10px', borderRadius: 8, cursor: 'pointer', background: 'rgba(52, 211, 153, 0.85)', border: '1px solid rgba(255,255,255,0.28)', color: '#022c22', fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: '.08em', fontWeight: 700 }}>
            📡 Új Adat
          </button>
        </div>
      </div>

    </div>
  );
}