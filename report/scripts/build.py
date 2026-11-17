"""Build dist/Askmargin_NLP_Project_Report.pdf.

Usage (from the report/ folder):  python scripts/build.py
Needs:  pip install markdown-it-py playwright pymupdf numpy pillow  &&  playwright install chromium
Inputs: src/chapters/*.md (text), src/report.css, src/diagram.svg,
        screens/colab/*.jpg (real Colab screenshots), screens/*.png (website screenshots),
        ../colab/askmargin_colab.ipynb (code printed in the appendix).
Rules:  at most 10 pages; colour only inside the screenshot images (text and drawings must be gray).
"""
import base64, html, io, json, re, sys
from pathlib import Path
import fitz
import numpy as np
from markdown_it import MarkdownIt
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SRC, SCREENS, DIST = ROOT / "src", ROOT / "screens", ROOT / "dist"
NOTEBOOK = ROOT.parent / "colab" / "askmargin_colab.ipynb"
DIST.mkdir(exist_ok=True)
FINAL = DIST / "Askmargin_NLP_Project_Report.pdf"
MAX_PAGES = 10
md = MarkdownIt("commonmark", {"html": True}).enable("table")
HEADS, TABLES, FIGURES = [], [], []
FLOW = {"1", "2", "3", "5"}   # chapters that continue on the same page


