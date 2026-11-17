"""Render VS Code-style screenshots (dark theme) of notebook code and notebook outputs.

The screenshots are real browser renders (Playwright / Chromium, device scale factor 2) of an HTML
mock-up of a VS Code window: title bar with window buttons, activity bar, notebook tab, line numbers,
Dark+ syntax colours (Pygments tokens mapped to the Dark+ palette) and a status bar showing Python 3.12.
"""
import hashlib, html, re
from pathlib import Path
from pygments.lexers import PythonLexer
from pygments.token import STANDARD_TYPES, Token

WIDTH = 880  # CSS px; scaled to the 500 pt text width of the page -> 12 px font prints at about 6.8 pt

CSS = """
*{box-sizing:border-box}
body{margin:0;background:#fff}
#win{width:%dpx;background:#1e1e1e;border:1px solid #3c3c3c;font-family:'Segoe UI',Arial,sans-serif;color:#cccccc;overflow:hidden}
.tb{height:24px;background:#3c3c3c;display:flex;align-items:center;position:relative}
.dots{display:flex;gap:8px;padding-left:12px;position:absolute;left:0}
.dots i{width:12px;height:12px;border-radius:50%%;display:block}
.dots i:nth-child(1){background:#ff5f56}.dots i:nth-child(2){background:#ffbd2e}.dots i:nth-child(3){background:#27c93f}
.ttl{margin:0 auto;font-size:12px;color:#cccccc}
.mid{display:flex}
.act{width:40px;background:#333333;padding-top:6px;display:flex;flex-direction:column;align-items:center;gap:4px;flex:none}
.act div{width:40px;height:34px;display:flex;align-items:center;justify-content:center;border-left:2px solid transparent}
.act div.on{border-left-color:#fff}
.act svg{width:22px;height:22px;stroke:#858585;fill:none;stroke-width:1.6}
.act .on svg{stroke:#ffffff}
.ed{flex:1;min-width:0}
.tabs{height:28px;background:#252526;display:flex}
.tab{background:#1e1e1e;color:#ffffff;font-size:12px;padding:0 14px;display:flex;align-items:center;gap:8px;border-top:1px solid #007acc}
.tab b{color:#e8ab53;font-weight:600;font-size:11px}
.tab u{text-decoration:none;color:#c5c5c5;margin-left:8px}
.crumb{font-size:12px;color:#a0a0a0;padding:3px 16px;background:#1e1e1e}
.cell{display:flex;padding:1px 8px 1px 4px}
.lab{width:44px;flex:none;text-align:right;padding-right:8px;font-family:Consolas,'Cascadia Mono',monospace;font-size:11px;color:#858585;padding-top:5px}
.lab.out{color:#d19a66}
.box{flex:1;min-width:0;background:#1e1e1e;border:1px solid #3c3c3c;border-left:3px solid #0e639c;padding:2px 0}
.box.o{border-left-color:#4d4d4d}
.ln{display:flex;font-family:Consolas,'Cascadia Mono',monospace;font-size:12px;line-height:15px}
.num{width:30px;flex:none;text-align:right;padding-right:10px;color:#6e7681}
.t{flex:1;white-space:pre-wrap;word-break:break-all;color:#d4d4d4;padding-right:8px;padding-left:2px;min-width:0}
.sb{height:18px;background:#007acc;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:space-between;padding:0 10px}
.k,.kn,.kr{color:#c586c0}.kd,.kc,.ow{color:#569cd6}
.nf,.nb,.fm{color:#dcdcaa}.nc,.nn,.ne{color:#4ec9b0}.bp{color:#569cd6}
.s,.s1,.s2,.sa,.sb2,.sc,.dl,.se,.sh,.sx,.sr,.ss{color:#ce9178}.sd{color:#6a9955}.si{color:#ce9178}
.mi,.mf,.mh,.mb,.mo,.il{color:#b5cea8}
.c,.c1,.cm,.cp,.ch{color:#6a9955}
.t .n{color:#9cdcfe}.t .nx{color:#9cdcfe}.o_{color:#d4d4d4}.p{color:#d4d4d4}.nv,.na,.nd{color:#9cdcfe}.nd{color:#dcdcaa}
.out{padding:1px 10px}
.out pre{margin:0;font-family:Consolas,'Cascadia Mono',monospace;font-size:12px;line-height:15px;white-space:pre-wrap;word-break:break-word;color:#d4d4d4}
.out table{border-collapse:collapse;font-family:Consolas,'Cascadia Mono',monospace;font-size:11.5px;color:#d4d4d4;margin:2px 0}
.out th,.out td{border:1px solid #454545;padding:1px 8px;text-align:right}
.out th{background:#2d2d2d;color:#e0e0e0;font-weight:600}
.out img{display:block;background:#fff;margin:4px auto;max-width:96%%;max-height:195px}
.out .err{color:#f48771}
""" % WIDTH

