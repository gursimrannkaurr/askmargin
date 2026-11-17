"use client";
import type { Corpus, Results } from "@/lib/data";
import { Panel, Section } from "./ui";

function Pipeline({ pages, chunks, dim, docs }: { pages: number; chunks: number; dim: number; docs: number }) {
  const steps = [
    ["PDF", `${docs} file${docs > 1 ? "s" : ""}`, "pdf.js reads text per page"],
    ["Clean", `${pages} pages`, "NFKC, de-hyphenate, collapse spaces"],
    ["Chunk", `${chunks} chunks`, "~500 chars, 1-sentence overlap"],
    ["Embed", `${dim} dims`, "MiniLM, mean pool, L2 norm"],
    ["Search", "cosine", "dot product, top-k"],
    ["Answer", "best sentences", "best sentence + page cite"],
  ];
  const w = 150, g = 26;
  return (
    <svg viewBox={`0 0 ${steps.length * (w + g) - g + 8} 150`} role="img" aria-label={`Pipeline: ${steps.map((s) => s[0]).join(" to ")}`} className="w-full h-auto min-w-[760px]">
      {steps.map(([t, n, d], i) => (
        <g key={t} transform={`translate(${4 + i * (w + g)},10)`}>
          <rect width={w} height={120} rx={10} fill="var(--card)" stroke={i === 3 ? "var(--accent)" : "var(--rule)"} strokeWidth={i === 3 ? 2 : 1} />
          <text x={12} y={26} fill="var(--accent)" fontSize={11} fontFamily="var(--font-mono)">{String(i + 1).padStart(2, "0")}</text>
          <text x={12} y={50} fill="var(--ink)" fontSize={18} fontWeight={600} fontFamily="var(--font-display)">{t}</text>
          <text x={12} y={76} fill="var(--accent)" fontSize={15} fontWeight={700} fontFamily="var(--font-mono)">{n}</text>
          {d.length > 24 ? (<><text x={12} y={98} fill="var(--muted)" fontSize={10.5}>{d.slice(0, d.lastIndexOf(" ", 24))}</text><text x={12} y={111} fill="var(--muted)" fontSize={10.5}>{d.slice(d.lastIndexOf(" ", 24) + 1)}</text></>) : <text x={12} y={98} fill="var(--muted)" fontSize={10.5}>{d}</text>}
          {i < steps.length - 1 && <path d={`M${w + 3} 60 h${g - 8} m-6 -5 l6 5 l-6 5`} stroke="var(--muted)" fill="none" strokeWidth={1.5} />}
        </g>
      ))}
    </svg>
  );
}

const GLOSSARY: [string, string][] = [
  ["Chunk", "A passage of about 500 characters cut at sentence boundaries. The unit that is embedded, searched and cited."],
  ["Embedding", "A list of 384 numbers produced by all-MiniLM-L6-v2 so that texts with similar meaning get similar numbers."],
  ["Cosine similarity", "The angle-based closeness of two vectors. Vectors here have length 1, so it equals their dot product."],
  ["Recall@k", "Share of questions whose answer chunk is among the top k results."],
  ["MRR", "Mean reciprocal rank: the average of 1 divided by the rank of the first correct chunk."],
  ["BM25 / TF-IDF", "Word-matching scores. They need the same words in question and text; dense embeddings do not."],
  ["Hybrid (RRF)", "Merging the BM25 and dense rankings by reciprocal-rank fusion."],
  ["Extractive answer", "A sentence copied from the document. Nothing is generated, so it cannot be invented."],
  ["PCA", "Principal component analysis: the two directions along which the embeddings vary most, used to draw the map."],
  ["Refusal threshold", "The minimum top-1 cosine needed to answer; below it the app says it could not find the answer."],
];

