# Chapter 3 | Pipeline: Step by Step

## 3.1 Overview

The pipeline has two halves. In the **indexing half** (run once per document set) the PDFs are read, cleaned, cut into chunks and turned into vectors that are stored. In the **question-answering half** (run for every question) the question is turned into a vector with the same model, the closest chunks are retrieved, a refusal check decides whether the document can answer at all, and finally a language model writes a short answer from the retrieved text. An offline evaluation step measures how good each choice is.

{{DIAGRAM:x}}
{{CAP:fcap|<b>Figure 3.1:</b> The Askmargin pipeline. Steps 1-5 build the index; steps 6-10 run per question; step 11 measures quality.}}

## 3.2 Text extraction and cleaning

PDFs do not store paragraphs; they store characters at positions on a page. **PyMuPDF** (`fitz`) reads the characters of each page and returns them as a string. We process one page at a time and keep the page number, because it becomes the citation later. The raw text has typical problems, which `clean()` fixes: (a) ligatures such as the single character "ﬁ" are converted to "fi" with Unicode **NFKC normalisation**; (b) words split by a hyphen at the end of a line ("repre-\nsentation") are re-joined with a regular expression; (c) line breaks and repeated spaces become single spaces. Pages with fewer than 80 characters (blank or figure-only pages) are skipped.

## 3.3 Tokenisation, stop-words and lemmatisation

TF-IDF and BM25 compare **words**, so the text must first be turned into a clean list of word tokens. This is the classical NLP pre-processing chain taught in class:

1. **Lower-casing** so "Model" and "model" are the same word.
2. **Tokenisation** with the regular expression `[a-z0-9]+`, which splits on spaces and punctuation and keeps numbers (numbers matter here: "8 heads", "15%").
3. **Stop-word removal** using the NLTK English list, dropping very common words ("the", "of", "is") that carry little meaning.
4. **Lemmatisation** with the WordNet lemmatiser, which maps a word to its dictionary form ("layers" becomes "layer"). We use lemmatisation instead of stemming because it always returns real words.

*Worked example (real notebook output).* The sentence "The encoder is composed of a stack of N = 6 identical layers." becomes the tokens `['encoder', 'composed', 'stack', 'identical', 'layer']`: "the", "is", "of", "a" are stop-words, and the one-character tokens "n" and "6" are dropped because the tokeniser keeps only tokens longer than one character (so single-digit numbers are lost in the lexical baselines, a small weakness of this pre-processing).

The dense embedding model does **not** use this chain: a transformer reads the raw sentence, including stop-words, because words like "not" change meaning.

## 3.4 Chunking

An embedding model and a generator can only read a limited amount of text, and a full page mixes many topics, so each page is cut into **chunks**. Two strategies are compared:

* **Fixed-size chunking.** A window of 500 characters slides over the page text in steps of 400 (overlap of 100 characters). It is simple but may cut a sentence in the middle.
* **Sentence-aware chunking.** The page is split into sentences with NLTK's Punkt tokenizer. Whole sentences are packed into a chunk until adding another would exceed 500 characters; the last sentence is then repeated at the start of the next chunk (one-sentence overlap), so the context is not lost at the boundary.

*Why overlap?* If an answer sentence sits exactly on a cut, a chunk without overlap would hold only half of it and neither half would match the question well; repeating 100 characters (or one sentence) gives the boundary text a second chance to be retrieved. Chunks never cross a page boundary, so every chunk has exactly one page number. A later ablation tests chunk sizes of 250, 500, 800 and 1200 characters.

## 3.5 Turning text into vectors

A computer cannot compare sentences directly; it compares numbers. Three representations are used.

**TF-IDF.** Each chunk becomes a long vector with one position per vocabulary word. The value is the product of how often the word appears in the chunk (term frequency) and how rare it is in all chunks (inverse document frequency):

<div class="formula"><i>w</i><sub><i>t,d</i></sub> = <i>tf</i><sub><i>t,d</i></sub> &times; <i>idf</i><sub><i>t</i></sub>,&nbsp;&nbsp; <i>idf</i><sub><i>t</i></sub> = ln <span class="frac"><span>1 + <i>N</i></span><span>1 + <i>df</i><sub><i>t</i></sub></span></span> + 1</div>

where *N* is the number of chunks and *df<sub>t</sub>* is the number of chunks containing term *t* (the smoothed formula used by scikit-learn). A word that appears in every chunk gets a small weight; a rare, specific word such as "FAISS" gets a large one.

**BM25.** BM25 is the formula used by classic search engines. It improves TF-IDF with *saturation* (the tenth occurrence of a word adds less than the second) and *length normalisation* (a long chunk should not win just because it has more words):

<div class="formula"><i>score</i>(<i>q</i>,<i>d</i>) = &sum;<sub><i>t</i> &isin; <i>q</i></sub> <i>idf</i><sub><i>t</i></sub> &middot; <span class="frac"><span><i>tf</i><sub><i>t,d</i></sub> (<i>k</i><sub>1</sub> + 1)</span><span><i>tf</i><sub><i>t,d</i></sub> + <i>k</i><sub>1</sub> (1 &minus; <i>b</i> + <i>b</i> &middot; |<i>d</i>| / <i>avgdl</i>)</span></span></div>

