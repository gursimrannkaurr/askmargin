/// <reference lib="webworker" />
import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

type Msg = { id: number; texts: string[] };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractor: any = null;

self.onmessage = async (e: MessageEvent<Msg>) => {
  const { id, texts } = e.data;
  try {
    if (!extractor) {
      extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        progress_callback: (p: { status: string; progress?: number; file?: string }) =>
          self.postMessage({ type: "progress", status: p.status, progress: p.progress, file: p.file }),
      });
      self.postMessage({ type: "ready" });
    }
    const BATCH = 16;
    const parts: Float32Array[] = [];
    for (let i = 0; i < texts.length; i += BATCH) {
      const out = await extractor(texts.slice(i, i + BATCH), { pooling: "mean", normalize: true });
      parts.push(new Float32Array(out.data as Float32Array));
      self.postMessage({ type: "batch", id, done: Math.min(i + BATCH, texts.length), total: texts.length });
    }
    const dim = 384;
    const all = new Float32Array(texts.length * dim);
    let o = 0;
    for (const p of parts) {
      all.set(p, o);
      o += p.length;
    }
    self.postMessage({ type: "result", id, data: all, dim }, [all.buffer]);
  } catch (err) {
    self.postMessage({ type: "error", id, message: String(err) });
  }
};
