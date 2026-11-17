# Chapter 5 | Screenshots of Execution and Output

This chapter shows the real output of every cell of the executed notebook (it was run top to bottom on a CPU with no errors, and the outputs below are copied from it, not retyped). Each panel is titled with the step it belongs to and shows the notebook cell it came from.

## 5.1 Data loading, cleaning and preprocessing

{{OUT:7|Step 2: pages and words per paper after extraction and cleaning}}

{{OUT:9|Step 3: tokenisation, stop-word removal and lemmatisation}}

{{OUT:11|Step 4: chunk statistics for the two strategies}}

## 5.2 Vectors, vector store and retrieval

{{OUT:15|Step 6: building TF-IDF, BM25 and dense indexes}}

{{OUT:17|Step 7: FAISS and NumPy return identical results}}

{{OUT:19|Step 8: retrieval metrics for 4 methods x 2 chunkings, and the Recall@3 chart}}

{{OUT:21|Ablation: chunk size, and the recall curves}}

## 5.3 Refusal, generation and answer evaluation

{{OUT:23|Step 9: refusal threshold and score histogram}}

{{OUT:25|Step 10: three demo questions through the full pipeline}}

{{OUT:27|Step 11: evaluation of the generated answers (first 12 rows shown)}}

{{OUT:29|Step 12: error analysis printout}}

{{OUT:31|Step 13: export for the web demo}}

## 5.4 Web demo

The same retrieval idea runs in the browser at **askmargin.vercel.app**. The site loads the four sample papers from the files exported in Step 13 (717 chunks as JSON and their embeddings as 16-bit numbers), embeds the user's question with the same `all-MiniLM-L6-v2` model (in a Web Worker), ranks the chunks by cosine similarity and applies the same 0.24 refusal threshold. A user can also drop in their own PDF, which is processed on their device. One difference from the notebook: the website answers in an **extractive** way, returning the best-matching sentences with their page numbers and cosine scores, and does not run FLAN-T5; the generated answers of this report come from the notebook only. The "under the hood" panel shows each stage (index, query vector, cosine search, answer).

{{SITE:x}}
