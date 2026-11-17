"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Corpus, Results, loadSample } from "@/lib/data";
import { ask, Answer } from "@/lib/rag";
import { embed, onEmbedStatus, EmbedStatus } from "@/lib/embedder";
import { chunkPages } from "@/lib/text";
import { fitPCA } from "@/lib/vec";
import { Brief } from "./Brief";
import { AskPanel } from "./AskPanel";

const Lab = dynamic(() => import("./Lab").then((m) => m.Lab), { ssr: false, loading: () => <Skeleton h="40rem" /> });
const MapSection = dynamic(() => import("./MapSection").then((m) => m.MapSection), { ssr: false, loading: () => <Skeleton h="30rem" /> });
const Evaluation = dynamic(() => import("./Evaluation").then((m) => m.Evaluation), { ssr: false, loading: () => <Skeleton h="40rem" /> });
const Appendix = dynamic(() => import("./Appendix").then((m) => m.Appendix), { ssr: false, loading: () => <Skeleton h="30rem" /> });

function Skeleton({ h }: { h: string }) {
  return <div className="card animate-pulse" style={{ height: h }} aria-hidden />;
}

const SECTIONS = [
  ["brief", "Brief"],
  ["ask", "Ask"],
  ["lab", "Retrieval lab"],
  ["map", "Semantic map"],
  ["eval", "Evaluation"],
  ["appendix", "Appendix"],
] as const;

export function Dashboard() {
  const [results, setResults] = useState<Results | null>(null);
  const [sample, setSample] = useState<Corpus | null>(null);
  const [mine, setMine] = useState<Corpus | null>(null);
  const [useMine, setUseMine] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<EmbedStatus>({ phase: "idle" });
  const [theme, setTheme] = useState("light");
  const [active, setActive] = useState("brief");
  const corpus = useMine && mine ? mine : sample;

  useEffect(() => {
    loadSample().then(({ corpus, results }) => { setSample(corpus); setResults(results); }).catch((e) => setErr(String(e)));
    requestAnimationFrame(() => setTheme(document.documentElement.dataset.theme || "light"));
    return onEmbedStatus(setStatus);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-40% 0px -55% 0px" },
    );
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [results]);

  const toggleTheme = () => {
    const t = theme === "dark" ? "light" : "dark";
    setTheme(t);
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("am-theme", t); } catch {}
  };

  const threshold = results?.threshold.chosen ?? 0.24;

  const runAsk = useCallback(async (q: string, k: number) => {
    if (!corpus || !q.trim()) return;
    setBusy("Searching");
    try { setAnswer(await ask(q.trim(), corpus, k, threshold)); }
    catch (e) { setErr(String(e)); }
    finally { setBusy(null); }
  }, [corpus, threshold]);

  const onUpload = useCallback(async (files: File[]) => {
    setErr(null);
    try {
      setBusy("Reading PDF");
      const { extractPdf } = await import("@/lib/pdf");
      const docs: Record<string, string> = {};
      const pages: { doc: string; page: number; text: string }[] = [];
      for (const f of files) {
        const key = f.name.replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9_-]/g, "_");
        docs[key] = f.name.replace(/\.pdf$/i, "");
        const r = await extractPdf(f, key, (p, n) => setBusy(`Reading ${f.name}: page ${p} of ${n}`));
        pages.push(...r.pages);
      }
      setBusy("Chunking");
      const chunks = chunkPages(pages);
      if (!chunks.length) throw new Error("No selectable text found. Scanned PDFs need OCR, which this demo does not do.");
      const dim = 384;
      const E = new Float32Array(chunks.length * dim);
      const { data } = await embed(chunks.map((c) => c.text), (d, t) => setBusy(`Embedding chunks: ${d} of ${t}`));
      E.set(data);
      setBusy("Projecting the map");
      const { model, coords } = fitPCA(E, dim);
      setMine({ name: files.map((f) => f.name).join(", "), chunks, E, dim, docs, coords, pca: model, sample: false });
      setUseMine(true);
      setAnswer(null);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  }, []);

  return (
    <>
      <a href="#brief" className="skip">Skip to content</a>
      <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ background: "color-mix(in srgb, var(--paper) 88%, transparent)", borderColor: "var(--rule)" }}>
        <div className="mx-auto max-w-6xl px-4 flex items-center gap-4 h-14">
          <a href="#brief" className="serif text-xl font-semibold tracking-tight shrink-0" aria-label="Askmargin home">
            Ask<span style={{ color: "var(--accent)" }}>margin</span>
          </a>
          <nav aria-label="Sections" className="flex-1 overflow-x-auto">
            <ul className="flex gap-1 text-sm whitespace-nowrap">
              {SECTIONS.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} aria-current={active === id ? "true" : undefined}
                    className="px-3 py-2 rounded-full inline-block"
                    style={active === id ? { background: "var(--accent-soft)", color: "var(--ink)", fontWeight: 600 } : { color: "var(--muted)" }}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <button onClick={toggleTheme} className="chip shrink-0" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        {err && <div role="alert" className="card mt-6 p-4" style={{ borderColor: "var(--bad)", color: "var(--bad)" }}>{err}</div>}
        {!results || !corpus ? (
          <div className="py-24 text-center" style={{ color: "var(--muted)" }} role="status">Loading the sample corpus (342 KB of chunks, 537 KB of embeddings)…</div>
        ) : (
          <>
            <Brief results={results} corpus={sample!} />
            <AskPanel
              corpus={corpus} sample={sample!} mine={mine} useMine={useMine} setUseMine={(v) => { setUseMine(v); setAnswer(null); }}
              results={results} answer={answer} busy={busy} status={status} onAsk={runAsk} onUpload={onUpload} threshold={threshold}
            />
            <Lab results={results} corpus={corpus} />
            <MapSection corpus={corpus} answer={answer} results={results} />
            <Evaluation results={results} />
            <Appendix results={results} corpus={corpus} />
          </>
        )}
      </main>
      <footer className="border-t py-8 text-sm" style={{ borderColor: "var(--rule)", color: "var(--muted)" }}>
        <div className="mx-auto max-w-6xl px-4">
          Askmargin is an NLP course project. PDFs never leave your browser. Extractive answers here; the Colab notebook generates with FLAN-T5.
           Sample corpus: four open-access arXiv papers.
        </div>
      </footer>
    </>
  );
}
