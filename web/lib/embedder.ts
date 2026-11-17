export type EmbedStatus = { phase: "idle" | "loading" | "ready" | "error"; progress?: number; note?: string };

type Pending = {
  res: (v: { data: Float32Array; dim: number }) => void;
  rej: (e: Error) => void;
  onBatch?: (d: number, t: number) => void;
};

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();
const listeners = new Set<(s: EmbedStatus) => void>();
let status: EmbedStatus = { phase: "idle" };
const fileProg = new Map<string, number>();

function setStatus(s: EmbedStatus) {
  status = s;
  listeners.forEach((l) => l(s));
}
export function onEmbedStatus(l: (s: EmbedStatus) => void) {
  listeners.add(l);
  l(status);
  return () => {
    listeners.delete(l);
  };
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./embed.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data;
    if (m.type === "progress") {
      if (m.file && typeof m.progress === "number") fileProg.set(m.file, m.progress);
      const vals = [...fileProg.values()];
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
      setStatus({ phase: "loading", progress: avg, note: "Downloading the embedding model (about 23 MB, cached after the first visit)" });
    } else if (m.type === "ready") setStatus({ phase: "ready" });
    else if (m.type === "batch") pending.get(m.id)?.onBatch?.(m.done, m.total);
    else if (m.type === "result") {
      pending.get(m.id)?.res({ data: m.data, dim: m.dim });
      pending.delete(m.id);
    } else if (m.type === "error") {
      setStatus({ phase: "error", note: m.message });
      pending.get(m.id)?.rej(new Error(m.message));
      pending.delete(m.id);
    }
  };
  worker.onerror = (e) => setStatus({ phase: "error", note: e.message });
  return worker;
}

export function embed(texts: string[], onBatch?: (d: number, t: number) => void): Promise<{ data: Float32Array; dim: number }> {
  const w = getWorker();
  if (status.phase === "idle") setStatus({ phase: "loading", note: "Starting the embedding worker" });
  return new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, { res, rej, onBatch });
    w.postMessage({ id, texts });
  });
}