ICONS = [
    '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z M14 3v4h4"/></svg>',
    '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/></svg>',
    '<svg viewBox="0 0 24 24"><circle cx="7" cy="6" r="2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="9" r="2"/><path d="M7 8v8 M17 11c0 4-10 2-10 5"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M7 4l12 8-12 8z"/></svg>',
    '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="15" y="14" width="5" height="5"/></svg>',
]


def window(inner, status=True, tab="askmargin_rag.ipynb"):
    act = "".join(f'<div class="{"on" if i == 0 else ""}">{s}</div>' for i, s in enumerate(ICONS))
    sb = ('<div class="sb"><span>main*&nbsp;&nbsp;&nbsp;0 errors</span><span>Python 3.12.4 &nbsp;&nbsp; Cell 1 of 17 &nbsp;&nbsp; UTF-8</span></div>'
          if status else "")
    return (f'<div id="win"><div class="tb"><span class="dots"><i></i><i></i><i></i></span>'
            f'<span class="ttl">{tab} - askmargin - Visual Studio Code</span></div>'
            f'<div class="mid"><div class="act">{act}</div><div class="ed">'
            f'<div class="tabs"><div class="tab"><b>NB</b>{tab}<u>&times;</u></div></div>'
            f'{inner}<div style="height:4px"></div></div></div>{sb}</div>')


def _cls(ttype):
    while ttype is not Token and ttype not in STANDARD_TYPES:
        ttype = ttype.parent
    c = STANDARD_TYPES.get(ttype, "")
    return {"o": "o_", "sb": "sb2"}.get(c, c)


def code_lines(code):
    """Highlight python code, returning a list of HTML strings, one per source line."""
    lines, cur = [], []
    for ttype, value in PythonLexer().get_tokens(code.rstrip("\n")):
        parts = value.split("\n")
        for j, part in enumerate(parts):
            if j > 0:
                lines.append("".join(cur))
                cur = []
            if part:
                c = _cls(ttype)
                esc = html.escape(part)
                cur.append(f'<span class="{c}">{esc}</span>' if c else esc)
    lines.append("".join(cur))
    return lines


def code_cell_html(label, code, start=0, end=None):
    """start/end select a slice of the cell's lines (line numbers continue from the full cell)."""
    ls = code_lines(code)
    end = len(ls) if end is None else end
    rows = "".join(f'<div class="ln"><span class="num">{i}</span><span class="t">{l or " "}</span></div>'
                   for i, l in enumerate(ls[start:end], start + 1))
    return f'<div class="cell"><div class="lab">[{label}]:</div><div class="box">{rows}</div></div>'


def output_cell_html(label, parts_html):  # one 'Out[n]' cell
    return (f'<div class="cell"><div class="lab out">Out[{label}]:</div>'
            f'<div class="box o"><div class="out">{parts_html}</div></div></div>')


class Renderer:
    def __init__(self, cache_dir):
        self.cache = Path(cache_dir)
        self.cache.mkdir(parents=True, exist_ok=True)
        self._pw = None

    def _start(self):
        from playwright.sync_api import sync_playwright
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch()
        self._page = self._browser.new_page(viewport={"width": WIDTH + 40, "height": 900}, device_scale_factor=2)

    def close(self):
        if self._pw:
            self._browser.close()
            self._pw.stop()
            self._pw = None

    def pdf(self, url, out):
        if self._pw is None:
            self._start()
        pg = self._browser.new_page()
        pg.goto(url)
        pg.wait_for_load_state("networkidle")
        pg.pdf(path=str(out), format="A4", print_background=True, prefer_css_page_size=True)
        pg.close()

    def png(self, inner, status=True):
        doc = f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{window(inner, status)}</body></html>"
        key = hashlib.sha1(doc.encode("utf8")).hexdigest()[:16]
        f = self.cache / f"{key}.png"
        if not f.exists():
            if self._pw is None:
                self._start()
            self._page.set_content(doc)
            self._page.wait_for_timeout(50)
            self._page.locator("#win").screenshot(path=str(f), type="png")
        return f.read_bytes()
