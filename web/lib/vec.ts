export function f16ToF32(buf: ArrayBuffer): Float32Array {
  const u = new Uint16Array(buf);
  const out = new Float32Array(u.length);
  for (let i = 0; i < u.length; i++) {
    const h = u[i];
    const s = h & 0x8000 ? -1 : 1;
    const e = (h >> 10) & 0x1f;
    const f = h & 0x3ff;
    out[i] = e === 0 ? s * 2 ** -14 * (f / 1024) : e === 31 ? (f ? NaN : s * Infinity) : s * 2 ** (e - 15) * (1 + f / 1024);
  }
  return out;
}

export function dot(E: Float32Array, row: number, dim: number, q: ArrayLike<number>): number {
  let s = 0;
  const o = row * dim;
  for (let j = 0; j < dim; j++) s += E[o + j] * q[j];
  return s;
}

export function scoreAll(E: Float32Array, dim: number, q: ArrayLike<number>): Float32Array {
  const n = E.length / dim;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = dot(E, i, dim, q);
  return out;
}

export function topK(scores: Float32Array, k: number): number[] {
  return Array.from(scores.keys()).sort((a, b) => scores[b] - scores[a]).slice(0, k);
}

export type PCAModel = { mean: number[]; c1: number[]; c2: number[]; var1: number; var2: number };

export function projectPCA(m: PCAModel, v: ArrayLike<number>): [number, number] {
  let a = 0, b = 0;
  for (let j = 0; j < m.mean.length; j++) {
    const d = v[j] - m.mean[j];
    a += d * m.c1[j];
    b += d * m.c2[j];
  }
  return [a, b];
}

/** Top-2 principal components by power iteration with deflation (browser-side PCA for uploaded PDFs). */
export function fitPCA(E: Float32Array, dim: number): { model: PCAModel; coords: [number, number][] } {
  const n = E.length / dim;
  const mean = new Array<number>(dim).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < dim; j++) mean[j] += E[i * dim + j] / n;
  const X = new Float32Array(E.length);
  let total = 0;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < dim; j++) {
      const v = E[i * dim + j] - mean[j];
      X[i * dim + j] = v;
      total += v * v;
    }
  const comps: number[][] = [];
  const vars: number[] = [];
  for (let c = 0; c < 2; c++) {
    let v = Array.from({ length: dim }, (_, j) => Math.sin(j * 12.9898 + c * 78.233));
    let lambda = 0;
    for (let it = 0; it < 60; it++) {
      const proj = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let j = 0; j < dim; j++) s += X[i * dim + j] * v[j];
        proj[i] = s;
      }
      const w = new Array<number>(dim).fill(0);
      for (let i = 0; i < n; i++) for (let j = 0; j < dim; j++) w[j] += X[i * dim + j] * proj[i];
      for (const p of comps) {
        let d = 0;
        for (let j = 0; j < dim; j++) d += w[j] * p[j];
        for (let j = 0; j < dim; j++) w[j] -= d * p[j];
      }
      const norm = Math.hypot(...w) || 1;
      lambda = norm;
      v = w.map((x) => x / norm);
    }
    comps.push(v);
    vars.push(lambda / (total || 1));
  }
  const model: PCAModel = { mean, c1: comps[0], c2: comps[1], var1: vars[0], var2: vars[1] };
  const coords: [number, number][] = [];
  for (let i = 0; i < n; i++) coords.push(projectPCA(model, E.subarray(i * dim, (i + 1) * dim)));
  return { model, coords };
}
