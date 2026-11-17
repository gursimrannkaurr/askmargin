# Askmargin NLP project report (hard copy)

Output: `dist/Askmargin_NLP_Project_Report.pdf` (14 pages, A4). Plain black-and-white academic text (Times, centred page numbers only). Colour appears only inside the real screenshots.

## Build
```
pip install markdown-it-py playwright pymupdf numpy pillow
playwright install chromium
python scripts/build.py
```
The script fails (exit 2) if the PDF has more than 19 pages, and (exit 3) if any text, vector drawing or pixel outside the screenshot images is not gray.

## Contents of the report
Contents page (unnumbered entries with dot leaders and page numbers), then the plain unnumbered sections: Problem Introduction, Dataset, NLP Pipeline Step by Step, Python Code with Explanations and Screenshots (10 real Colab screenshots), Web Demo (3 real website screenshots), Results and Conclusion, Appendix: Complete Python Code (plain text). Sections and sub-sections have no chapter labels or numbers; figures and the table are numbered in sequence (Figure 1-14, Table 1).

## Where things come from
- `src/chapters/*.md`: the text (plain markdown). Tokens: `{{IMG:colab/colab-01.jpg|x0,y0,x1,y1|width|figure no.|caption}}` inserts a real screenshot cropped only to remove blank space; `{{SITE:x}}` the website screenshots; `{{DIAGRAM:x}}`; `{{APPENDIX:x}}` prints all code cells of `../colab/askmargin_colab.ipynb` as plain text.
- `screens/colab/colab-01..10.jpg`: real Google Colab captures. `screens/*.png`: website captures (02-answer, 04-refusal, 06-semantic-map; a missing file becomes a labelled placeholder).
- `src/report.css`, `src/diagram.svg` (converted to gray when building).
- Numbers in the text come from the Colab screenshots (716 chunks, 61 pages, TF-IDF 0.9, embeddings 0.9, threshold 0.25, demo answers).

## Unused leftovers from earlier versions (safe to delete)
`data/` (old big-notebook outputs), `scripts/shots.py` (VS Code image generator), `dist/shots/`, `dist/report.html`. The build no longer uses them.
