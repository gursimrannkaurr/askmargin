"""Build dist/Askmargin_NLP_Project_Report.pdf.

Usage (from the report/ folder):  python scripts/build.py
Needs:  pip install markdown-it-py pygments playwright pymupdf  &&  playwright install chromium
Inputs: config.json (your details), data/executed.ipynb + data/figures (copied from the executed
        notebook), src/chapters/*.md (text), screens/*.png (website screenshots, optional).
"""
import base64, html, io, json, re, sys
from pathlib import Path
from markdown_it import MarkdownIt
from pygments import highlight
from pygments.lexers import PythonLexer
from pygments.formatters import HtmlFormatter
import fitz
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
import shots
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SRC, DATA, SCREENS, DIST = ROOT / "src", ROOT / "data", ROOT / "screens", ROOT / "dist"
DIST.mkdir(exist_ok=True)
NB = json.loads((DATA / "executed.ipynb").read_text(encoding="utf8"))
CELLS = NB["cells"]
FINAL = DIST / "Askmargin_NLP_Project_Report.pdf"
md = MarkdownIt("commonmark", {"html": True}).enable("table")
FMT = HtmlFormatter(nowrap=True)
HEADS = []
RENDER = shots.Renderer(Path(__file__).resolve().parent.parent / 'dist' / 'shots')
SHOT_COUNT = [0]   # number of designated colour screenshots embedded
FLOW = {"2", "3", "4", "5", "6"}   # chapters that continue on the same page (saves paper)


