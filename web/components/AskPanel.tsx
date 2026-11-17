"use client";
import { useRef, useState } from "react";
import type { Corpus, Results } from "@/lib/data";
import type { Answer } from "@/lib/rag";
import type { EmbedStatus } from "@/lib/embedder";
import { Section } from "./ui";

type Props = {
  corpus: Corpus; sample: Corpus; mine: Corpus | null; useMine: boolean; setUseMine: (v: boolean) => void;
  results: Results; answer: Answer | null; busy: string | null; status: EmbedStatus; threshold: number;
  onAsk: (q: string, k: number) => void; onUpload: (f: File[]) => void;
};

export function AskPanel({ corpus, sample, mine, useMine, setUseMine, results, answer, busy, status, threshold, onAsk, onUpload }: Props) {
  const [q, setQ] = useState("");
  const [k, setK] = useState(3);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const names = corpus.docs;
  const samples = useMine && mine
    ? []
    : [
        ...Object.keys(sample.docs).map((d) => results.answers.find((a) => a.doc === d)?.question).filter(Boolean) as string[],
        "What is the capital city of France?",
      ];
  const submit = (text = q) => { setQ(text); onAsk(text, k); };
  const pages = new Set(corpus.chunks.map((c) => `${c.doc}|${c.page}`)).size;

  return (
    <Section id="ask" eyebrow="Ask" title="Ask a question and read exactly which sentence on which page answers it."
      lede="Answers here are extractive: the app returns the best-matching sentences from your documents, never text it made up. The Colab notebook goes one step further and writes a sentence with FLAN-T5.">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.3fr]">
        <div className="card p-5 space-y-4">
          <div>
            <div className="eyebrow">1. Choose documents</div>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Document set">
              <button className="chip" aria-pressed={!useMine} onClick={() => setUseMine(false)} style={!useMine ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : {}}>
                Sample: 4 papers
              </button>
              {mine && (
                <button className="chip" aria-pressed={useMine} onClick={() => setUseMine(true)} style={useMine ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : {}}>
                  Your PDF
                </button>
              )}
            </div>
            <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
              {Object.values(names).join(" · ")}. {corpus.chunks.length} chunks from {pages} pages are indexed.
            </p>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = [...e.dataTransfer.files].filter((x) => /pdf$/i.test(x.name)); if (f.length) onUpload(f); }}
            className="rounded-xl border-2 border-dashed p-5 text-center" style={{ borderColor: drag ? "var(--accent)" : "var(--rule)", background: drag ? "var(--accent-soft)" : "transparent" }}>
            <p className="font-medium">Drop a PDF here, or</p>
            <label className="btn btn-ghost mt-2 cursor-pointer">
              Choose PDF
              <input ref={fileRef} data-testid="pdf-input" type="file" accept="application/pdf" multiple className="sr-only"
                onChange={(e) => { const f = [...(e.target.files || [])]; if (f.length) onUpload(f); e.target.value = ""; }} />
            </label>
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>Stays on this device. Text PDFs only; scanned pages need OCR.</p>
          </div>

          <div role="status" aria-live="polite" className="text-sm min-h-[2.5rem]" data-testid="status">
            {busy ? <span><span className="inline-block w-2 h-2 rounded-full mr-2 animate-pulse" style={{ background: "var(--accent)" }} />{busy}…</span> : null}
            {status.phase === "loading" && (
              <div>
                <div style={{ color: "var(--muted)" }}>{status.note}</div>
                {status.progress != null && <div className="h-1.5 mt-1 rounded" style={{ background: "var(--rule)" }}><div className="h-full rounded" style={{ width: `${Math.min(100, status.progress)}%`, background: "var(--accent)" }} /></div>}
              </div>
            )}
            {status.phase === "ready" && !busy && <span style={{ color: "var(--muted)" }}>Embedding model ready (runs in a Web Worker, cached by your browser).</span>}
            {status.phase === "error" && <span style={{ color: "var(--bad)" }}>Model error: {status.note}</span>}
          </div>
        </div>

        <div className="card p-5">
          <div className="eyebrow">2. Ask</div>
          <form className="mt-2 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <label htmlFor="q" className="sr-only">Your question</label>
            <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. How many parallel attention heads does the Transformer use?"
              className="w-full rounded-xl border px-4 py-3 text-base" style={{ background: "var(--paper)", borderColor: "var(--rule)" }} />
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="btn" disabled={!!busy}>{busy ? "Working…" : "Ask"}</button>
              <label className="text-sm flex items-center gap-2" style={{ color: "var(--muted)" }}>
                Chunks to read (top-k)
                <select value={k} onChange={(e) => setK(Number(e.target.value))} className="rounded-lg border px-2 py-1" style={{ background: "var(--paper)", borderColor: "var(--rule)", color: "var(--ink)" }}>
                  {[1, 3, 5].map((n) => <option key={n}>{n}</option>)}
                </select>
              </label>
            </div>
          </form>
          {samples.length > 0 && (
            <div className="mt-3">
              <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Try one:</div>
              <div className="flex flex-wrap gap-2">
                {samples.map((s) => <button key={s} className="chip" disabled={!!busy} onClick={() => submit(s)}>{s}</button>)}
              </div>
            </div>
          )}

          <div className="mt-5" aria-live="polite" data-testid="answer">
            {answer && <AnswerView a={answer} corpus={corpus} threshold={threshold} />}
            {!answer && <p className="text-sm" style={{ color: "var(--muted)" }}>The first question downloads the 23 MB embedding model once; later ones take well under a second.</p>}
          </div>
        </div>
      </div>
      {answer && <Hood a={answer} corpus={corpus} />}
    </Section>
  );
}

