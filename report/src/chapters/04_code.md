# Chapter 4 | Python Code with Explanations

The complete notebook <code>askmargin_rag.ipynb</code> is reproduced below cell by cell with the code exactly as it was run. Each cell is preceded by a short explanation of what it does. The cell label (In [n]) is the execution counter of the notebook, so every block can be matched with its output in Chapter 5. Explanatory text cells of the notebook are summarised in the paragraphs.

<div class="expl"><b>Optional install cell.</b> On Google Colab, remove the <code>#</code> signs and run this line once to install the libraries (PyMuPDF, Sentence-Transformers, FAISS, rank-bm25, NLTK, Transformers).</div>

{{CODE:1|Optional install cell}}

<div class="expl"><b>Step 0: setup and configuration.</b> Imports every library, downloads the four NLTK resources (sentence tokenizer, stop-word list, WordNet), fixes the random seed to 42 so runs are repeatable, and creates the <code>data</code> and <code>figures</code> folders.</div>

{{CODE:3|Step 0: setup and configuration}}

<div class="expl"><b>Step 1: dataset.</b> A dictionary maps a short key to a paper title and its arXiv PDF address. The loop downloads each PDF once (skipped if it already exists) and prints its size. These four open-access papers are the document collection.</div>

{{CODE:5|Step 1: dataset}}

<div class="expl"><b>Step 2: ingest and clean.</b> <code>clean()</code> applies NFKC normalisation, re-joins hyphenated line breaks and collapses whitespace. <code>load_pdf()</code> opens a PDF, reads each page, cleans it and stores a record with the document key, the page number and the text. All pages go into a pandas DataFrame, and a per-paper summary (pages and words) is displayed.</div>

{{CODE:7|Step 2: ingest and clean}}

<div class="expl"><b>Step 3: tokenise, remove stop-words, lemmatise.</b> <code>tokenize()</code> lower-cases the text, extracts alphanumeric tokens with a regular expression, removes NLTK stop-words and one-letter tokens, and lemmatises the rest. The demo sentence shows the effect. This function feeds TF-IDF and BM25 only.</div>

{{CODE:9|Step 3: tokenise, remove stop-words, lemmatise}}

<div class="expl"><b>Step 4: chunking.</b> <code>chunk_fixed()</code> slides a 500-character window with 100 characters of overlap. <code>chunk_sentence()</code> splits a page into sentences, packs them up to 500 characters, and starts the next chunk with the last sentence of the previous one. Both keep the page number. The cell builds both versions, prints size statistics, and shows an example chunk.</div>

{{CODE:11|Step 4: chunking}}

<div class="expl"><b>Step 5: evaluation set and metric functions.</b> Loads the 30 questions from JSON and splits them into answerable and out-of-document groups. <code>key()</code> normalises text for matching. <code>is_hit()</code> defines a correct chunk. <code>evaluate()</code> takes any ranking function and returns Recall@1, 3, 5 and MRR. The last loop reports how many questions are answerable at all with each chunking (an upper bound on any retriever).</div>

{{CODE:13|Step 5: evaluation set and metric functions}}

<div class="expl"><b>Step 6: three vector representations in one class.</b> The <code>Index</code> class builds, for one list of chunks: a TF-IDF matrix (fed with our own tokens), a BM25 index and the dense MiniLM embedding matrix (unit length, 384 columns). It offers four ranking methods: <code>rank_tfidf</code>, <code>rank_bm25</code>, <code>rank_dense</code> and <code>rank_hybrid</code> (Reciprocal Rank Fusion). One index is built for each chunking strategy and the sizes are printed.</div>

{{CODE:15|Step 6: three vector representations in one class}}

<div class="expl"><b>Step 7: NumPy vs FAISS.</b> Builds a FAISS inner-product index from the embedding matrix, runs the same question through FAISS and through NumPy, asserts that the top-3 ids agree, and prints the three retrieved chunks with their cosine scores and page numbers.</div>

{{CODE:17|Step 7: NumPy vs FAISS}}

<div class="expl"><b>Step 8: retrieval evaluation.</b> Evaluates all four methods on both chunkings (8 rows), saves the table to CSV and draws the Recall@3 bar chart.</div>

{{CODE:19|Step 8: retrieval evaluation}}

<div class="expl"><b>Ablation: chunk size.</b> Repeats dense retrieval with sentence-aware chunks of target size 250, 500, 800 and 1200 characters and plots Recall@1 and Recall@3 against size.</div>

{{CODE:21|Ablation: chunk size}}

<div class="expl"><b>Step 9: choosing the refusal threshold.</b> Computes the best cosine score for every question, then scans thresholds from 0.10 to 0.70 and keeps the value with the highest accept/refuse accuracy. Draws a histogram of the two groups with the threshold line.</div>

{{CODE:23|Step 9: choosing the refusal threshold}}

<div class="expl"><b>Step 10: generation with FLAN-T5.</b> Loads FLAN-T5-base, defines the prompt template and the function <code>ask()</code>: score all chunks, take the top 3, refuse if the best score is below the threshold, otherwise build the prompt, generate with beam search and attach the citations from the chunk metadata. Three demo questions follow, one of them out of scope.</div>

{{CODE:25|Step 10: generation with FLAN-T5}}

<div class="expl"><b>Step 11: evaluating full answers.</b> Runs <code>ask()</code> on all 25 answerable questions and records whether the answer contains the expected phrase, whether a cited page really contains the answer, the faithfulness score and whether the system wrongly refused. Then it counts correct refusals on the 5 out-of-document questions and saves a CSV.</div>

{{CODE:27|Step 11: evaluating full answers}}

<div class="expl"><b>Step 12: error analysis.</b> Prints, for each wrongly answered question, the expected answer, the model's answer and whether the evidence was in the top-2 chunks. This separates retrieval errors from generation errors.</div>

{{CODE:29|Step 12: error analysis}}

<div class="expl"><b>Step 13: export for the web demo.</b> Saves the sentence-aware chunks as JSON and their embeddings as 16-bit floats so the website can load the sample papers without recomputing anything.</div>

{{CODE:31|Step 13: export for the web demo}}

