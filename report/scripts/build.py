"""Build dist/Askmargin_NLP_Project_Report.pdf.

Usage (from the report/ folder):  python scripts/build.py
Needs:  pip install markdown-it-py playwright pymupdf numpy pillow  &&  playwright install chromium
Inputs: src/chapters/*.md (text), src/report.css, screens/colab/*.jpg, screens/*.png (real screenshots).
Rules:  at most 19 pages; colour only inside the screenshot images (text and drawings must be gray).
"""
import base64, html, io, re, sys
from pathlib import Path
import fitz
import numpy as np
from markdown_it import MarkdownIt
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SRC, SCREENS, DIST = ROOT / "src", ROOT / "screens", ROOT / "dist"
DIST.mkdir(exist_ok=True)
FINAL = DIST / "Askmargin_NLP_Project_Report.pdf"
MAX_PAGES = 19
md = MarkdownIt("commonmark", {"html": True}).enable("table")


def colour_image(path, crop=None):
    """Real screenshot in full colour; the crop box 'x0,y0,x1,y1' only removes browser chrome / blank space."""
    im = Image.open(path).convert("RGB")
    if crop:
        im = im.crop(tuple(int(v) for v in crop.split(",")))
    out = io.BytesIO()
    im.save(out, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(out.getvalue()).decode()


def render_body():
    text = "\n\n".join(f.read_text(encoding="utf8") for f in sorted((SRC / "chapters").glob("*.md")))
    h = md.render(text)

    def tok(m):
        kind = m.group(1)
        a = [x.strip() for x in html.unescape(m.group(2)).split("|")]
        if kind == "IMG":
            return (f'<figure><img src="{colour_image(SCREENS / a[0], a[1])}" style="width:{a[2]}">'
                    f'<div class="fcap">{html.escape(a[4])}</div></figure>')
        if kind == "CAP":
            return f'<div class="{a[0]}">{a[1]}</div>'
        raise ValueError(kind)
    h = re.sub(r"\{\{(\w+):(.*?)\}\}", tok, h, flags=re.S)
    return re.sub(r"<p>\s*((?:<figure>.*?</figure>\s*)+|<div class=\"tcap\">.*?</div>)\s*</p>", r"\1", h, flags=re.S)


HEADS = []


def tag_heads(body):
    HEADS.clear()

    def f(m):
        tid = f"h{len(HEADS)}"
        txt = html.unescape(re.sub(r"<[^>]+>", "", m.group(2)))
        HEADS.append((int(m.group(1)), tid, txt))
        return f'<h{m.group(1)} id="{tid}">{m.group(2)}</h{m.group(1)}>'
    return re.sub(r"<h([23])>(.*?)</h\1>", f, body)


def find_pages(raw):
    d = fitz.open(raw)
    res, start = {}, 1
    for lvl, tid, txt in HEADS:
        for i in range(start, len(d)):
            lines = [re.sub(r"\s+", " ", l).strip() for l in d[i].get_text().split(chr(10))]
            if txt in lines:
                res[tid] = i + 1
                start = i
                break
    d.close()
    return res


def toc_html(pages):
    out = ['<section class="tocpage"><div class="toc">']
    for lvl, tid, txt in HEADS:
        out.append(f'<div class="l c{lvl}"><span class="t">{html.escape(txt)}</span><span class="d"></span><span>{pages.get(tid, "")}</span></div>')
    out.append("</div></section>")
    return "".join(out)


def build_pdf(pages):
    body = tag_heads(render_body())
    css = (SRC / "report.css").read_text(encoding="utf8")
    doc = (f"<!doctype html><html><head><meta charset='utf-8'><title>Askmargin</title>"
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
    """Plain centred page number (digit only) on every page."""
    d = fitz.open(raw)
    for i, page in enumerate(d):
        r = page.rect
        t = str(i + 1)
        w = fitz.get_text_length(t, fontname="tiro", fontsize=11)
        page.insert_text(((r.width - w) / 2, r.height - 38), t, fontsize=11, fontname="tiro", color=(0, 0, 0))
    d.set_metadata({"title": "Askmargin: Question Answering over Documents using RAG", "subject": "Natural Language Processing"})
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
    print(f"{FINAL}  pages={n}")
    bt, bd, bp = check_colour(FINAL)
    print(f"colour check: coloured text spans={bt}, coloured drawings={bd}, non-gray pixels outside screenshots={bp}")
    if n > MAX_PAGES:
        print(f"ERROR: more than {MAX_PAGES} pages!")
        sys.exit(2)
    if bt or bd or bp:
        print("ERROR: colour found outside the screenshot images")
        sys.exit(3)
