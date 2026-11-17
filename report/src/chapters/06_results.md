# Chapter 6 | Results, Analysis and Conclusion

## 6.1 Retrieval results

{{CAP:tcap|<b>Table 6.1</b> Retrieval quality on the 25 answerable questions (from retrieval_results.csv). Best value per column in bold.}}

| Chunking | Method | Recall@1 | Recall@3 | Recall@5 | MRR |
|---|---|---|---|---|---|
| fixed-500/100 | TF-IDF | 0.48 | 0.72 | 0.76 | 0.595 |
| fixed-500/100 | BM25 | 0.44 | **0.80** | 0.84 | 0.615 |
| fixed-500/100 | Dense (MiniLM) | 0.36 | 0.60 | 0.68 | 0.465 |
| fixed-500/100 | Hybrid (BM25 + Dense, RRF) | 0.44 | 0.72 | 0.80 | 0.591 |
| sentence-500 | TF-IDF | 0.44 | 0.60 | 0.64 | 0.523 |
| sentence-500 | BM25 | 0.44 | 0.68 | 0.84 | 0.589 |
| sentence-500 | Dense (MiniLM) | 0.36 | 0.60 | 0.80 | 0.511 |
| sentence-500 | Hybrid (BM25 + Dense, RRF) | **0.52** | **0.80** | **0.88** | **0.665** |

The best single configuration is the **hybrid retriever on sentence-aware chunks**: Recall@1 0.52, Recall@3 0.80, Recall@5 0.88 and MRR 0.665. Three honest observations follow. (1) **Sentence-aware chunking is not clearly better than fixed windows.** BM25 on fixed chunks reaches Recall@3 of 0.80 while BM25 on sentence chunks reaches 0.68, and TF-IDF is also higher on fixed chunks; sentence chunks win only with the hybrid retriever and for Recall@5 with dense retrieval. With 25 questions one question equals 0.04, so most gaps between rows are within noise. (2) **Dense retrieval alone was not better than keyword search**: Recall@3 is 0.60 against 0.72 to 0.80 for TF-IDF or BM25 on fixed chunks. A likely reason is that the questions contain very specific tokens (numbers, names such as "FAISS" or "BLEU") that keyword methods match exactly. (3) The **hybrid** combines both signals and is the most robust choice on sentence chunks.

{{CAP:tcap|<b>Table 6.2</b> Chunk-size ablation: dense retrieval, sentence-aware chunking (from chunk_size_ablation.csv).}}

| Target size (chars) | Chunks | Recall@1 | Recall@3 | Recall@5 | MRR |
|---|---|---|---|---|---|
| 250 | 1417 | 0.52 | 0.68 | 0.80 | 0.621 |
| 500 | 717 | 0.36 | 0.60 | 0.80 | 0.511 |
| 800 | 373 | 0.40 | 0.64 | 0.80 | 0.538 |
| 1200 | 232 | 0.32 | 0.56 | 0.72 | 0.447 |

The largest chunks (1200 characters) are worst, plausibly because one vector must then summarise several topics. The smallest size (250 characters) is best for dense retrieval, but the trend is not monotonic (800 is above 500), which again points to the noise level of a 25-question test.

## 6.2 Refusal and full-answer results

The best cosine score of the 25 answerable questions has mean 0.618 (minimum 0.459); for the 5 out-of-document questions the mean is 0.195 (maximum 0.237). The two groups do not overlap, and the chosen threshold of **0.24** gives an accept/refuse accuracy of **100%**: all 5 out-of-document questions were refused and none of the 25 answerable ones was wrongly refused.

{{CAP:tcap|<b>Table 6.3</b> End-to-end results (generator: dense retrieval, top-3 chunks, sentence-500, FLAN-T5-base).}}

| Metric | Result |
|---|---|
| Answer correct (key phrase in generated answer) | 68.0% (17 of 25) |
| Citation correct (cited page among top-2 contains the answer string) | 52.0% (13 of 25) |
| Mean faithfulness (answer words found in the context) | 0.95 |
| Answerable questions wrongly refused | 0 of 25 |
| Out-of-document questions correctly refused | 5 of 5 |

## 6.3 Error analysis

