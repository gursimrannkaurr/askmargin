# Askmargin NLP project report (hard copy)

Output: `dist/Askmargin_NLP_Project_Report.pdf` (8 pages, A4). Short, plain black-and-white report (Times, centred page numbers). Colour appears only inside the real screenshots.

## Build
```
pip install markdown-it-py playwright pymupdf numpy pillow
playwright install chromium
python scripts/build.py
```
The script fails (exit 2) if the PDF has more than 10 pages, and (exit 3) if any text, vector drawing or pixel outside the screenshot images is not gray.

## Structure
Compact contents (page 1), 1 Introduction, 2 Tools and Libraries Used, 3 Methodology (7 steps + diagram), 4 Implementation (10 real Colab screenshots), 5 Results and Analysis (small table, bullets, one website screenshot), 6 Conclusion and References.

## Where things come from
- `src/chapters/*.md`: the text. `07_appendix.md` is intentionally empty (full code appendix dropped). Token `{{IMG:colab/colab-01.jpg|x0,y0,x1,y1|width|figure no.|caption}}` inserts a real screenshot, cropped only to remove blank space; `{{DIAGRAM:x}}` the pipeline diagram.
- `screens/colab/colab-01..10.jpg`: real Google Colab captures; `screens/02-answer.png`: website capture.
- `src/report.css`, `src/diagram.svg` (converted to gray when building).
- Numbers come from the Colab screenshots (716 chunks, 61 pages, TF-IDF 0.9, embeddings 0.9, threshold 0.25, demo answers).

## Unused leftovers (safe to delete)
`data/`, `scripts/shots.py`, `dist/shots/`, `dist/report.html`, and `build.py` no longer uses the website gallery/appendix helpers' inputs.
