# Askmargin

A RAG (Retrieval-Augmented Generation) document Q&A assistant: ask a question about PDFs and get an answer with a page citation.

- **Live site:** https://askmargin.vercel.app (retrieval runs in the browser; nothing is uploaded; answers are extractive)
- **Notebook (reference implementation):** `notebook/askmargin_rag.ipynb`. Python: PyMuPDF, NLTK, TF-IDF, BM25, MiniLM embeddings, FAISS, FLAN-T5. Runs on Colab or locally with `notebook/requirements.txt`.
- **Report and explainer:** `report/dist/` (build instructions in `report/README.md`)
- **Web app:** `web/` (Next.js)

## Results (30 hand-written questions over 4 arXiv papers)
Best retriever: hybrid BM25 + dense (RRF) on sentence-aware chunks, Recall@3 = 0.80, MRR = 0.665. End-to-end: 17/25 answers correct, 13/25 citations correct; 5/5 out-of-document questions refused (threshold 0.24). Details and limitations are in the report.
