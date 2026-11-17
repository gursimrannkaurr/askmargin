import { clean } from "./text";

export async function extractPdf(file: File, docKey: string, onPage?: (p: number, n: number) => void) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: { doc: string; page: number; text: string }[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    let raw = "";
    for (const it of tc.items) {
      if (!("str" in it)) continue;
      raw += it.str + (it.hasEOL ? "\n" : " ");
    }
    const t = clean(raw);
    if (t.length > 80) pages.push({ doc: docKey, page: i, text: t });
    onPage?.(i, pdf.numPages);
  }
  return { pages, numPages: pdf.numPages };
}
