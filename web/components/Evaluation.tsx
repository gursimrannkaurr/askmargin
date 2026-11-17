"use client";
import { useState } from "react";
import type { Results } from "@/lib/data";
import { pct } from "@/lib/data";
import { Histogram, } from "./charts";
import { Legend, Panel, Section } from "./ui";

const DOC_NAMES: Record<string, string> = { attention: "Attention Is All You Need", bert: "BERT", rag: "RAG", sbert: "Sentence-BERT" };

export function Evaluation({ results: r }: { results: Results }) {
  const t = r.threshold;
  const [filter, setFilter] = useState<"all" | "fail">("all");
  const nA = t.answerable.length, nO = t.outOfDoc.length;
  const evalAt = (x: number) => {
    const wrongRef = t.answerable.filter((s) => s < x).length;
    const wrongAns = t.outOfDoc.filter((s) => s >= x).length;
    return { x, wrongRef, wrongAns, acc: (nA - wrongRef + nO - wrongAns) / (nA + nO) };
  };
  const strict = Math.floor(Math.min(...t.answerable) * 20) / 20;
  const scenarios = [
    ["Lenient", 0.2, "answers almost anything"],
    ["Base case (notebook)", t.chosen, "lowest value that separates the 30 questions"],
    ["Strict", strict, "just under the weakest answerable question"],
  ] as const;
  const grid = [...new Set([0.15, 0.2, t.chosen, 0.3, 0.4, strict, 0.5, 0.55].map((x) => +x.toFixed(2)))].sort((a, b) => a - b);
  const s = r.summary;
  const rows = r.answers.filter((a) => filter === "all" || !a.correct || !a.citation_ok);

  return (
    <Section id="eval" eyebrow="Evaluation" title={`Answerable questions score at least ${Math.min(...t.answerable).toFixed(2)} and out-of-document ones at most ${Math.max(...t.outOfDoc).toFixed(2)}, so one threshold refuses correctly.`}
      lede="A grounded assistant must say it does not know. The notebook measures the top-1 cosine of every evaluation question and chooses the threshold that best separates the two groups.">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title={`A cosine threshold of ${t.chosen.toFixed(2)} classifies ${pct(t.accuracy)} of the ${nA + nO} questions correctly as answerable or not.`}
          source="notebook Step 9, figures/refusal_threshold.png; scores re-derived from export/embeddings.f16"
          note={`Only ${nO} out-of-document questions, all on clearly different topics (the hardest realistic case is a question that is near the topic but not in the text, which this set does not test). The notebook takes the first best value, so the margin to the highest out-of-document score (${Math.max(...t.outOfDoc).toFixed(2)}) is thin.`}>
          <Legend items={[{ name: `Answerable (${nA})`, color: "var(--accent)" }, { name: `Out of document (${nO})`, color: "var(--p2)" }]} />
          <Histogram a={t.answerable} b={t.outOfDoc} threshold={t.chosen} aName="Answerable" bName="Out of document" label="Histogram of top-1 cosine similarity for answerable and out-of-document questions with the refusal threshold marked" />
        </Panel>

        <Panel title={`Moving the threshold from ${scenarios[0][1].toFixed(2)} to ${strict.toFixed(2)} changes wrong answers from ${evalAt(0.2).wrongAns} of ${nO} to ${evalAt(strict).wrongAns}, with ${evalAt(strict).wrongRef} answerable questions refused.`}
          source="notebook Step 9 scores, recomputed for each threshold in this page"
          note="Any threshold from the notebook value up to the weakest answerable score separates this question set perfectly, so the data cannot pick one inside that range. For your own documents, whose scores are unknown, a value near the lower end refuses less and a value near the upper end refuses more.">
          <div className="grid sm:grid-cols-3 gap-3">
            {scenarios.map(([name, x, why]) => {
              const e = evalAt(x);
              return (
                <div key={name} className="rounded-xl border p-3" style={{ borderColor: name.startsWith("Base") ? "var(--accent)" : "var(--rule)", background: name.startsWith("Base") ? "var(--accent-soft)" : "transparent" }}>
                  <div className="eyebrow">{name}</div>
                  <div className="serif text-3xl font-semibold">{x.toFixed(2)}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{why}</div>
                  <div className="text-sm mt-1">accuracy {pct(e.acc)}</div>
                </div>
              );
            })}
          </div>
          <div className="overflow-x-auto mt-4">
            <table className="t" data-testid="threshold-table">
              <caption className="sr-only">Refusal threshold sensitivity</caption>
              <thead><tr><th scope="col">Threshold</th><th scope="col" className="n">Answerable refused</th><th scope="col" className="n">Out-of-doc answered</th><th scope="col" className="n">Accuracy</th></tr></thead>
              <tbody>{grid.map((x) => { const e = evalAt(x); return (
                <tr key={x} className={x === t.chosen ? "best" : ""}><td>{x.toFixed(2)}{x === t.chosen ? " (notebook)" : ""}</td><td className="n">{e.wrongRef} / {nA}</td><td className="n">{e.wrongAns} / {nO}</td><td className="n">{pct(e.acc)}</td></tr>
              ); })}</tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel className="mt-5" title={`With FLAN-T5 generation the notebook answers ${s.answerCorrect} of ${s.nAnswerable} questions correctly and cites a page that really contains the answer for ${pct(s.citationCorrect / s.nAnswerable)}.`}
        source="notebook Steps 10 to 12, figures/answer_results.csv (generated by FLAN-T5-base)"
        note="Correct means the expected key phrase appears in the generated answer; a correct answer can still be phrased badly and a wrong one can still be near the truth. This website returns extractive sentences, not FLAN-T5 text, so these numbers describe the notebook, not this page.">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            [`${s.answerCorrect}/${s.nAnswerable}`, "answers correct"],
            [pct(s.citationCorrect / s.nAnswerable), "citations correct"],
            [s.faithfulness.toFixed(2), "mean faithfulness"],
            [`${s.correctlyRefused}/${s.nOutOfDoc}`, "out-of-doc refused"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-xl border p-3 flex flex-col-reverse" style={{ borderColor: "var(--rule)" }}>
              <dt className="text-sm" style={{ color: "var(--muted)" }}>{l}</dt><dd className="serif text-3xl font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex gap-2 mb-2" role="group" aria-label="Filter rows">
          <button className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")} style={filter === "all" ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : {}}>All {s.nAnswerable + s.nOutOfDoc}</button>
          <button className="chip" aria-pressed={filter === "fail"} onClick={() => setFilter("fail")} style={filter === "fail" ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : {}}>Failures only</button>
        </div>
        <div className="overflow-x-auto max-h-[34rem] overflow-y-auto rounded-lg border" style={{ borderColor: "var(--rule)" }} tabIndex={0} aria-label="Evaluation questions table, scrollable">
          <table className="t min-w-[760px]" data-testid="eval-table">
            <caption className="sr-only">The 30 evaluation questions and their results</caption>
            <thead className="sticky top-0" style={{ background: "var(--card)" }}><tr>
              <th scope="col" className="n">#</th><th scope="col">Question</th><th scope="col">Paper</th><th scope="col">Expected</th><th scope="col">Evidence pages</th><th scope="col">FLAN-T5 answer</th><th scope="col">Result</th>
            </tr></thead>
            <tbody>
              {rows.map((a) => {
                const ok = a.correct && a.citation_ok;
                return (
                  <tr key={a.id}>
                    <td className="n">{a.id}</td><td>{a.question}</td><td>{DOC_NAMES[a.doc] || a.doc}</td><td className="mono">{a.expect}</td>
                    <td className="mono">{a.pages.length ? a.pages.join(", ") : "n/a"}</td><td>{a.answer}</td>
                    <td><span className="font-semibold" style={{ color: ok ? "var(--good)" : "var(--bad)" }}>{ok ? "Pass" : !a.correct ? "Fail: answer" : "Fail: citation"}</span></td>
                  </tr>
                );
              })}
              {filter === "all" && r.outOfDocQuestions.map((o) => (
                <tr key={`o${o.id}`}>
                  <td className="n">{o.id}</td><td>{o.question}</td><td>none</td><td className="mono">refusal</td><td className="mono">n/a</td><td><i>I could not find this in the documents.</i></td>
                  <td><span className="font-semibold" style={{ color: o.refused ? "var(--good)" : "var(--bad)" }}>{o.refused ? "Pass" : "Fail"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </Section>
  );
}
