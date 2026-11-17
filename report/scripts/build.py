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


def code_block(i, title=None):
    code = highlight(src_of(i), PythonLexer(), FMT)
    return (f'<div class="codecell"><div class="cellhead"><span>{html.escape(title or "Code cell")}</span>'
            f'<span>In [{exec_count(i)}]</span></div><pre class="hl">{code}</pre></div>')


def strip_ansi(t):
    return re.sub(r"\x1b\[[0-9;]*m", "", t)


def out_panel(i, title=None, skip_images=False, maxlines=None):
    parts = []
    for o in CELLS[i].get("outputs", []):
        t = o["output_type"]
        if t == "stream":
            if o.get("name") == "stderr":
                continue  # warnings / progress bars are not part of the result
            txt = strip_ansi("".join(o["text"]))
            if maxlines:
                L = txt.split("\n")
                txt = "\n".join(L[:maxlines]) + ("\n..." if len(L) > maxlines else "")
            parts.append(f"<pre>{html.escape(txt.rstrip())}</pre>")
        elif t in ("display_data", "execute_result"):
            d = o["data"]
            if "text/html" in d:
                h = "".join(d["text/html"])
                h = re.sub(r"<style.*?</style>", "", h, flags=re.S)
                parts.append(h)
            elif "image/png" in d:
                if not skip_images:
                    parts.append(f'<img src="{gray_b64(base64.b64decode(d["image/png"]))}">')
            elif "text/plain" in d:
                parts.append(f"<pre>{html.escape(''.join(d['text/plain']))}</pre>")
        elif t == "error":
            parts.append(f'<pre class="stderr">{html.escape(strip_ansi(o["ename"] + ": " + o["evalue"]))}</pre>')
    if not parts:
        return ""
    FIGN[0] += 1
    return (f'<div class="shot"><div class="bar"><b>Figure 5.{FIGN[0]}: {html.escape(title or "Output")}</b>'
            f'<span>Out of cell [{exec_count(i)}] - askmargin_rag.ipynb</span></div><div class="body">{"".join(parts)}</div></div>')


def figure(name, cap, width="86%"):
    p = DATA / "figures" / name
    return f'<figure><img src="{b64(p)}" style="width:{width}"><div class="fcap">{cap}</div></figure>'


EXPECTED_SHOTS = [("01-home-brief.png", "Landing page: the headline result of the notebook"),
                  ("06-semantic-map.png", "Semantic map: the question (star) among the chunk embeddings (PCA)"),
                  ("02-answer.png", "Answer page: best sentences with page citations and the stage-by-stage trace"),
                  ("04-refusal.png", "Refusal: best cosine 0.18 is below the 0.24 threshold, so nothing is shown")]


def site_gallery():
    cells = []
    for n, c in EXPECTED_SHOTS:
        p = SCREENS / n
        FIGN[0] += 1
        if p.exists():
            cells.append(f'<figure><img src="{b64(p)}"><div class="fcap"><b>Figure 5.{FIGN[0]}:</b> {html.escape(c)}</div></figure>')
        else:
            cells.append(f'<figure><div class="ph-shot">PLACEHOLDER<br>report/screens/{n}<br>{html.escape(c)}</div><div class="fcap">{html.escape(c)}</div></figure>')
    rows = ["".join(cells[i:i + 2]) for i in range(0, len(cells), 2)]
    return "".join(f'<div class="site">{r}</div>' for r in rows)


def render_body():
    FIGN[0] = 0
    text = "\n\n".join(f.read_text(encoding="utf8") for f in sorted((SRC / "chapters").glob("*.md")))
    h = md.render(text)

    def tok(m):
        kind = m.group(1)
        a = [x.strip() for x in html.unescape(m.group(2)).split("|")]
        if kind == "CODE":
            return code_block(int(a[0]), a[1] if len(a) > 1 else None)
        if kind == "OUT":
            opts = dict(x.split("=") for x in a[2:])
            return out_panel(int(a[0]), a[1] if len(a) > 1 and a[1] else None,
                             skip_images=opts.get("img") == "0", maxlines=int(opts["max"]) if "max" in opts else None)
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
    out = ['<section class="tocpage"><div class="tophead">Askmargin: RAG Document Q&amp;A Assistant &nbsp;|&nbsp; NLP project</div>',
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
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto((DIST / "report.html").as_uri())
        pg.wait_for_load_state("networkidle")
        pg.pdf(path=str(raw), format="A4", print_background=True, prefer_css_page_size=True)
        b.close()
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
        if i == 0:
            continue
        r = page.rect
        page.draw_line((54, r.height - 52), (r.width - 54, r.height - 52), color=(.8, .8, .8), width=.5)
        page.insert_text((54, r.height - 40), "Askmargin: RAG Document Q&A Assistant  |  NLP Mini-Project", fontsize=8, fontname="helv", color=(.35, .35, .35))
        t = f"Page {i + 1}"
        w = fitz.get_text_length(t, fontname="helv", fontsize=8.5)
        page.insert_text((r.width - 54 - w, r.height - 40), t, fontsize=8.5, fontname="helv", color=(.1, .1, .1))
    d.set_metadata({"title": "Askmargin: RAG Document Q&A Assistant - NLP Project Report",
                    "subject": "Natural Language Processing"})
    d.save(FINAL, garbage=3, deflate=True)
    n = len(d)
    d.close()
    return n


def check_gray(pdf):
    """Return the number of non-gray pixels over all pages (must be 0)."""
    d = fitz.open(pdf)
    bad = 0
    for page in d:
        pm = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
        a = np.frombuffer(pm.samples, dtype=np.uint8).reshape(pm.height, pm.width, pm.n)
        bad += int(((a[..., 0] != a[..., 1]) | (a[..., 1] != a[..., 2])).sum())
    d.close()
    return bad


if __name__ == "__main__":
    pages, tpages = {}, {}
    raw = build_pdf(pages, tpages)
    for _ in range(3):
        new, tnew = find_pages(raw), table_pages(raw)
        if new == pages and tnew == tpages:
            break
        pages, tpages = new, tnew
        raw = build_pdf(pages, tpages)
    n = stamp(raw)
    miss = [l for _, t, l in HEADS if t not in pages]
    print(f"{FINAL}  pages={n}")
    if miss:
        print("WARNING: headings not located:", miss)
    bad = check_gray(FINAL)
    print("non-gray pixels:", bad)
    if n > 19:
        print("ERROR: more than 19 pages!")
        sys.exit(2)
    if bad:
        print("ERROR: the PDF contains colour")
        sys.exit(3)
