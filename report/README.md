# Askmargin NLP project report (hard copy)

Output: `dist/Askmargin_NLP_Project_Report.pdf` (19 pages, A4). Black-and-white academic text, tables, headings and contents page; colour appears only inside the designated screenshot images (VS Code code shots, notebook output shots, website screenshots). Footer: centred page number only. Page 1 is the Contents page with a List of Tables.

## Build
```
pip install markdown-it-py pygments playwright pymupdf numpy pillow
playwright install chromium
python scripts/build.py
```
Checks done by the script on every build:
- exit code 2 if the PDF has more than 19 pages;
- exit code 3 if any text span or vector drawing is not gray, or any pixel outside the screenshot images is not gray (R=G=B).

## Where things come from
- `data/executed.ipynb`, `data/figures/`: copies of the executed notebook and its figures/CSVs. Chapter 4 (code) and Chapter 5 (outputs) are rendered from it, so they match the notebook. If you re-run the notebook, copy the new files here and rebuild. Numbers typed in `src/chapters/*.md` (Ch. 2, 3, 6) must be updated by hand if results change.
- `scripts/shots.py`: renders VS Code-style dark windows (title bar, activity bar, tab `askmargin_rag.ipynb`, line numbers, Dark+ colours, status bar "Python 3.12") with Chromium at device scale factor 2. Images are cached in `dist/shots/`. Notebook charts inside output shots are converted to grayscale.
- `src/chapters/*.md`: report text. Tokens: `{{SHOT:15@0-23,17}}` (code cells, optional line slice), `{{OUTS:19,29:14|caption}}` (output cells, optional max lines), `{{SITE:x}}` (website screenshots).
- `src/report.css`, `src/diagram.svg` (pipeline diagram, converted to gray at build time).
- `screens/`: website screenshots, used unedited in colour (`02-answer`, `04-refusal`, `06-semantic-map`; list in `build.py`, `EXPECTED_SHOTS`). A missing file is replaced by a labelled placeholder.
- Page numbers are stamped by PyMuPDF after rendering.
