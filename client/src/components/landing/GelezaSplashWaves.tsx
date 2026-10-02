import React, { useEffect, useState } from 'react';
import { readSky, type SkyMoment } from '../../utils/solarClock';
import { type CampusWeather } from '../../utils/campusWeather';
import { unlightCampus } from '../../utils/campusLights';

const WIDTH = 1440;

type Edge = {
  y: number;
  amp: number;
  cycles: number;
  phase: number;
};

type Ribbon = {
  top: Edge;
  bottom: Edge;
  lines: number;
  accent: 'gold' | 'bronze';
};

function pointY(edge: Edge, x: number): number {
  const t = (x / WIDTH) * Math.PI * 2 * edge.cycles + edge.phase;
  return edge.y + Math.sin(t) * edge.amp + Math.sin(t * 0.55 + 0.4) * edge.amp * 0.12;
}

function blendEdge(top: Edge, bottom: Edge, amount: number): Edge {
  return {
    y: top.y + (bottom.y - top.y) * amount,
    amp: top.amp + (bottom.amp - top.amp) * amount,
    cycles: top.cycles + (bottom.cycles - top.cycles) * amount,
    phase: top.phase + (bottom.phase - top.phase) * amount,
  };
}

function smoothPath(points: Array<[number, number]>): string {
  const first = points[0];
  let d = `M ${first[0].toFixed(1)} ${first[1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function edgePath(edge: Edge): string {
  const points: Array<[number, number]> = [];
  const steps = 36;
  for (let step = 0; step <= steps; step += 1) {
    const x = -60 + (step / steps) * (WIDTH + 120);
    points.push([x, pointY(edge, x)]);
  }
  return smoothPath(points);
}

const UPPER: Edge[] = [
  { y: 42, amp: 26, cycles: 0.7, phase: 0.2 },
  { y: 86, amp: 34, cycles: 0.64, phase: 0.55 },
];

const RIBBONS: Ribbon[] = [
  {
    accent: 'gold',
    lines: 26,
    top: { y: 548, amp: 78, cycles: 0.78, phase: 0.15 },
    bottom: { y: 668, amp: 96, cycles: 0.78, phase: 0.15 },
  },
  {
    accent: 'bronze',
    lines: 22,
    top: { y: 690, amp: 88, cycles: 0.74, phase: 0.42 },
    bottom: { y: 820, amp: 112, cycles: 0.74, phase: 0.42 },
  },
];

const UPPER_PATHS = UPPER.map((edge) => edgePath(edge));

const RIBBON_PATHS = RIBBONS.flatMap((ribbon) =>
  Array.from({ length: ribbon.lines }, (_, line) => {
    const amount = ribbon.lines === 1 ? 0 : line / (ribbon.lines - 1);
    return {
      d: edgePath(blendEdge(ribbon.top, ribbon.bottom, amount)),
      line,
      accent: ribbon.accent,
    };
  })
);

function weatherWash(weather: CampusWeather) {
  if (weather.kind === 'storm') return { color: 'rgb(28, 34, 52)', opacity: 0.62 };
  if (weather.kind === 'rain') return { color: 'rgb(58, 72, 92)', opacity: 0.48 };
  if (weather.kind === 'snow') return { color: 'rgb(196, 208, 218)', opacity: 0.34 };
  if (weather.kind === 'fog') return { color: 'rgb(186, 192, 196)', opacity: 0.5 };
  if (weather.kind === 'overcast') return { color: 'rgb(96, 108, 122)', opacity: 0.46 };
  if (weather.kind === 'cloudy') return { color: 'rgb(150, 168, 186)', opacity: 0.22 + weather.cloudCover * 0.2 };
  return { color: 'rgb(176, 198, 214)', opacity: weather.cloudCover * 0.22 };
}

export const GelezaSplashWaves: React.FC<{ weather: CampusWeather }> = ({ weather }) => {
  const [sky, setSky] = useState<SkyMoment>(() => readSky());
  const [lightsOffPlate, setLightsOffPlate] = useState('');

  useEffect(() => {
    const tick = () => setSky(readSky());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    unlightCampus().then((url) => {
      if (alive) setLightsOffPlate(url);
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const sunUp = sky.altitude > 0 && weather.kind !== 'storm' && weather.kind !== 'fog';
  const sunOpacity = Math.max(0, 1 - weather.cloudCover * 0.95) * (weather.kind === 'rain' ? 0.35 : 1);
  const wash = weatherWash(weather);
  const dayPlate = lightsOffPlate || '/assets/campus-night.jpg';

  return (
    <div className="geleza-waves absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <style>{`
        .geleza-waves {
          --wave-crest: #8a6424;
          --wave-line: rgba(122, 86, 28, 0.62);
          --wave-deep: rgba(140, 100, 36, 0.32);
          --wave-bronze: #6e4e18;
          --wave-bronze-line: rgba(110, 78, 24, 0.42);
          --wave-glow: rgba(168, 124, 42, 0.28);
        }
        html.dark .geleza-waves,
        html[data-theme="dark"] .geleza-waves {
          --wave-crest: #f6e6b4;
          --wave-line: rgba(214, 176, 92, 0.72);
          --wave-deep: rgba(176, 132, 58, 0.4);
          --wave-bronze: #e7c56a;
          --wave-bronze-line: rgba(198, 154, 72, 0.48);
          --wave-glow: rgba(244, 214, 140, 0.62);
        }
        @keyframes gelezaRain {
          from { background-position: 0 -180px; }
          to { background-position: -28px 180px; }
        }
      `}</style>
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{ background: `linear-gradient(to bottom, ${sky.skyTop}, ${sky.skyBottom})` }}
      />
      <img
        src={dayPlate}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700"
        style={{
          opacity: 1 - sky.lights,
          filter: `brightness(${1.2 + sky.daylight * 0.75}) saturate(${0.82 + sky.daylight * 0.25}) contrast(1.04)`,
        }}
      />
      <img
        src="/assets/campus-night.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700"
        style={{
          opacity: sky.lights,
          filter: `brightness(${0.78 + sky.daylight * 0.28}) saturate(0.92)`,
        }}
      />
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background: `linear-gradient(to bottom, ${sky.skyTop}, ${sky.skyTop}99 22%, transparent 48%)`,
          mixBlendMode: 'soft-light',
          opacity: 0.3 + sky.daylight * (1 - sky.lights) * 0.55,
        }}
      />
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background: `linear-gradient(to bottom, ${wash.color}, transparent 46%)`,
          opacity: wash.opacity,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, transparent 42%, rgba(7,8,13,${0.1 + sky.lights * 0.42}) 100%)`,
        }}
      />
      {sunUp && sunOpacity > 0.05 && (
        <div
          className="absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${sky.x}%`,
            top: `${sky.y}%`,
            opacity: sunOpacity,
            background: `radial-gradient(circle, #fff 0%, ${sky.sun} 42%, rgba(255, 210, 120, 0) 72%)`,
            boxShadow: `0 0 24px 8px ${sky.sun}, 0 0 60px 16px rgba(255, 196, 90, 0.35)`,
          }}
        />
      )}
      {(weather.kind === 'rain' || weather.kind === 'storm' || weather.precipitation > 0.2) && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'repeating-linear-gradient(102deg, rgba(255,255,255,0) 0 14px, rgba(226,236,244,0.55) 15px, rgba(255,255,255,0) 17px)',
            backgroundSize: '100% 220px',
            animation: 'gelezaRain 0.7s linear infinite',
            opacity: weather.kind === 'storm' ? 0.55 : 0.38,
          }}
        />
      )}
      {weather.kind === 'snow' && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 0 1.5px, transparent 2px)',
            backgroundSize: '28px 36px',
            animation: 'gelezaRain 2.8s linear infinite',
            opacity: 0.7,
          }}
        />
      )}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {UPPER_PATHS.map((d) => (
          <path key={d} d={d} fill="none" stroke="var(--wave-line)" strokeWidth="1.15" strokeLinecap="round" />
        ))}
        {RIBBON_PATHS.map((ribbon) => {
          const crest = ribbon.line === 0;
          const near = ribbon.line < 3;
          const bronze = ribbon.accent === 'bronze';
          const stroke = crest
            ? bronze
              ? 'var(--wave-bronze)'
              : 'var(--wave-crest)'
            : near
              ? bronze
                ? 'var(--wave-bronze-line)'
                : 'var(--wave-line)'
              : bronze
                ? 'var(--wave-bronze-line)'
                : 'var(--wave-deep)';
          return (
            <g key={`${ribbon.accent}-${ribbon.line}`}>
              {crest && (
                <path d={ribbon.d} fill="none" stroke="var(--wave-glow)" strokeWidth="8" strokeLinecap="round" />
              )}
              <path
                d={ribbon.d}
                fill="none"
                stroke={stroke}
                strokeWidth={crest ? 2.35 : 0.85}
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
