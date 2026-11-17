"use client";
import { useState } from "react";

export const PAPER_COLORS = ["var(--p1)", "var(--p2)", "var(--p3)", "var(--p4)"];
const lin = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
const ticks = (a: number, b: number, n = 5) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

const axisText = { fill: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" } as const;

export function GroupedBars({
  cats, series, label, fmt = (v: number) => v.toFixed(2),
}: { cats: string[]; series: { name: string; color: string; values: number[] }[]; label: string; fmt?: (v: number) => string }) {
  const W = 640, H = 300, m = { l: 40, r: 10, t: 14, b: 54 };
  const y = lin(0, 1, H - m.b, m.t);
  const gw = (W - m.l - m.r) / cats.length;
  const bw = Math.min(40, (gw - 16) / series.length);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full h-auto">
      {ticks(0, 1).map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--rule)" />
          <text x={m.l - 6} y={y(t) + 4} textAnchor="end" {...axisText}>{t.toFixed(1)}</text>
        </g>
      ))}
      {cats.map((c, i) => {
        const cx = m.l + gw * i + gw / 2;
        return (
          <g key={c}>
            {series.map((s, j) => {
              const x = cx + (j - series.length / 2) * bw;
              const v = s.values[i];
              return (
                <g key={s.name}>
                  <rect x={x} y={y(v)} width={bw - 3} height={Math.max(0, y(0) - y(v))} fill={s.color} rx={2}>
                    <title>{`${c}, ${s.name}: ${fmt(v)}`}</title>
                  </rect>
                  <text x={x + (bw - 3) / 2} y={y(v) - 4} textAnchor="middle" {...axisText} fontSize={10}>{fmt(v)}</text>
                </g>
              );
            })}
            <text x={cx} y={H - m.b + 18} textAnchor="middle" fill="var(--ink)" fontSize={12}>
              {c.split(" (")[0].split(" ").map((w, k) => <tspan key={k} x={cx} dy={k ? 14 : 0}>{w}</tspan>)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({
  xs, series, label, xLabel, highlightX,
}: { xs: number[]; series: { name: string; color: string; values: number[]; dash?: string }[]; label: string; xLabel: string; highlightX?: number }) {
  const W = 640, H = 300, m = { l: 40, r: 14, t: 14, b: 44 };
  const idx = (i: number) => m.l + ((W - m.l - m.r) * i) / (xs.length - 1);
  const y = lin(0, 1, H - m.b, m.t);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full h-auto">
      {ticks(0, 1).map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--rule)" />
          <text x={m.l - 6} y={y(t) + 4} textAnchor="end" {...axisText}>{t.toFixed(1)}</text>
        </g>
      ))}
      {xs.map((x, i) => (
        <g key={x}>
          {x === highlightX && <rect x={idx(i) - 22} y={m.t} width={44} height={H - m.b - m.t} fill="var(--accent-soft)" />}
          <text x={idx(i)} y={H - m.b + 18} textAnchor="middle" {...axisText}>{x}</text>
        </g>
      ))}
      <text x={(W + m.l) / 2} y={H - 6} textAnchor="middle" {...axisText}>{xLabel}</text>
      {series.map((s) => (
        <g key={s.name}>
          <polyline fill="none" stroke={s.color} strokeWidth={2.2} strokeDasharray={s.dash} points={s.values.map((v, i) => `${idx(i)},${y(v)}`).join(" ")} />
          {s.values.map((v, i) => (
            <circle key={i} cx={idx(i)} cy={y(v)} r={3.6} fill={s.color}>
              <title>{`${s.name} at ${xs[i]}: ${v.toFixed(3)}`}</title>
            </circle>
          ))}
        </g>
      ))}
    </svg>
  );
}

export function Histogram({
  a, b, threshold, label, aName, bName,
}: { a: number[]; b: number[]; threshold: number; label: string; aName: string; bName: string }) {
  const W = 640, H = 280, m = { l: 36, r: 12, t: 16, b: 44 };
  const lo = 0.1, hi = 0.8, nb = 28, step = (hi - lo) / nb;
  const count = (arr: number[]) => {
    const c = new Array(nb).fill(0);
    arr.forEach((v) => c[Math.min(nb - 1, Math.max(0, Math.floor((v - lo) / step)))]++);
    return c as number[];
  };
  const ca = count(a), cb = count(b);
  const maxC = Math.max(...ca, ...cb, 1);
  const x = lin(lo, hi, m.l, W - m.r);
  const y = lin(0, maxC, H - m.b, m.t);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full h-auto">
      {Array.from({ length: maxC + 1 }, (_, i) => i).filter((i) => i % Math.max(1, Math.ceil(maxC / 5)) === 0).map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--rule)" />
          <text x={m.l - 6} y={y(t) + 4} textAnchor="end" {...axisText}>{t}</text>
        </g>
      ))}
      {[ca, cb].map((c, k) =>
        c.map((n, i) => n > 0 && (
          <rect key={`${k}-${i}`} x={x(lo + i * step) + 1} y={y(n)} width={x(lo + step) - x(lo) - 2} height={y(0) - y(n)} fill={k ? "var(--p2)" : "var(--accent)"} opacity={0.85}>
            <title>{`${k ? bName : aName}: ${n} question(s) with cosine ${(lo + i * step).toFixed(2)} to ${(lo + (i + 1) * step).toFixed(2)}`}</title>
          </rect>
        )),
      )}
      {ticks(0.1, 0.8, 7).map((t) => (
        <text key={t} x={x(t)} y={H - m.b + 16} textAnchor="middle" {...axisText}>{t.toFixed(1)}</text>
      ))}
      <text x={(W + m.l) / 2} y={H - 6} textAnchor="middle" {...axisText}>top-1 cosine similarity</text>
      <line x1={x(threshold)} x2={x(threshold)} y1={m.t - 6} y2={H - m.b} stroke="var(--ink)" strokeDasharray="5 4" strokeWidth={1.5} />
      <text x={x(threshold) + 6} y={m.t + 6} fill="var(--ink)" fontSize={11} fontFamily="var(--font-mono)">threshold {threshold.toFixed(2)}</text>
    </svg>
  );
}

