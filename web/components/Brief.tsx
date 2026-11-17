import type { Corpus, Results } from "@/lib/data";
import { pct } from "@/lib/data";

export const SENT = "sentence-500";
export const FIXED = "fixed-500/100";
export const METHODS = ["TF-IDF", "BM25", "Dense (MiniLM)", "Hybrid (BM25+Dense, RRF)"];

export function pick(r: Results, chunking: string, method: string) {
  return r.retrieval.find((x) => x.chunking === chunking && x.method === method)!;
}
export function bestMethod(r: Results, key: "Recall@3" | "MRR" = "Recall@3") {
  return [...METHODS].sort((a, b) => pick(r, SENT, b)[key] - pick(r, SENT, a)[key] || pick(r, SENT, b).MRR - pick(r, SENT, a).MRR)[0];
}

export function Brief({ results: r, corpus }: { results: Results; corpus: Corpus }) {
  const best = bestMethod(r);
  const b = pick(r, SENT, best);
  const tf = pick(r, SENT, "TF-IDF");
  const dense = pick(r, SENT, "Dense (MiniLM)");
    const t = r.threshold;
  const nQ = r.summary.nAnswerable;
  const pages = new Set(corpus.chunks.map((c) => `${c.doc}${c.page}`)).size;
  return (
    <section id="brief" className="pt-12 md:pt-16" aria-labelledby="brief-h">
      <div className="eyebrow">Brief</div>
      <h1 id="brief-h" className="serif text-4xl md:text-6xl font-semibold tracking-tight mt-2 max-w-4xl leading-[1.05]" style={{ textWrap: "balance" }}>
        Ask a document a question. Get the sentence, the page and the proof it is there.
      </h1>
      <p className="mt-5 max-w-2xl text-lg" style={{ color: "var(--muted)" }}>
        Askmargin is a retrieval-augmented Q&amp;A assistant. Drop a PDF and it is read, chunked and embedded inside your browser tab: no server,
        no API key, nothing uploaded. This page is also the lab report: every chart below comes from the notebook runs.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="card p-6 md:p-8" aria-label="Executive summary">
          <div className="eyebrow">Executive summary</div>
          <h2 className="serif text-2xl md:text-3xl font-semibold mt-2 leading-snug" style={{ textWrap: "balance" }}>
            Recommendation: retrieve with sentence-aware chunks and {best} ranking, and refuse below a cosine of {t.chosen.toFixed(2)}.
          </h2>
          <ol className="mt-5 space-y-4">
            <li className="flex gap-4"><span className="serif text-3xl" style={{ color: "var(--accent)" }}>1</span>
              <span><b>It finds the evidence.</b> {best} puts the answer chunk in the top 3 for {pct(b["Recall@3"])} of the {nQ} answerable questions,
                against {pct(tf["Recall@3"])} for TF-IDF.</span></li>
            <li className="flex gap-4"><span className="serif text-3xl" style={{ color: "var(--accent)" }}>2</span>
              <span><b>Combining signals wins.</b> Fusing keyword and meaning-based rankings beats either alone: Recall@3 of {pct(b["Recall@3"])}, against {pct(dense["Recall@3"])} for dense embeddings and {pct(pick(r, SENT, "BM25")["Recall@3"])} for BM25. Chunking is a mixed story: sentence-aware chunks help hybrid ({pct(b["Recall@3"])} vs {pct(pick(r, FIXED, best)["Recall@3"])} fixed) but fixed windows suit BM25.</span></li>
            <li className="flex gap-4"><span className="serif text-3xl" style={{ color: "var(--accent)" }}>3</span>
              <span><b>It knows when to stop.</b> Out-of-document questions peak at a top-1 cosine of {Math.max(...t.outOfDoc).toFixed(2)}; answerable ones start at {Math.min(...t.answerable).toFixed(2)}.
                A threshold of {t.chosen.toFixed(2)} separates them {pct(t.accuracy)} of the time on the 30 questions.</span></li>
          </ol>
        </div>

        <div className="card p-6 md:p-8 flex flex-col justify-between" style={{ background: "var(--accent)", color: "var(--accent-ink)", borderColor: "transparent" }} data-testid="moneyshot">
          <div className="mono text-xs tracking-widest uppercase opacity-80">The number to remember</div>
          <div>
            <div className="serif text-7xl md:text-8xl font-semibold leading-none mt-6">{pct(b["Recall@3"])}</div>
            <p className="mt-3 text-lg leading-snug">of questions have their answer chunk in the top 3 results ({best}, sentence-aware chunking, {nQ} questions).</p>
          </div>
          <p className="mono text-xs mt-6 opacity-80">Notebook Step 8, figures/retrieval_results.csv</p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          [String(corpus.chunks.length), "chunks in the sample index"],
          [String(pages), "pages across four papers"],
          [String(corpus.dim), "dimensions per embedding"],
          [`${pct(r.summary.citationCorrect / r.summary.nAnswerable)}`, "FLAN-T5 answers whose cited pages hold the answer"],
        ].map(([v, l]) => (
          <div key={l} className="card p-4 flex flex-col-reverse">
            <dt className="text-sm" style={{ color: "var(--muted)" }}>{l}</dt>
            <dd className="serif text-3xl font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
