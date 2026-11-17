# Chapter 5 | Screenshots of Execution and Output

This chapter shows the real outputs of the executed notebook (run top to bottom on a CPU with no errors), captured as VS Code notebook output cells, followed by screenshots of the live web demo. Nothing below is retyped: the text and tables are copied from the notebook run and the charts are the notebook's own figures.

## 5.1 Data loading, cleaning and preprocessing

{{OUTS:7,9,11|Outputs of Steps 2, 3 and 4: pages and words per paper, tokenisation example, chunk statistics for the two strategies.}}

## 5.2 Vectors, vector store and retrieval

{{OUTS:15,17:7|Outputs of Steps 6 and 7: index sizes (device cpu, 384-dimensional embeddings) and identical FAISS and NumPy search results with the retrieved chunks.}}

{{OUTS:19|Output of Step 8: retrieval metrics for four methods on two chunkings, and the Recall@3 chart.}}

## 5.3 Refusal, generation and answer evaluation

{{OUTS:21,23|Outputs of the chunk-size ablation (table and Recall curves) and of Step 9 (refusal threshold and score histogram).}}

{{OUTS:25,27|Outputs of Steps 10 and 11: three demo questions and the evaluation of the generated answers (first 12 rows).}}

{{OUTS:29:14,31|Outputs of Steps 12 and 13: error analysis (first failures shown) and the export for the web demo.}}

## 5.4 Web demo

The same retrieval idea runs in the browser at **askmargin.vercel.app**. The site loads the four sample papers from the files exported in Step 13 (717 chunks and their embeddings), embeds the user's question with the same `all-MiniLM-L6-v2` model in a Web Worker, ranks chunks by cosine similarity and applies the same 0.24 refusal threshold; users can also drop in their own PDF, which stays on their device. Unlike the notebook, the website answers **extractively** (it returns the best-matching sentences with page numbers and scores and does not run FLAN-T5). The screenshots below are unedited captures of the site.

{{SITE:x}}
