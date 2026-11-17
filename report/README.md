# Askmargin NLP project report (hard copy)

Output: `dist/Askmargin_NLP_Project_Report.pdf` (19 pages, A4).

## Fill in your details once
Edit `config.json` (name, enrolment no., course, section, semester, faculty, institute, year, date). Anything still in `[brackets]` is highlighted yellow on the cover and declaration.

## Build
```
pip install markdown-it-py pygments playwright pymupdf
playwright install chromium
python scripts/build.py
```
The script fails if the result exceeds 19 pages.

## Where things come from
- `data/executed.ipynb` and `data/figures/`: copies of the executed notebook and its figures/CSVs. All code blocks (Ch. 4) and output panels (Ch. 5) are rendered from it, so they always match the notebook. If you re-run the notebook, copy the new files here and rebuild. Tables and numbers in Ch. 2, 3 and 6 are written in `src/chapters/*.md` and must be updated by hand if the results change.
- `src/chapters/*.md`: report text. Tokens like `{{CODE:15|title}}`, `{{OUT:19|title}}`, `{{SITE:x}}` insert notebook code, outputs and website screenshots.
- `src/report.css`, `src/diagram.svg`: styling and the pipeline diagram.
- `screens/`: website screenshots. The report uses `02-answer.png` and `04-refusal.png`; if missing, clearly labelled placeholders are printed instead.
- Page numbers and the footer are stamped by PyMuPDF after rendering (cover has none).