Eight of the 25 questions were answered incorrectly (ids 1, 7, 8, 10, 12, 17, 22, 25). For **every one** of them the notebook reports that the evidence string was *not* in the top-2 retrieved chunks, so all eight errors begin in **retrieval**, not in the language model. The generator then did one of three things. It admitted ignorance (Q1, "I don't know", although the topic is the number of attention heads). Or it picked a plausible but wrong detail from the context (Q10 answered "340M", the size of the large BERT model, instead of 110M for the base model; Q22 answered "MAX-strategy" instead of MEAN; Q17 "RAG-Sequence Model" instead of BART). Or it answered only a part of the question (Q8 gave the hardware "8 NVIDIA P100 GPUs" but not "3.5 days"; Q25 gave a different speed-up figure). The faithfulness of 0.95 shows that the generator almost never used words that were absent from the context: its failures are "right text, wrong fact" caused by the wrong chunk reaching the prompt.

Citation accuracy (52%) is lower than answer accuracy (68%): four questions (11, 15, 19, 23) were answered correctly although the two cited chunks did not contain the stored answer string. The check is strict, so 52% is conservative, but the cited page is not always the page holding the evidence, which is why the website shows the retrieved passages next to the answer.

## 6.4 Limitations

* **Small test set.** Twenty-five answerable and five unanswerable questions; one question is 4 percentage points, so differences between close methods are not statistically reliable.
* **Threshold tuned on the test questions.** The value 0.24 was chosen with the same 30 questions it is evaluated on. The gap between the groups is wide (0.237 against 0.459), but the out-of-document questions are completely off-topic. Questions that are close to the document's topic yet unanswered by it are harder and were not tested.
* **Strict and lenient metrics.** A hit needs the exact answer string, so a correct passage with different wording counts as a miss; faithfulness is only word overlap and does not prove that an answer is true.
* **Small generator.** FLAN-T5-base (250 M parameters) can pick a wrong number from the context.
* **One corpus.** Four English NLP papers; tables, equations and two-column layouts can still hurt extraction.

## 6.5 Future work

Add a **cross-encoder re-ranker** that reorders the top 10 candidates before generation; replace FLAN-T5-base with a stronger model; extend the evaluation set with close-but-unanswerable questions and tune the threshold on a separate validation split; and add OCR for scanned PDFs.

## 6.6 Conclusion

Askmargin is a complete RAG pipeline written in Python: PDF extraction and cleaning, tokenisation, stop-word removal and lemmatisation, two chunking strategies, TF-IDF, BM25 and dense embeddings, a NumPy and FAISS vector store with cosine similarity, a hybrid retriever, a similarity-based refusal rule and answer generation with FLAN-T5. On 30 hand-written questions over four public papers the best retriever (hybrid on sentence-aware chunks) put the answer chunk in the top 3 for 80% of the questions and in the top 5 for 88%. The full system answered 68% of the questions correctly, refused all 5 out-of-document questions without refusing any answerable one, and produced answers with 0.95 faithfulness to the retrieved text. The main lesson is that **retrieval quality decides answer quality**: finding the right chunk more reliably would improve the answers more than changing the generator.

## 6.7 References

<ol class="refs">
<li>Lewis, P. et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. arXiv:2005.11401.</li>
<li>Vaswani, A. et al. (2017). Attention Is All You Need. arXiv:1706.03762.</li>
<li>Devlin, J. et al. (2019). BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding. arXiv:1810.04805.</li>
<li>Reimers, N. and Gurevych, I. (2019). Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks. arXiv:1908.10084.</li>
<li>Chung, H. W. et al. (2022). Scaling Instruction-Finetuned Language Models (FLAN-T5). arXiv:2210.11416.</li>
<li>Robertson, S. and Zaragoza, H. (2009). The Probabilistic Relevance Framework: BM25 and Beyond. Foundations and Trends in Information Retrieval 3(4).</li>
<li>Cormack, G., Clarke, C. and Buettcher, S. (2009). Reciprocal Rank Fusion outperforms Condorcet and individual rank learning methods. SIGIR. Johnson, J., Douze, M. and Jegou, H. (2019). Billion-scale similarity search with GPUs (FAISS).</li>
<li>Pedregosa, F. et al. (2011). Scikit-learn: Machine Learning in Python. JMLR 12. Bird, S., Klein, E. and Loper, E. (2009). Natural Language Processing with Python (NLTK). PyMuPDF documentation, pymupdf.readthedocs.io.</li>
</ol>
