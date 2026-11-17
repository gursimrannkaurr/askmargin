# Askmargin NLP project report (hard copy)

Output: `dist/Askmargin_NLP_Project_Report.pdf` (19 pages, A4). Page 1 is a full-page Contents page (page numbers computed from the built PDF by a two-pass build); there is no cover or declaration page.

## Build
```
pip install markdown-it-py pygments playwright pymupdf
playwright install chromium
python scripts/build.py
```
The script fails (exit code 2) if the result exceeds 19 pages.

## Where things come from
- `data/executed.ipynb` and `data/figures/`: copies of the executed notebook and its figures/CSVs. All code blocks (Ch. 4) and output panels (Ch. 5) are rendered from it, so they always match the notebook. If you re-run the notebook, copy the new files here and rebuild. Numbers typed in `src/chapters/*.md` (Ch. 2, 3, 6) must be updated by hand if the results change.
- `src/chapters/*.md`: report text. Tokens like `{{CODE:15|title}}`, `{{OUT:19|title}}`, `{{SITE:x}}` insert notebook code, outputs and website screenshots.
- `src/report.css`, `src/diagram.svg`: styling and the pipeline diagram.
- `screens/`: website screenshots. The report uses `01-home-brief`, `06-semantic-map`, `02-answer`, `04-refusal` (list in `scripts/build.py`, `EXPECTED_SHOTS`); a missing file is replaced by a labelled placeholder.
- Page-number footers are stamped by PyMuPDF after rendering (not on the contents page).