def gray_b64(raw_bytes):
    """Convert any image to 8-bit grayscale (sources stay unchanged) and return a data URI."""
    im = Image.open(io.BytesIO(raw_bytes))
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        im = Image.alpha_composite(bg, im)
    out = io.BytesIO()
    im.convert("L").save(out, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(out.getvalue()).decode()


def b64(path):
    return gray_b64(Path(path).read_bytes())


def gray_svg(svg):
    """Replace every colour in the diagram by a gray (dark colours become black)."""
    def f(m):
        h = m.group(0)[1:]
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        r, g, bl = (int(h[i:i + 2], 16) for i in (0, 2, 4))
        lum = round(.299 * r + .587 * g + .114 * bl)
        lum = 0 if lum < 115 else lum
        return "#%02x%02x%02x" % (lum, lum, lum)
    return re.sub(r"#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}", f, svg)


FIGN = [0]


def src_of(i):
    return "".join(CELLS[i]["source"]).rstrip("\n")


def exec_count(i):
    return CELLS[i].get("execution_count")


def png_uri(data):
    SHOT_COUNT[0] += 1
    return "data:image/png;base64," + base64.b64encode(data).decode()


def code_shot(idx):
    inner = ""
    for spec in idx:   # "15" (whole cell) or "15@0-23" (line slice)
        i, _, rng = str(spec).partition("@")
        i = int(i)
        a, _, z = rng.partition("-")
        inner += shots.code_cell_html(exec_count(i), src_of(i), int(a) if a else 0, int(z) if z else None)
    return f'<figure class="vs"><img src="{png_uri(RENDER.png(inner))}"></figure>'


def strip_ansi(t):
    return re.sub(r"\x1b\[[0-9;]*m", "", t)


def out_parts(i, skip_images=False, maxlines=None):
    parts = []
    for o in CELLS[i].get("outputs", []):
        t = o["output_type"]
        if t == "stream":
            if o.get("name") == "stderr":
                continue  # warnings / progress bars are not part of the result
            txt = strip_ansi("".join(o["text"]))
            if maxlines:
                L = txt.split(chr(10))
                txt = chr(10).join(L[:maxlines]) + (chr(10) + "..." if len(L) > maxlines else "")
            parts.append(f"<pre>{html.escape(txt.rstrip())}</pre>")
        elif t in ("display_data", "execute_result"):
            d = o["data"]
            if "text/html" in d:
                h = "".join(d["text/html"])
                parts.append(re.sub(r"<style.*?</style>", "", h, flags=re.S))
            elif "image/png" in d:
                if not skip_images:
                    parts.append(f'<img src="{gray_b64(base64.b64decode(d["image/png"]))}">')
            elif "text/plain" in d:
                parts.append(f"<pre>{html.escape(''.join(d['text/plain']))}</pre>")
        elif t == "error":
            parts.append(f'<pre class="err">{html.escape(strip_ansi(o["ename"] + ": " + o["evalue"]))}</pre>')
    return shots.output_cell_html(exec_count(i), "".join(parts)) if parts else ""


def out_group(spec, caption):
    """spec: list of (cell index, maxlines or None). One VS Code window with several Out[n] cells."""
    inner = "".join(out_parts(i, maxlines=m) for i, m in spec)
    FIGN[0] += 1
    img = png_uri(RENDER.png(inner, status=False))
    return (f'<figure class="vs"><img src="{img}"><div class="fcap"><b>Figure 5.{FIGN[0]}:</b> {html.escape(caption)}</div></figure>')


def figure(name, cap, width="86%"):
    p = DATA / "figures" / name
    return f'<figure><img src="{b64(p)}" style="width:{width}"><div class="fcap">{cap}</div></figure>'


EXPECTED_SHOTS = [("02-answer.png", "Answer page: best sentences with page citations and the stage-by-stage trace"),
                  ("04-refusal.png", "Refusal: best cosine 0.18 is below the 0.24 threshold, so nothing is shown"),
                  ("06-semantic-map.png", "Semantic map: the question (star) among the chunk embeddings (PCA)")]


def site_gallery():
    cells = []
    for n, c in EXPECTED_SHOTS:
        p = SCREENS / n
        FIGN[0] += 1
        if p.exists():
            cells.append(f'<figure class="web"><img src="{png_uri(p.read_bytes())}"><div class="fcap"><b>Figure 5.{FIGN[0]}:</b> {html.escape(c)}</div></figure>')
        else:
            cells.append(f'<figure class="web"><div class="ph-shot">PLACEHOLDER<br>report/screens/{n}<br>{html.escape(c)}</div><div class="fcap"><b>Figure 5.{FIGN[0]}:</b> {html.escape(c)}</div></figure>')
    return '<div class="site">' + "".join(cells) + '</div>'


def render_body():
    FIGN[0] = 0
    SHOT_COUNT[0] = 0
    text = "\n\n".join(f.read_text(encoding="utf8") for f in sorted((SRC / "chapters").glob("*.md")))
    h = md.render(text)

    def tok(m):
        kind = m.group(1)
        a = [x.strip() for x in html.unescape(m.group(2)).split("|")]
        if kind == "SHOT":
            return code_shot(a[0].split(","))
        if kind == "OUTS":
            spec = []
            for x in a[0].split(","):
                i, _, m = x.partition(":")
                spec.append((int(i), int(m) if m else None))
            return out_group(spec, a[1])
        if kind == "FIG":
            return figure(a[0], a[1], a[2] if len(a) > 2 else "86%")
        if kind == "DIAGRAM":
            return f'<div class="diagram">{gray_svg((SRC / "diagram.svg").read_text(encoding="utf8"))}</div>'
        if kind == "SITE":
            return site_gallery()
        if kind == "CAP":
            return f'<div class="{a[0]}">{a[1]}</div>'
        raise ValueError(kind)

    h = re.sub(r"<p>\{\{(\w+):(.*?)\}\}</p>", tok, h, flags=re.S)
    h = re.sub(r"<h1>Chapter (\d+) \| (.*?)</h1>",
               lambda m: f'<h1{" class=flow" if m.group(1) in FLOW else ""}><span class="chno">Chapter {m.group(1)}</span>{m.group(2)}</h1>', h)
    return h


def collect_heads(body):
    HEADS.clear()

    def h1(m):
        label = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", m.group(1))).strip()
        label = re.sub(r"^(Chapter \d+)\s", r"\1: ", label)
        tid = f"h{len(HEADS)}"
        HEADS.append((1, tid, label))
        return f'<h1 id="{tid}"{" class=flow" if "class=flow" in m.group(0)[:20] else ""}>{m.group(1)}</h1>'

    body = re.sub(r"<h1[^>]*>(.*?)</h1>", lambda m: h1(m), body, flags=re.S)

    def h2(m):
        tid = f"h{len(HEADS)}"
        HEADS.append((2, tid, html.unescape(re.sub(r"<[^>]+>", "", m.group(1)))))
        return f'<h2 id="{tid}">{m.group(1)}</h2>'

    body = re.sub(r"<h2>(\d+\.\d+ .*?)</h2>", h2, body)
    # order headings: chapter by chapter, h1 first (needed for the contents page)
    def key(e):
        m = re.match(r"(?:Chapter )?(\d+)", e[2])
        return (int(m.group(1)) if m else 99, e[0], int(e[1][1:]))
    HEADS.sort(key=key)
    return body


DESC = {
    "1": "Why language models hallucinate, where document Q&A is used, and the objectives of this project.",
    "2": "The four public arXiv papers, the chunks produced from them and the 30-question evaluation set.",
    "3": "The eleven pipeline stages with the technique and the formula used at each stage.",
    "4": "The complete notebook code, cell by cell, with an explanation of every cell.",
    "5": "Real notebook outputs, figures and screenshots of the live web demo.",
    "6": "Retrieval and answer results, error analysis, limitations, future work, conclusion, references.",
}


TABLES = []


def collect_tables(body):
    TABLES.clear()
    for m in re.finditer(r'<div class="tcap"><b>Table (\d+\.\d+):</b>\s*(.*?)</div>', body, flags=re.S):
        cap = html.unescape(re.sub(r"<[^>]+>", "", m.group(2)))
        cap = re.split(r"\. |\(", cap)[0].strip().rstrip(".")
        TABLES.append((m.group(1), cap))


def table_pages(raw):
    d = fitz.open(raw)
    texts = [re.sub(r"\s+", " ", d[i].get_text()) for i in range(len(d))]
    res = {}
    for n, _ in TABLES:
        for i in range(1, len(d)):
            if f"Table {n}:" in texts[i]:
                res[n] = i + 1
                break
    d.close()
    return res


def toc_html(pages, tpages=None):
    tpages = tpages or {}
    out = ['<section class="tocpage">',
           '<h2 class="toctitle">Contents</h2><div class="toc">']
    for lvl, tid, label in HEADS:
        pg = pages.get(tid, "")
        if lvl == 1:
            num = re.match(r"Chapter (\d+)", label).group(1)
            name = re.sub(r"^Chapter \d+: ", "", label)
            out.append(f'<div class="chap"><div class="l c1"><span class="t"><span class="cn">{num}</span>{html.escape(name)}</span><span class="d"></span><span class="pn">{pg}</span></div>')
        else:
            out.append(f'<div class="l c2"><span class="t">{html.escape(label)}</span><span class="d"></span><span>{pg}</span></div>')
        nxt = HEADS[HEADS.index((lvl, tid, label)) + 1] if HEADS.index((lvl, tid, label)) + 1 < len(HEADS) else None
        if nxt is None or nxt[0] == 1:
            out.append("</div>")
    if TABLES:
        out.append('<div class="lot-h">List of Tables</div>')
        for n, cap in TABLES:
            out.append(f'<div class="l c3"><span class="t">Table {n}: {html.escape(cap)}</span><span class="d"></span><span>{tpages.get(n, "")}</span></div>')
    out.append("</div></section>")
    return "".join(out)


def build_pdf(pages, tpages=None):
    body = collect_heads(render_body())
    collect_tables(body)
    css = (SRC / "report.css").read_text(encoding="utf8")
    doc = (f"<!doctype html><html><head><meta charset='utf-8'><title>Askmargin NLP Project Report</title>"
           f"<style>{css}</style></head><body>{toc_html(pages, tpages)}{body}</body></html>")
    (DIST / "report.html").write_text(doc, encoding="utf8")
    raw = DIST / "_raw.pdf"
    RENDER.pdf((DIST / 'report.html').as_uri(), raw)
    return raw


def find_pages(raw):
    d = fitz.open(raw)
    texts = [re.sub(r"\s+", " ", d[i].get_text()) for i in range(len(d))]
    res, start, chap = {}, 1, {}
    for lvl, tid, label in HEADS:
        needle = re.sub(r"^Chapter \d+: ", "", label)
        mm = re.match(r"(?:Chapter )?(\d+)", label)
        if lvl == 2 and mm and int(mm.group(1)) in chap:
            start = chap[int(mm.group(1))]
        for i in range(start, len(d)):
            if needle.lower() in texts[i].lower():
                res[tid] = i + 1
                start = i
                if lvl == 1 and mm: chap[int(mm.group(1))] = i
                break
    d.close()
    return res


def stamp(raw):
    d = fitz.open(raw)
    for i, page in enumerate(d):
        r = page.rect
        t = str(i + 1)
        w = fitz.get_text_length(t, fontname="tiro", fontsize=11)
        page.insert_text(((r.width - w) / 2, r.height - 38), t, fontsize=11, fontname="tiro", color=(0, 0, 0))
    d.set_metadata({"title": "Askmargin - NLP Project Report", "subject": "Natural Language Processing"})
    d.save(FINAL, garbage=3, deflate=True)
    n = len(d)
    d.close()
    return n


def check_colour(pdf):
    """Colour is allowed only inside the designated screenshot images.
    Returns (coloured text spans, coloured vector drawings, non-gray pixels outside images, coloured images)."""
    d = fitz.open(pdf)
    bad_text = bad_draw = bad_px = colour_imgs = 0
    gray = lambda c: c is None or len(c) < 3 or (abs(c[0] - c[1]) < 1e-3 and abs(c[1] - c[2]) < 1e-3)
    for page in d:
        for blk in page.get_text("dict")["blocks"]:
            for ln in blk.get("lines", []):
                for sp in ln["spans"]:
                    c = sp["color"]
                    if ((c >> 16) & 255) != ((c >> 8) & 255) or ((c >> 8) & 255) != (c & 255):
                        bad_text += 1
        for dr in page.get_drawings():
            if not gray(dr.get("color")) or not gray(dr.get("fill")):
                bad_draw += 1
        pm = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
        a = np.frombuffer(pm.samples, dtype=np.uint8).reshape(pm.height, pm.width, pm.n).copy()
        full = ((a[..., 0] != a[..., 1]) | (a[..., 1] != a[..., 2]))
        for im in page.get_image_info():
            x0, y0, x1, y1 = [int(v * 1.5) for v in im["bbox"]]
            reg = full[max(y0 - 3, 0):y1 + 3, max(x0 - 3, 0):x1 + 3]
            if reg.any():
                colour_imgs += 1
            full[max(y0 - 3, 0):y1 + 3, max(x0 - 3, 0):x1 + 3] = False
        bad_px += int(full.sum())
    d.close()
    return bad_text, bad_draw, bad_px, colour_imgs


if __name__ == "__main__":
    pages, tpages = {}, {}
    raw = build_pdf(pages, tpages)
    for _ in range(3):
        new, tnew = find_pages(raw), table_pages(raw)
        if new == pages and tnew == tpages:
            break
        pages, tpages = new, tnew
        raw = build_pdf(pages, tpages)
    RENDER.close()
    n = stamp(raw)
    miss = [l for _, t, l in HEADS if t not in pages]
    print(f"{FINAL}  pages={n}")
    if miss:
        print("WARNING: headings not located:", miss)
    bt, bd, bp, ci = check_colour(FINAL)
    print(f"colour check: coloured text spans={bt}, coloured drawings={bd}, non-gray pixels outside screenshots={bp}, pages with colour screenshots={ci}")
    if n > 19:
        print("ERROR: more than 19 pages!")
        sys.exit(2)
    if bt or bd or bp:
        print("ERROR: colour found outside the designated screenshot images")
        sys.exit(3)
