# Askmargin NLP project report (hard copy)

Output: `dist/Askmargin_NLP_Project_Report.pdf` (9 pages, A4): a full-page contents page, then a short plain report (unnumbered headings, left-aligned, Times, centred page digit). Colour appears only inside the real screenshots.

## Build
```
pip install markdown-it-py playwright pymupdf numpy pillow
playwright install chromium
python scripts/build.py
```
Fails (exit 2) above 19 pages, and (exit 3) if any text, drawing or pixel outside the screenshots is not gray.

## Files
- `src/chapters/body.md`: all the text. Token `{{IMG:path|x0,y0,x1,y1|width|n|caption}}` inserts a real screenshot (crop only removes browser chrome); `{{CAP:class|text}}` a small caption.
- `src/report.css`: styling. The contents page is generated from the h2/h3 headings by `build.py`.
- `screens/colab/colab-01..10.jpg`: Colab captures; `screens/02-answer.png`, `screens/04-refusal.png`: website captures.
- Numbers come from the Colab screenshots (61 pages, 716 chunks, TF-IDF 0.9, embeddings 0.9, threshold 0.25).