export function Appendix({ results: r, corpus }: { results: Results; corpus: Corpus }) {
  const pages = new Set(corpus.chunks.map((c) => `${c.doc}|${c.page}`)).size;
  return (
    <Section id="appendix" eyebrow="Appendix" title={`The whole pipeline is six stages, and every stage after the PDF runs on your device.`}
      lede="Pipeline details, how it works in plain words, a glossary, and honest limits.">
      <Panel title={`Right now the index holds ${pages} pages, ${corpus.chunks.length} chunks and ${corpus.dim} dimensions per chunk.`} source="live counts from the active document set; stages from notebook Steps 2 to 10">
        <div className="overflow-x-auto"><Pipeline pages={pages} chunks={corpus.chunks.length} dim={corpus.dim} docs={Object.keys(corpus.docs).length} /></div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mt-5">
        <Panel title="How it works, in five steps." source="app code in web/lib, notebook Steps 2 to 10">
          <ol className="space-y-3 list-decimal pl-5">
            <li><b>Read.</b> pdf.js pulls the text of each page. The text is normalised (NFKC), hyphenated line breaks are re-joined and whitespace is collapsed.</li>
            <li><b>Chunk.</b> Sentences are packed up to about 500 characters. The last sentence repeats at the start of the next chunk. A chunk never crosses a page, so each one has exactly one page number.</li>
            <li><b>Embed.</b> Xenova/all-MiniLM-L6-v2, the ONNX build of the same model the notebook uses, turns each chunk into 384 numbers inside a Web Worker. The model file (about 23 MB) is downloaded once and cached.</li>
            <li><b>Search.</b> Your question is embedded the same way and compared with every chunk by dot product. The best score decides whether to answer.</li>
            <li><b>Quote.</b> The top chunks are split into sentences, which are scored against the question. The best sentence from each of up to three chunks is shown with document, page and score.</li>
          </ol>
        </Panel>
        <Panel title="Known limits, stated up front." source="design notes for this demo">
          <ul className="space-y-3 list-disc pl-5">
            <li>Answers are extractive. The Colab notebook generates a sentence with FLAN-T5; this site does not run a generator.</li>
            <li>Scanned PDFs have no text layer and are not supported (no OCR).</li>
            <li>The sentence splitter here is a regex, not NLTK punkt, so chunk boundaries for uploaded PDFs can differ slightly from the notebook. The sample corpus was chunked by the notebook itself.</li>
            <li>The refusal threshold was fitted on 30 questions about four NLP papers and may need retuning for other material.</li>
            <li>The embedding model and ONNX runtime files load from public CDNs on first use, so the first question needs internet access. Your documents are never sent anywhere.</li>
            <li>Embeddings of the sample corpus are stored as float16; this changes scores in the third decimal at most.</li>
          </ul>
        </Panel>

        <Panel title="Glossary: ten terms that explain every number on this page." source="course notes; notebook Steps 3 to 9">
          <dl className="grid gap-3">
            {GLOSSARY.map(([t, d]) => (
              <div key={t}><dt className="font-semibold">{t}</dt><dd style={{ color: "var(--muted)" }}>{d}</dd></div>
            ))}
          </dl>
        </Panel>

        <Panel title="Pipeline settings, side by side: notebook against this website." source="notebook Steps 2 to 10; web/lib/*.ts">
          <div className="overflow-x-auto">
            <table className="t">
              <caption className="sr-only">Notebook versus website settings</caption>
              <thead><tr><th scope="col">Stage</th><th scope="col">Notebook (Colab)</th><th scope="col">Website (browser)</th></tr></thead>
              <tbody>
                {[
                  ["Text extraction", "PyMuPDF", "pdf.js"],
                  ["Cleaning", "NFKC, de-hyphenate, collapse", "same rules"],
                  ["Sentence splitting", "NLTK punkt", "regex rule (sample corpus used punkt)"],
                  ["Chunking", "sentence-aware 500, 1 overlap", "same algorithm"],
                  ["Embedding model", "all-MiniLM-L6-v2 (PyTorch)", "Xenova/all-MiniLM-L6-v2 (ONNX)"],
                  ["Search", "NumPy and FAISS exact", "dot product in a Float32Array"],
                  ["Refusal", `cosine < ${r.threshold.chosen.toFixed(2)}`, `cosine < ${r.threshold.chosen.toFixed(2)}`],
                  ["Answer", "FLAN-T5-base generation", "extractive best sentences"],
                ].map((row) => <tr key={row[0]}><th scope="row" className="text-left p-2 font-semibold">{row[0]}</th><td>{row[1]}</td><td>{row[2]}</td></tr>)}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </Section>
  );
}
