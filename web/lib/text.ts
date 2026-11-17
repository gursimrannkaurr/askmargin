export type Chunk = { doc: string; page: number; text: string };

/** Same cleaning as notebook Step 2: NFKC, de-hyphenate, collapse whitespace. */
export function clean(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/-\n(?=[a-z])/g, "")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const ABBR = /(?:\b(?:et al|e\.g|i\.e|etc|vs|Fig|Figs|Eq|Eqs|Sec|No|Dr|cf|approx)|\b[A-Z])\.$/;

/** Lightweight stand-in for NLTK punkt: split after . ! ? followed by a capital, digit or opening bracket. */
export function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(\[])/);
  const out: string[] = [];
  for (const p of parts) {
    if (out.length && ABBR.test(out[out.length - 1])) out[out.length - 1] += " " + p;
    else out.push(p);
  }
  return out.filter((s) => s.trim().length > 0);
}

/** Notebook chunk_sentence: pack sentences to ~size chars, one-sentence overlap, never cross a page. */
export function chunkPages(
  pages: { doc: string; page: number; text: string }[],
  size = 500,
): Chunk[] {
  const out: Chunk[] = [];
  for (const p of pages) {
    let cur: string[] = [];
    for (const s of splitSentences(p.text)) {
      const len = cur.reduce((a, x) => a + x.length + 1, 0);
      if (cur.length && len + s.length > size) {
        out.push({ doc: p.doc, page: p.page, text: cur.join(" ") });
        cur = [cur[cur.length - 1]];
      }
      cur.push(s);
    }
    if (cur.length && cur.join(" ").length > 60) out.push({ doc: p.doc, page: p.page, text: cur.join(" ") });
  }
  return out;
}
