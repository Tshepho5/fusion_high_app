import React from 'react';

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
  accent: 'cyan' | 'pink';
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
    accent: 'cyan',
    lines: 26,
    top: { y: 548, amp: 78, cycles: 0.78, phase: 0.15 },
    bottom: { y: 668, amp: 96, cycles: 0.78, phase: 0.15 },
  },
  {
    accent: 'pink',
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

export const GelezaSplashWaves: React.FC = () => {
  return (
    <div className="geleza-waves absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <style>{`
        .geleza-waves {
          --wave-crest: #0f766e;
          --wave-line: rgba(14, 116, 144, 0.55);
          --wave-deep: rgba(8, 145, 178, 0.28);
          --wave-pink: #9d174d;
          --wave-pink-line: rgba(157, 23, 78, 0.4);
          --wave-glow: rgba(8, 145, 178, 0.28);
        }
        html.dark .geleza-waves,
        html[data-theme="dark"] .geleza-waves {
          --wave-crest: #d8fffe;
          --wave-line: rgba(24, 226, 236, 0.62);
          --wave-deep: rgba(14, 165, 180, 0.34);
          --wave-pink: #F9A8D4;
          --wave-pink-line: rgba(244, 114, 182, 0.45);
          --wave-glow: rgba(24, 226, 236, 0.7);
        }
      `}</style>
      <div className="absolute inset-0 bg-[#e8f2f6] dark:bg-[#05080f] transition-colors duration-300" />
      <div className="absolute inset-0 dark:bg-[radial-gradient(ellipse_at_center,rgba(8,16,28,0)_0%,rgba(0,0,0,0.55)_100%)]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {UPPER_PATHS.map((d) => (
          <path key={d} d={d} fill="none" stroke="var(--wave-line)" strokeWidth="1.15" strokeLinecap="round" />
        ))}
        {RIBBON_PATHS.map((ribbon) => {
          const crest = ribbon.line === 0;
          const near = ribbon.line < 3;
          const pink = ribbon.accent === 'pink';
          const stroke = crest
            ? pink
              ? 'var(--wave-pink)'
              : 'var(--wave-crest)'
            : near
              ? pink
                ? 'var(--wave-pink-line)'
                : 'var(--wave-line)'
              : pink
                ? 'var(--wave-pink-line)'
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