def png_uri(im):
    out = io.BytesIO()
    im.save(out, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(out.getvalue()).decode()


def colour_image(path, crop=None):
    """Real screenshot, kept in colour; optional crop box 'x0,y0,x1,y1' (pixels) only removes blank space."""
    im = Image.open(path).convert("RGB")
    if crop:
        im = im.crop(tuple(int(v) for v in crop.split(",")))
    return png_uri(im)


def gray_svg(svg):
    """Map every colour of the diagram to a gray (dark colours become black)."""
    def f(m):
        h = m.group(0)[1:]
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
        lum = round(.299 * r + .587 * g + .114 * b)
        lum = 0 if lum < 115 else lum
        return "#%02x%02x%02x" % (lum, lum, lum)
    return re.sub(r"#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}", f, svg)


SITE_SHOTS = [("02-answer.png", "Website: an answer with page citations and the stage-by-stage trace."),
              ("04-refusal.png", "Website: refusal for an out-of-document question (best score 0.18 is below the threshold)."),
              ("06-semantic-map.png", "Website: map of the chunks; the star is the question.")]


def site_gallery():
    cells = []
    for k, (n, c) in enumerate(SITE_SHOTS, 1):
        p = SCREENS / n
        if p.exists():
            cells.append(f'<figure class="web"><img src="{colour_image(p)}"><div class="fcap"><b>Figure 5.{k}:</b> {html.escape(c)}</div></figure>')
        else:
            cells.append(f'<figure class="web"><div class="ph-shot">PLACEHOLDER report/screens/{n}</div><div class="fcap"><b>Figure 5.{k}:</b> {html.escape(c)}</div></figure>')
    return '<div class="site">' + "".join(cells) + "</div>"


def appendix_code():
    nb = json.loads(NOTEBOOK.read_text(encoding="utf8"))
    out, k = [], 0
    for c in nb["cells"]:
        if c["cell_type"] != "code":
            continue
        k += 1
        out.append(f'<div class="acell"><div class="ahead">Cell {k}</div><pre>{html.escape("".join(c["source"]).rstrip())}</pre></div>')
    return "".join(out)


def render_body():
    text = "\n\n".join(f.read_text(encoding="utf8") for f in sorted((SRC / "chapters").glob("*.md")))
    h = md.render(text)

    def tok(m):
        kind = m.group(1)
        a = [x.strip() for x in html.unescape(m.group(2)).split("|")]
        if kind == "IMG":
            path = ROOT / "screens" / a[0]
            return (f'<figure class="vs"><img src="{colour_image(path, a[1])}" style="width:{a[2]}">'
                    f'<div class="fcap"><b>Figure {a[3]}:</b> {html.escape(a[4])}</div></figure>')
        if kind == "DIAGRAM":
            return f'<div class="diagram">{gray_svg((SRC / "diagram.svg").read_text(encoding="utf8"))}</div>'
        if kind == "SITE":
            return site_gallery()
        if kind == "APPENDIX":
            return appendix_code()
        if kind == "CAP":
            return f'<div class="{a[0]}">{a[1]}</div>'
        raise ValueError(kind)

    h = re.sub(r"<p>\{\{(\w+):(.*?)\}\}</p>", tok, h, flags=re.S)

    def h1(m):
        kind, n, title = m.group(1), m.group(2), m.group(3)
        cls = ' class="flow"' if n in FLOW else ""
        return f'<h1{cls}><span class="chno">{kind} {n}</span>{title}</h1>'
    return re.sub(r"<h1>(Chapter|Appendix) (\w+) \| (.*?)</h1>", h1, h)


def collect_heads(body):
    HEADS.clear()

    def h1(m):
        label = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", m.group(2))).strip()
        label = re.sub(r"^((?:Chapter|Appendix) \w+)\s", r"\1: ", label)
        tid = f"h{len(HEADS)}"
        HEADS.append((1, tid, label))
        return f'<h1{m.group(1)} id="{tid}">{m.group(2)}</h1>'
    body = re.sub(r"<h1([^>]*)>(.*?)</h1>", h1, body, flags=re.S)

    def h2(m):
        tid = f"h{len(HEADS)}"
        HEADS.append((2, tid, html.unescape(re.sub(r"<[^>]+>", "", m.group(1)))))
        return f'<h2 id="{tid}">{m.group(1)}</h2>'
    body = re.sub(r"<h2>(\d+\.\d+ .*?)</h2>", h2, body)

    def key(e):
        m = re.match(r"(?:Chapter )?(\d+)", e[2])
        return (int(m.group(1)) if m else 99, e[0], int(e[1][1:]))
    HEADS.sort(key=key)
    return body


def collect_lists(body):
    TABLES.clear()
    FIGURES.clear()
    for m in re.finditer(r'<div class="tcap"><b>Table (\d+\.\d+):</b>\s*(.*?)</div>', body, flags=re.S):
        TABLES.append((m.group(1), re.split(r"\. |\(", html.unescape(re.sub(r"<[^>]+>", "", m.group(2))))[0].strip().rstrip(".")))
    for m in re.finditer(r'<div class="fcap"><b>Figure (\d+\.\d+):</b>\s*(.*?)</div>', body, flags=re.S):
        FIGURES.append((m.group(1), re.split(r"\. |\(|:", html.unescape(re.sub(r"<[^>]+>", "", m.group(2))))[0].strip().rstrip(".")))


def find_pages(raw):
    d = fitz.open(raw)
    texts = [re.sub(r"\s+", " ", d[i].get_text()).lower() for i in range(len(d))]
    res, start, chap = {}, 0, {}
    for lvl, tid, label in HEADS:
        needle = re.sub(r"^(?:Chapter|Appendix) \w+: ", "", label).lower()
        mm = re.match(r"(?:Chapter )?(\d+)", label)
        if lvl == 2 and mm and int(mm.group(1)) in chap:
            start = chap[int(mm.group(1))]
        for i in range(start, len(d)):
            if texts[i].count(needle) >= (2 if i == 0 else 1):   # page 1 also holds the contents list
                res[tid] = i + 1
                start = i
                if lvl == 1 and mm:
                    chap[int(mm.group(1))] = i
                break
    for kind, items in (("Table", TABLES), ("Figure", FIGURES)):
        for n, _ in items:
            for i in range(1, len(d)):
                if f"{kind} {n}:".lower() in texts[i]:
                    res[f"{kind}{n}"] = i + 1
                    break
    d.close()
    return res


def toc_html(pages):
    out = ['<section class="tocpage"><h2 class="toctitle">Contents</h2><div class="toc">']
    for idx, (lvl, tid, label) in enumerate(HEADS):
        pg = pages.get(tid, "")
        if lvl == 1:
            m = re.match(r"(Chapter|Appendix) (\w+): (.*)", label)
            num = m.group(2)
            out.append(f'<div class="chap"><div class="l c1"><span class="t"><span class="cn">{num}</span>{html.escape(m.group(3))}</span><span class="d"></span><span>{pg}</span></div>')
        else:
            out.append(f'<div class="l c2"><span class="t">{html.escape(label)}</span><span class="d"></span><span>{pg}</span></div>')
        if idx + 1 >= len(HEADS) or HEADS[idx + 1][0] == 1:
            out.append("</div>")
    for title, kind, items in ():
        if items:
            out.append(f'<div class="lot-h">{title}</div><div class="lots">')
            for n, cap in items:
                out.append(f'<div class="l c3"><span class="t">{kind} {n}: {html.escape(cap)}</span><span class="d"></span><span>{pages.get(kind + n, "")}</span></div>')
            out.append("</div>")
    out.append("</div></section>")
    return "".join(out)


def build_pdf(pages):
    body = collect_heads(render_body())
    collect_lists(body)
    css = (SRC / "report.css").read_text(encoding="utf8")
    doc = (f"<!doctype html><html><head><meta charset='utf-8'><title>Askmargin NLP Project Report</title>"
           f"<style>{css}</style></head><body>{toc_html(pages)}{body}</body></html>")
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
    """Colour is allowed only inside the screenshot images.
    Returns (coloured text spans, coloured drawings, non-gray pixels outside images)."""
    d = fitz.open(pdf)
    bad_text = bad_draw = bad_px = 0
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
        a = np.frombuffer(pm.samples, dtype=np.uint8).reshape(pm.height, pm.width, pm.n)
        full = (a[..., 0] != a[..., 1]) | (a[..., 1] != a[..., 2])
        for im in page.get_image_info():
            x0, y0, x1, y1 = [int(v * 1.5) for v in im["bbox"]]
            full[max(y0 - 3, 0):y1 + 3, max(x0 - 3, 0):x1 + 3] = False
        bad_px += int(full.sum())
    d.close()
    return bad_text, bad_draw, bad_px


if __name__ == "__main__":
    pages = {}
    raw = build_pdf(pages)
    for _ in range(3):
        new = find_pages(raw)
        if new == pages:
            break
        pages = new
        raw = build_pdf(pages)
    n = stamp(raw)
    raw.unlink(missing_ok=True)
    miss = [l for _, t, l in HEADS if t not in pages]
    print(f"{FINAL}  pages={n}")
    if miss:
        print("WARNING: headings not located:", miss)
    bt, bd, bp = check_colour(FINAL)
    print(f"colour check: coloured text spans={bt}, coloured drawings={bd}, non-gray pixels outside screenshots={bp}")
    if n > MAX_PAGES:
        print(f"ERROR: more than {MAX_PAGES} pages!")
        sys.exit(2)
    if bt or bd or bp:
        print("ERROR: colour found outside the screenshot images")
        sys.exit(3)