with the usual defaults *k*<sub>1</sub> and *b* of the `rank-bm25` library.

**Dense embeddings.** The model `all-MiniLM-L6-v2` (a Sentence-BERT model) turns any text into a vector of **384 numbers** so that texts with similar *meaning* get nearby vectors, even if they share no words. This lets "How many layers..." match "a stack of N = 6 identical layers". The embeddings are normalised to length 1.

## 3.6 Vector store and cosine similarity

Retrieval means finding the chunk vectors closest to the question vector. We use the **cosine similarity**, the cosine of the angle between two vectors:

<div class="formula"><i>cos</i>(<b>q</b>, <b>d</b>) = <span class="frac"><span><b>q</b> &middot; <b>d</b></span><span>&Vert;<b>q</b>&Vert; &Vert;<b>d</b>&Vert;</span></span> = <span class="frac"><span>&sum;<sub><i>i</i></sub> <i>q</i><sub><i>i</i></sub> <i>d</i><sub><i>i</i></sub></span><span>&radic;(&sum;<i>q</i><sub><i>i</i></sub><sup>2</sup>) &radic;(&sum;<i>d</i><sub><i>i</i></sub><sup>2</sup>)</span></span></div>

Because our vectors have length 1, the denominator is 1 and cosine similarity is just a dot product, so searching the whole store is one matrix-vector multiplication (`E @ v`). The "vector store" is therefore a NumPy matrix with one row per chunk. We also build a **FAISS** `IndexFlatIP` (inner-product index), which does the same exact search in optimised C++ and is the structure that real systems scale up from; the notebook asserts that FAISS and NumPy return the same top results. *Worked example:* for the question "How many parallel attention heads does the Transformer use?" both return chunks 21, 46 and 22 with cosine scores 0.697, 0.696 and 0.637. A score near 1 means the same meaning and a score near 0 means unrelated text; this is also why a single cut-off on the best score can separate answerable from unanswerable questions (Section 3.8).

## 3.7 Retrieval methods compared

Four retrievers are compared on the same chunks: **TF-IDF** (cosine between sparse vectors), **BM25**, **Dense (MiniLM)**, and a **Hybrid** that merges the BM25 ranking and the dense ranking with **Reciprocal Rank Fusion** (RRF). In RRF each chunk receives, from every ranking it appears in, a score of

<div class="formula"><i>RRF</i>(<i>d</i>) = &sum;<sub><i>r</i></sub> <span class="frac"><span>1</span><span><i>k</i> + <i>rank</i><sub><i>r</i></sub>(<i>d</i>)</span></span>, &nbsp; <i>k</i> = 60</div>

and chunks are sorted by the total. A chunk that is high in both lists wins, which combines exact word matching with meaning matching.

## 3.8 Refusal threshold

Retrieval always returns *something*, even for the question "What is the capital of France?" over four NLP papers. To avoid answering from irrelevant text, the system looks at the **best cosine score**. If it is below a threshold *T*, the system refuses with "I could not find this in the documents" and never calls the generator. *T* is chosen by scanning candidate values from 0.10 to 0.70 and keeping the one that best separates the answerable questions (high best-score) from the out-of-document ones (low best-score); the accept/refuse accuracy is reported in Chapter 5.

## 3.9 Generation with FLAN-T5

If the question passes the gate, the top 3 chunks are placed into a **prompt template** that tells the model to answer briefly, use only the context, and reply "I don't know." otherwise. The generator is **FLAN-T5-base** (about 250 million parameters), an instruction-tuned encoder-decoder model with open weights that runs on a CPU. Decoding uses beam search with 4 beams and at most 64 new tokens. Importantly, the **citation is not produced by the model**: the page numbers of the two best chunks are copied from the chunk metadata, so a citation can never be invented.

## 3.10 Evaluation metrics

A retrieved chunk counts as a **hit** for a question if it comes from the right paper and contains the stored answer string (compared after removing punctuation and case). With *Q* answerable questions:

<div class="formula"><i>Recall@k</i> = <span class="frac"><span>1</span><span>|<i>Q</i>|</span></span> &sum;<sub><i>q</i> &isin; <i>Q</i></sub> &#x1D7D9;[ <i>rank</i><sub><i>q</i></sub> &le; <i>k</i> ],&nbsp;&nbsp;&nbsp; <i>MRR</i> = <span class="frac"><span>1</span><span>|<i>Q</i>|</span></span> &sum;<sub><i>q</i> &isin; <i>Q</i></sub> <span class="frac"><span>1</span><span><i>rank</i><sub><i>q</i></sub></span></span></div>

where *rank<sub>q</sub>* is the position of the first hit for question *q* (the reciprocal rank is 0 if no hit is found in the top 5). Recall@k answers "is the evidence in the top k?", MRR rewards putting it first. For the full answers four more checks are used: **answer correct** (the expected key phrase appears in the generated text), **citation correct** (a cited page really contains the answer string), **faithfulness** (share of answer words that also appear in the retrieved context; low means made-up content) and **correct refusal** (out-of-document questions are refused).
