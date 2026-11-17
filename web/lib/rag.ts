import { embed } from "./embedder";
import { splitSentences } from "./text";
import { scoreAll, topK, projectPCA } from "./vec";
import type { Corpus } from "./data";

export type Evidence = { chunkIndex: number; chunkScore: number; sentence: string; sentenceScore: number };
export type Hit = { index: number; score: number };
export type Answer = {
  question: string;
  refused: boolean;
  top: Hit[];
  evidence: Evidence[];
  qvec: Float32Array;
  qpoint: [number, number];
  ms: { embedQuery: number; search: number; sentences: number };
  threshold: number;
  sentenceCount: number;
};

export async function ask(question: string, corpus: Corpus, k: number, threshold: number): Promise<Answer> {
  const t0 = performance.now();
  const { data: qvec } = await embed([question]);
  const t1 = performance.now();
  const scores = scoreAll(corpus.E, corpus.dim, qvec);
  const idx = topK(scores, k);
  const top = idx.map((i) => ({ index: i, score: scores[i] }));
  const t2 = performance.now();
  const base = {
    question,
    top,
    qvec,
    qpoint: projectPCA(corpus.pca, qvec),
    threshold,
  };
  if (top[0].score < threshold) {
    return { ...base, refused: true, evidence: [], sentenceCount: 0, ms: { embedQuery: t1 - t0, search: t2 - t1, sentences: 0 } };
  }
  // Extractive step: rank every sentence of the top-k chunks against the question.
  const cand: { ci: number; s: string }[] = [];
  for (const h of top) for (const s of splitSentences(corpus.chunks[h.index].text)) if (s.length >= 25) cand.push({ ci: h.index, s });
  const { data: sv, dim } = await embed(cand.map((c) => c.s));
  const sc = cand.map((c, i) => {
    let d = 0;
    for (let j = 0; j < dim; j++) d += sv[i * dim + j] * qvec[j];
    return { ...c, d };
  });
  sc.sort((a, b) => b.d - a.d);
  const seen = new Set<number>();
  const evidence: Evidence[] = [];
  for (const c of sc) {
    if (seen.has(c.ci)) continue;
    seen.add(c.ci);
    evidence.push({ chunkIndex: c.ci, chunkScore: scores[c.ci], sentence: c.s, sentenceScore: c.d });
    if (evidence.length === 3) break;
  }
  const t3 = performance.now();
  return { ...base, refused: false, evidence, sentenceCount: cand.length, ms: { embedQuery: t1 - t0, search: t2 - t1, sentences: t3 - t2 } };
}
