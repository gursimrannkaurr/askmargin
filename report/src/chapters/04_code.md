# Chapter 4 | Python Code with Explanations

The complete notebook `askmargin_rag.ipynb` is shown below as VS Code screenshots, cell by cell, exactly as it was run. The label [n] is the execution counter of the notebook, so each cell can be matched with its output in Chapter 5.

## 4.1 Setup, data and cleaning

Optional install cell for Google Colab (remove the # signs and run once). **Step 0, setup.** Imports the libraries, downloads the NLTK resources (sentence tokenizer, stop-words, WordNet), fixes the random seed to 42 and creates the data and figures folders.

{{SHOT:1,3}}

**Step 1, dataset.** A dictionary maps each key to a paper title and arXiv address; the loop downloads every PDF once and prints its size.

{{SHOT:5}}

**Step 2, ingest and clean.** `clean()` applies NFKC normalisation, re-joins hyphenated line breaks and collapses whitespace; `load_pdf()` stores the document key, page number and text of every page (the page number later becomes the citation).

{{SHOT:7}}

## 4.2 Tokens and chunks

**Step 3, preprocessing.** `tokenize()` lower-cases, extracts alphanumeric tokens with a regular expression, removes stop-words and one-letter tokens and lemmatises; it feeds TF-IDF and BM25 only.

{{SHOT:9}}

**Step 4, chunking.** `chunk_fixed()` slides a 500-character window with 100 characters overlap; `chunk_sentence()` packs whole sentences up to 500 characters and repeats the last sentence at the start of the next chunk. Both keep the page number.

{{SHOT:11@0-23}}



{{SHOT:11@23-30}}

## 4.3 Evaluation set and vector representations

**Step 5, evaluation set.** Loads the 30 questions; `is_hit()` defines a correct chunk and `evaluate()` returns Recall@1, 3, 5 and MRR for any ranking function, so every retriever is compared fairly.

{{SHOT:13@0-22}}

**Step 6, vectors.** The `Index` class builds a TF-IDF matrix, a BM25 index and the 384-dimensional MiniLM embeddings, and offers four rankers: TF-IDF, BM25, dense and a hybrid using Reciprocal Rank Fusion.

{{SHOT:13@22-26,15@0-9}}



{{SHOT:15@9-25}}



{{SHOT:15@25-46}}

**Step 7, vector store.** Builds a FAISS inner-product index, asserts that its top-3 equals the NumPy cosine top-3 and prints the retrieved chunks with page numbers.

{{SHOT:17}}

## 4.4 Retrieval evaluation and ablation

**Step 8, retrieval evaluation.** Evaluates all four methods on both chunkings, saves a CSV and draws the Recall@3 chart. **Ablation.** Repeats dense retrieval with chunk sizes 250, 500, 800 and 1200 characters.

{{SHOT:19}}



{{SHOT:21}}

## 4.5 Refusal, generation and answer evaluation

**Step 9, refusal threshold.** Computes the best cosine of every question and scans thresholds from 0.10 to 0.70 for the best accept/refuse accuracy.

{{SHOT:23}}

**Step 10, generation.** Loads FLAN-T5-base and defines the prompt and `ask()`: retrieve the top 3 chunks, refuse below the threshold, otherwise generate with beam search and attach the citations from chunk metadata.

{{SHOT:25@0-14}}



{{SHOT:25@14-33}}

**Step 11, answer evaluation.** Runs `ask()` on the 25 answerable questions and records correctness, citation, faithfulness and wrong refusals, then counts refusals on the 5 out-of-document questions. **Step 12, error analysis.** Prints expected answer, generated answer and evidence status for each wrong answer.

{{SHOT:27}}

**Step 13, export.** Saves the chunks (JSON) and embeddings (16-bit floats) for the website.

{{SHOT:29,31}}

