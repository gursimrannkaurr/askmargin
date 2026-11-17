import { f16ToF32, PCAModel } from "./vec";
import type { Chunk } from "./text";

export type Corpus = {
  name: string;
  chunks: Chunk[];
  E: Float32Array;
  dim: number;
  docs: Record<string, string>;
  coords: [number, number][];
  pca: PCAModel;
  sample: boolean;
};

export type Metrics = { "Recall@1": number; "Recall@3": number; "Recall@5": number; MRR: number };
export type Results = {
  retrieval: ({ chunking: string; method: string } & Metrics)[];
  ablation: ({ size: number; chunks: number } & Metrics)[];
  chunkStats: { name: string; count: number; mean: number; min: number; max: number }[];
  threshold: {
    answerable: number[];
    outOfDoc: number[];
    chosen: number;
    accuracy: number;
    plateau: [number, number];
  };
  answers: {
    id: number;
    question: string;
    doc: string;
    expect: string;
    answer: string;
    correct: boolean;
    citation_ok: boolean;
    faithfulness: number;
    refused: boolean;
    pages: number[];
  }[];
  outOfDocQuestions: { id: number; question: string; refused: boolean }[];
  summary: {
    answerCorrect: number;
    nAnswerable: number;
    citationCorrect: number;
    faithfulness: number;
    wronglyRefused: number;
    correctlyRefused: number;
    nOutOfDoc: number;
  };
};

export async function loadSample(): Promise<{ corpus: Corpus; results: Results }> {
  const [chunksRes, embRes, mapRes, resRes] = await Promise.all([
    fetch("/sample/chunks.json").then((r) => r.json()),
    fetch("/sample/embeddings.f16").then((r) => r.arrayBuffer()),
    fetch("/sample/map.json").then((r) => r.json()),
    fetch("/sample/results.json").then((r) => r.json()),
  ]);
  const E = f16ToF32(embRes);
  return {
    corpus: {
      name: "Four sample papers",
      chunks: chunksRes.chunks,
      E,
      dim: chunksRes.dim,
      docs: chunksRes.docs,
      coords: mapRes.coords,
      pca: mapRes.pca,
      sample: true,
    },
    results: resRes,
  };
}

export const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