const short = (n: string) => n.match(/\(([^)]+)\)/)?.[1] ?? n.split(" ")[0];
export function Heatmap({ docs, matrix, names }: { docs: string[]; matrix: number[][]; names: Record<string, string> }) {
  const flat = matrix.flat();
  const lo = Math.min(...flat), hi = Math.max(...flat);
  const cell = 74, off = 92, W = off + cell * docs.length + 6, H = 28 + cell * docs.length + 6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Heatmap of mean cosine similarity between papers" className="w-full h-auto max-w-[460px]">
      {docs.map((d, i) => (
        <g key={d}>
          <text x={off + cell * i + cell / 2} y={18} textAnchor="middle" fill="var(--ink)" fontSize={11}>{short(names[d] || d)}</text>
          <text x={off - 8} y={28 + cell * i + cell / 2 + 4} textAnchor="end" fill="var(--ink)" fontSize={11}>{short(names[d] || d)}</text>
          {docs.map((e, j) => {
            const v = matrix[i][j];
            const t = (v - lo) / (hi - lo || 1);
            return (
              <g key={e}>
                <rect x={off + cell * j + 1} y={28 + cell * i + 1} width={cell - 2} height={cell - 2} rx={3} fill="var(--accent)" fillOpacity={0.08 + 0.85 * t}>
                  <title>{`${names[d] || d} vs ${names[e] || e}: ${v.toFixed(3)}`}</title>
                </rect>
                <text x={off + cell * j + cell / 2} y={28 + cell * i + cell / 2 + 4} textAnchor="middle" fontSize={12} fontFamily="var(--font-mono)" fill={t > 0.55 ? "#fff" : "var(--ink)"}>{v.toFixed(2)}</text>
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

export type MapPoint = { x: number; y: number; doc: string; page: number; text: string };
export function SemanticMap({
  points, docs, query, hits, names, label,
}: {
  points: MapPoint[]; docs: string[]; query?: [number, number] | null; hits: number[]; names: Record<string, string>; label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [off, setOff] = useState<Set<string>>(new Set());
  const W = 720, H = 460, pad = 28;
  const all = [...points.map((p) => [p.x, p.y] as [number, number]), ...(query ? [query] : [])];
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const x = lin(Math.min(...xs), Math.max(...xs), pad, W - pad);
  const y = lin(Math.min(...ys), Math.max(...ys), H - pad, pad);
  const hitSet = new Set(hits);
  const hp = hover != null ? points[hover] : null;
  const star = (cx: number, cy: number, r: number) =>
    Array.from({ length: 10 }, (_, i) => { const a = (Math.PI * i) / 5 - Math.PI / 2; const rr = i % 2 ? r * 0.45 : r; return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`; }).join(" ");
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Toggle papers on the map">
        {docs.map((d, i) => (
          <button key={d} aria-pressed={!off.has(d)} onClick={() => setOff((s) => { const n = new Set(s); if (n.has(d)) n.delete(d); else n.add(d); return n; })}
            className="chip" style={{ opacity: off.has(d) ? 0.45 : 1 }}>
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ background: PAPER_COLORS[i % 4] }} />{names[d] || d}
          </button>
        ))}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full h-auto rounded-lg" style={{ background: "var(--paper-2)", touchAction: "manipulation" }} data-testid="semantic-map">
          {query && hits.map((h) => (
            <line key={h} x1={x(query[0])} y1={y(query[1])} x2={x(points[h].x)} y2={y(points[h].y)} stroke="var(--accent)" strokeWidth={1.4} strokeDasharray="4 3" />
          ))}
          {points.map((p, i) => {
            if (off.has(p.doc)) return null;
            const hit = hitSet.has(i);
            return (
              <circle key={i} cx={x(p.x)} cy={y(p.y)} r={hit ? 7 : hover === i ? 6 : 3.6} fill={PAPER_COLORS[docs.indexOf(p.doc) % 4]}
                fillOpacity={query && !hit ? 0.35 : 0.85} stroke={hit ? "var(--ink)" : "none"} strokeWidth={2}
                onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onClick={() => setHover(i)} />
            );
          })}
          {query && <polygon points={star(x(query[0]), y(query[1]), 15)} fill="var(--accent)" stroke="var(--ink)" strokeWidth={1.5}><title>Your question</title></polygon>}
        </svg>
        <div className="mt-3 min-h-[4.5rem] text-sm rounded-lg border p-3" style={{ borderColor: "var(--rule)" }} aria-live="polite">
          {hp ? (<><b>{names[hp.doc] || hp.doc}</b>, page {hp.page}<div className="mt-1" style={{ color: "var(--muted)" }}>{hp.text.slice(0, 220)}{hp.text.length > 220 ? "…" : ""}</div></>)
            : <span style={{ color: "var(--muted)" }}>Hover or tap a point to read the chunk it stands for.{query ? " The star is your question; ringed points are the top-k chunks." : ""}</span>}
        </div>
      </div>
    </div>
  );
}
