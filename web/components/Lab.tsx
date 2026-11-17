"use client";
import { useState } from "react";
import type { Corpus, Results } from "@/lib/data";
import { pct } from "@/lib/data";
import { GroupedBars, LineChart } from "./charts";
import { Legend, Panel, Section } from "./ui";
import { FIXED, METHODS, SENT, bestMethod, pick } from "./Brief";

type MKey = "Recall@1" | "Recall@3" | "Recall@5" | "MRR";
const KEYS: MKey[] = ["Recall@1", "Recall@3", "Recall@5", "MRR"];

export function Lab({ results: r, corpus }: { results: Results; corpus: Corpus }) {
  const [m, setM] = useState<MKey>("Recall@3");
  const best = bestMethod(r);
  const bs = pick(r, SENT, best), bf = pick(r, FIXED, best);
  const tf = pick(r, SENT, "TF-IDF");
  const dense = pick(r, SENT, best);
  const fixedBest = [...METHODS].sort((a, b) => pick(r, FIXED, b)["Recall@3"] - pick(r, FIXED, a)["Recall@3"])[0];
  const nQ = r.summary.nAnswerable;
  const stat = (n: string) => r.chunkStats.find((c) => c.name === n)!;
  const abl = r.ablation;
  const bestAbl = [...abl].sort((a, b) => b["Recall@3"] - a["Recall@3"])[0];
  const worstAbl = [...abl].sort((a, b) => a["Recall@3"] - b["Recall@3"])[0];
  const meanSent = stat(SENT).mean;

  return (
    <Section id="lab" eyebrow="Retrieval lab" title={`${best} retrieval finds the answer chunk in the top 3 for ${pct(bs["Recall@3"])} of questions, against ${pct(tf["Recall@3"])} for TF-IDF.`}
      lede={`Four ways to turn text into vectors, two ways to cut pages into chunks, scored on ${nQ} hand-written questions where the answer string is known.`}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title={`With sentence-aware chunks, ${best} reaches ${pct(bs[m])} ${m} against ${pct(tf[m])} for TF-IDF.`}
          source="notebook Step 8, figures/retrieval_results.csv"
          note={`${nQ} questions is a small sample: one question is worth ${pct(1 / nQ, 1)}. A hit means the chunk is from the right paper and contains the answer string, which is stricter than a human reading the page.`}>
          <div role="group" aria-label="Metric" className="flex gap-2 mb-2 flex-wrap">
            {KEYS.map((k) => (
              <button key={k} className="chip" aria-pressed={m === k} onClick={() => setM(k)} style={m === k ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : {}}>{k}</button>
            ))}
          </div>
          <Legend items={[{ name: "Fixed 500/100 windows", color: "var(--p2)" }, { name: "Sentence-aware 500", color: "var(--accent)" }]} />
          <GroupedBars cats={METHODS} label={`${m} by retrieval method and chunking strategy`}
            series={[
              { name: "Fixed 500/100", color: "var(--p2)", values: METHODS.map((x) => pick(r, FIXED, x)[m]) },
              { name: "Sentence-aware 500", color: "var(--accent)", values: METHODS.map((x) => pick(r, SENT, x)[m]) },
            ]} />
        </Panel>

        <Panel title="Every method, every metric, side by side: the best value in each column is shaded."
          source="notebook Step 8, figures/retrieval_results.csv (sentence-aware chunking)"
          note="Recall@k is the share of questions with a hit in the top k; MRR averages 1 over the rank of the first hit. Hybrid uses reciprocal-rank fusion with k=60.">
          <div className="overflow-x-auto">
            <table className="t" data-testid="retrieval-table">
              <caption className="sr-only">Retrieval metrics by method for sentence-aware chunks</caption>
              <thead><tr><th scope="col">Method</th>{KEYS.map((k) => <th key={k} scope="col" className="n">{k}</th>)}</tr></thead>
              <tbody>
                {METHODS.map((x) => (
                  <tr key={x}>
                    <th scope="row" className="text-left font-semibold p-2" style={{ borderBottom: "1px solid var(--rule)" }}>{x}</th>
                    {KEYS.map((k) => {
                      const top = Math.max(...METHODS.map((y) => pick(r, SENT, y)[k]));
                      const v = pick(r, SENT, x)[k];
                      return <td key={k} className="n" style={v === top ? { background: "var(--accent-soft)", fontWeight: 700 } : {}}>{k === "MRR" ? v.toFixed(2) : pct(v)}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h4 className="serif text-lg font-semibold mt-6 leading-snug">
            {best} on sentence-aware chunks scores Recall@3 of {pct(bs["Recall@3"])}, against {pct(bf["Recall@3"])} on fixed windows.
          </h4>
          <div className="overflow-x-auto mt-2">
            <table className="t">
              <caption className="sr-only">Fixed versus sentence-aware chunking</caption>
              <thead><tr><th scope="col">Chunking</th><th scope="col" className="n">Chunks</th><th scope="col" className="n">Mean chars</th><th scope="col" className="n">Min</th><th scope="col" className="n">Max</th><th scope="col" className="n">{best} R@3</th></tr></thead>
              <tbody>
                {[[FIXED, "Fixed 500 / overlap 100"], [SENT, "Sentence-aware 500"]].map(([n, label]) => {
                  const s = stat(n);
                  return (
                    <tr key={n} className={n === SENT ? "best" : ""}>
                      <th scope="row" className="text-left p-2">{label}</th>
                      <td className="n">{s.count}</td><td className="n">{s.mean.toFixed(0)}</td><td className="n">{s.min}</td><td className="n">{s.max}</td>
                      <td className="n">{pct(pick(r, n, best)["Recall@3"])}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="note"><b>Honest caveat.</b> Chunking does not help every method: {fixedBest} on fixed windows also reaches Recall@3 of {pct(pick(r, FIXED, fixedBest)["Recall@3"])}. Sentence-aware chunking helps {best} but TF-IDF and BM25 do better on fixed windows.</p>
        </Panel>

        <Panel title={`Reading more chunks lifts recall from ${pct(dense["Recall@1"])} at top-1 to ${pct(dense["Recall@5"])} at top-5, at the cost of about ${Math.round(meanSent * 5)} characters of context instead of ${Math.round(meanSent)}.`}
          source="notebook Step 8, figures/retrieval_results.csv (best method, sentence-aware); chunk length from the chunking summary"
          note="These are three settings of one knob, not three forecasts. More context helps a generator find the answer but adds noise; the extractive mode here only shows sentences, so top-k mainly changes which chunks are searched.">
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              ["Conservative", 1, dense["Recall@1"]],
              ["Base case", 3, dense["Recall@3"]],
              ["Generous", 5, dense["Recall@5"]],
            ].map(([name, k, v]) => (
              <div key={name as string} className="rounded-xl border p-4" style={{ borderColor: k === 3 ? "var(--accent)" : "var(--rule)", background: k === 3 ? "var(--accent-soft)" : "transparent" }}>
                <div className="eyebrow">{name}</div>
                <div className="serif text-4xl font-semibold mt-1">{pct(v as number)}</div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>Recall@{k}, top-{k}</div>
                <div className="text-sm mt-2">about {Math.round(meanSent * (k as number))} chars of context</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title={`Chunk size is a sensitivity, not a detail: dense Recall@3 swings from ${pct(worstAbl["Recall@3"])} to ${pct(bestAbl["Recall@3"])}, best at ${bestAbl.size} characters.`}
          source="notebook Step 8 ablation, figures/chunk_size_ablation.csv"
          note={`Same retriever and questions at every size; only the sentence-packing target changes. With only ${nQ} questions, gaps of a few points are within noise. The 500-character default is not the best for dense retrieval here: ${bestAbl.size} characters scores ${pct(bestAbl["Recall@3"])} against ${pct(abl.find((a) => a.size === 500)!["Recall@3"])}, at ${(bestAbl.chunks / (abl.find((a) => a.size === 500)?.chunks || 1)).toFixed(1)}x the chunks.`}>
          <Legend items={[{ name: "Recall@1", color: "var(--accent)" }, { name: "Recall@3", color: "var(--p2)" }, { name: "Recall@5", color: "var(--p3)" }, { name: "MRR", color: "var(--p4)" }]} />
          <LineChart xs={abl.map((a) => a.size)} xLabel="target chunk size (characters)" highlightX={500} label="Dense retrieval metrics versus chunk size"
            series={[
              { name: "Recall@1", color: "var(--accent)", values: abl.map((a) => a["Recall@1"]) },
              { name: "Recall@3", color: "var(--p2)", values: abl.map((a) => a["Recall@3"]) },
              { name: "Recall@5", color: "var(--p3)", values: abl.map((a) => a["Recall@5"]) },
              { name: "MRR", color: "var(--p4)", dash: "5 4", values: abl.map((a) => a.MRR) },
            ]} />
          <div className="overflow-x-auto mt-2">
            <table className="t">
              <caption className="sr-only">Chunk size ablation</caption>
              <thead><tr><th scope="col">Size</th><th scope="col" className="n">Chunks</th><th scope="col" className="n">R@1</th><th scope="col" className="n">R@3</th><th scope="col" className="n">R@5</th><th scope="col" className="n">MRR</th></tr></thead>
              <tbody>{abl.map((a) => (
                <tr key={a.size} className={a.size === bestAbl.size ? "best" : ""}><td>{a.size}{a.size === 500 ? " (used)" : ""}</td><td className="n">{a.chunks}</td><td className="n">{pct(a["Recall@1"])}</td><td className="n">{pct(a["Recall@3"])}</td><td className="n">{pct(a["Recall@5"])}</td><td className="n">{a.MRR.toFixed(2)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </Panel>
      </div>
      <p className="sr-only">Index currently holds {corpus.chunks.length} chunks.</p>
    </Section>
  );
}