function Highlighted({ text, sentence }: { text: string; sentence: string }) {
  const i = text.indexOf(sentence);
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="hl" style={{ color: "inherit" }}>{sentence}</mark>{text.slice(i + sentence.length)}</>;
}

function AnswerView({ a, corpus, threshold }: { a: Answer; corpus: Corpus; threshold: number }) {
  if (a.refused)
    return (
      <div className="rounded-xl p-4 border-2" style={{ borderColor: "var(--bad)" }} data-testid="refusal">
        <p className="serif text-xl font-semibold">I could not find this in the documents.</p>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          The closest chunk scored {a.top[0].score.toFixed(2)}, below the {threshold.toFixed(2)} threshold, so nothing is shown rather than a guess.
        </p>
      </div>
    );
  return (
    <div className="space-y-3">
      {a.evidence.map((e, i) => {
        const c = corpus.chunks[e.chunkIndex];
        return (
          <article key={i} className="rounded-xl p-4 border" style={{ borderColor: "var(--rule)", background: "var(--paper)" }}>
            <p className="serif text-lg leading-snug"><mark className="hl" style={{ color: "inherit" }}>{e.sentence}</mark></p>
            <p className="mt-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
              <span data-testid="citation" className="font-semibold">{corpus.docs[c.doc] || c.doc}, p.{c.page}</span>
              <span className="mono" style={{ color: "var(--muted)" }}>sentence cosine {e.sentenceScore.toFixed(2)}</span>
              <span className="mono" style={{ color: "var(--muted)" }}>chunk cosine {e.chunkScore.toFixed(2)}</span>
            </p>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer" style={{ color: "var(--muted)" }}>Show surrounding chunk</summary>
              <p className="mt-2"><Highlighted text={c.text} sentence={e.sentence} /></p>
            </details>
          </article>
        );
      })}
    </div>
  );
}

function Hood({ a, corpus }: { a: Answer; corpus: Corpus }) {
  const q = a.qvec;
  const norm = Math.hypot(...q);
  const mx = Math.max(...q), mn = Math.min(...q);
  return (
    <details open className="card mt-5 p-5" data-testid="hood">
      <summary className="cursor-pointer serif text-xl font-semibold">Under the hood: what just happened, stage by stage</summary>
      <ol className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
        <li className="rounded-xl border p-4" style={{ borderColor: "var(--rule)" }}>
          <div className="eyebrow">Stage 1 · index</div>
          <p className="mt-1"><b>{corpus.chunks.length}</b> chunks × <b>{corpus.dim}</b> dimensions = {(corpus.chunks.length * corpus.dim).toLocaleString()} numbers held in memory as a Float32Array. {corpus.sample ? "Loaded from the notebook export, so only your question needed embedding." : "Embedded in this browser from your PDF."}</p>
        </li>
        <li className="rounded-xl border p-4" style={{ borderColor: "var(--rule)" }}>
          <div className="eyebrow">Stage 2 · query vector ({a.ms.embedQuery.toFixed(0)} ms)</div>
          <p className="mono mt-1 break-words">[{Array.from(q.slice(0, 8)).map((v) => v.toFixed(3)).join(", ")}, … {q.length - 8} more]</p>
          <p className="mt-1" style={{ color: "var(--muted)" }}>length {norm.toFixed(3)} (unit vector), min {mn.toFixed(3)}, max {mx.toFixed(3)}</p>
        </li>
        <li className="rounded-xl border p-4 md:col-span-2" style={{ borderColor: "var(--rule)" }}>
          <div className="eyebrow">Stage 3 · cosine search ({a.ms.search.toFixed(1)} ms for {corpus.chunks.length} dot products)</div>
          <ul className="mt-2 space-y-2" aria-label="Top-k similarity scores">
            {a.top.map((h, i) => {
              const c = corpus.chunks[h.index];
              return (
                <li key={h.index} className="grid grid-cols-[7.5rem_1fr_3rem] sm:grid-cols-[11rem_1fr_3rem] items-center gap-3">
                  <span className="truncate">#{i + 1} {(corpus.docs[c.doc] || c.doc).split(" ")[0]} p.{c.page}</span>
                  <span className="relative h-3 rounded" style={{ background: "var(--rule)" }} role="img" aria-label={`cosine ${h.score.toFixed(3)}`}>
                    <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${Math.max(0, h.score) * 100}%`, background: h.score >= a.threshold ? "var(--accent)" : "var(--muted)" }} />
                    <span className="absolute -inset-y-1 w-0.5" style={{ left: `${a.threshold * 100}%`, background: "var(--ink)" }} title={`refusal threshold ${a.threshold}`} />
                  </span>
                  <span className="mono text-right">{h.score.toFixed(2)}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2" style={{ color: "var(--muted)" }}>The dark tick marks the refusal threshold ({a.threshold.toFixed(2)}). {a.refused ? "The best chunk is under it, so the app declines." : "The best chunk is over it, so the app answers."}</p>
        </li>
        <li className="rounded-xl border p-4 md:col-span-2" style={{ borderColor: "var(--rule)" }}>
          <div className="eyebrow">Stage 4 · extractive answer ({a.ms.sentences.toFixed(0)} ms)</div>
          <p className="mt-1">{a.refused ? "Skipped: no chunk passed the threshold." : `Split the top ${a.top.length} chunk(s) into ${a.sentenceCount} sentences, embedded each, and kept the closest sentence from each of the three best-matching chunks. No text is generated.`}</p>
        </li>
      </ol>
    </details>
  );
}
