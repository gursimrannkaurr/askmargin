"use client";
import { useMemo } from "react";
import type { Corpus, Results } from "@/lib/data";
import type { Answer } from "@/lib/rag";
import { Heatmap, SemanticMap } from "./charts";
import { Panel, Section } from "./ui";

export function MapSection({ corpus, answer }: { corpus: Corpus; answer: Answer | null; results?: Results }) {
  const docs = useMemo(() => Object.keys(corpus.docs), [corpus]);
  const points = useMemo(() => corpus.chunks.map((c, i) => ({ x: corpus.coords[i][0], y: corpus.coords[i][1], doc: c.doc, page: c.page, text: c.text })), [corpus]);
  const sim = useMemo(() => {
    const { dim, E, chunks } = corpus;
    const means = docs.map((d) => {
      const v = new Float64Array(dim);
      chunks.forEach((c, i) => { if (c.doc === d) { for (let j = 0; j < dim; j++) v[j] += E[i * dim + j]; } });
      const norm = Math.hypot(...v) || 1;
      return Array.from(v, (x) => x / norm);
    });
    return means.map((a) => means.map((b) => a.reduce((s, x, j) => s + x * b[j], 0)));
  }, [corpus, docs]);
  const pairs: [string, string, number][] = [];
  docs.forEach((a, i) => docs.forEach((b, j) => { if (j > i) pairs.push([a, b, sim[i][j]]); }));
  pairs.sort((a, b) => b[2] - a[2]);
  const v = corpus.pca.var1 + corpus.pca.var2;
  const name = (d: string) => corpus.docs[d] || d;
  const hits = answer ? answer.top.map((h) => h.index) : [];

  return (
    <Section id="map" eyebrow="Semantic map" title={`Two axes keep ${(v * 100).toFixed(0)}% of what the 384-dimensional embeddings encode, and still show which chunks sit near your question.`}
      lede="Each dot is one chunk, placed by PCA of its embedding. Ask a question above and it appears as a star with lines to the chunks retrieved.">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel title={answer ? (answer.refused ? "Your question lands away from every paper: the closest chunk is below the refusal threshold." : "The star is your question; the ringed dots are the chunks it retrieved.") : "Chunks from the same paper tend to share a region of the map."}
          source={corpus.sample ? `PCA computed offline in Python (scikit-learn) on web/public/sample/embeddings.f16; PC1 ${(corpus.pca.var1 * 100).toFixed(1)}%, PC2 ${(corpus.pca.var2 * 100).toFixed(1)}% of variance` : `PCA computed in your browser by power iteration; PC1 ${(corpus.pca.var1 * 100).toFixed(1)}%, PC2 ${(corpus.pca.var2 * 100).toFixed(1)}% of variance`}
          note={`A 2-D PCA projection discards ${((1 - v) * 100).toFixed(0)}% of the variance, so two dots can look close and not be. Retrieval uses the full 384 dimensions; the map is an illustration. The query is projected with the same mean and axes.`}>
          <SemanticMap points={points} docs={docs} names={corpus.docs} query={answer?.qpoint ?? null} hits={hits} label={`Scatter plot of ${points.length} chunks projected to two dimensions, coloured by paper`} />
        </Panel>
        {docs.length > 1 ? (
          <Panel title={`${name(pairs[0][0])} and ${name(pairs[0][1])} are the most similar pair of papers (${pairs[0][2].toFixed(2)}); ${name(pairs[pairs.length - 1][0])} and ${name(pairs[pairs.length - 1][1])} the least (${pairs[pairs.length - 1][2].toFixed(2)}).`}
            source="mean chunk embedding per paper, cosine similarity, computed live from the index"
            note="Averaging hundreds of chunks pulls every paper toward a common NLP-paper direction, so all off-diagonal values are high. Read the ranking, not the absolute level.">
            <Heatmap docs={docs} matrix={sim} names={corpus.docs} />
          </Panel>
        ) : (
          <Panel title="Upload a second PDF to compare documents; one document has nothing to compare against." source="computed live from the index"><p className="text-sm">Add more papers to see how similar their topics are.</p></Panel>
        )}
      </div>
    </Section>
  );
}
