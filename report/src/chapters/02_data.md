# Chapter 2 | Dataset

## 2.1 The documents

The documents are four public research papers downloaded from arXiv, so anyone can repeat the experiment. All four are about NLP, which lets us write test questions with answers we can check in the paper.

- **attention**: *Attention Is All You Need* (arXiv 1706.03762)
- **bert**: *BERT* (arXiv 1810.04805)
- **rag**: *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks* (arXiv 2005.11401)
- **sbert**: *Sentence-BERT* (arXiv 1908.10084)

Together they have **61 pages**. After cleaning, the pages are cut into **716 chunks** (small pieces of about 500 characters).

## 2.2 The test questions

To compare the two search methods we wrote **10 test questions** whose answers appear in the papers (for example, "How many parallel attention heads does the Transformer use?", answer "h = 8"). A search is counted as correct if one of its top 3 chunks contains the answer text. The ten questions are printed in the code of Step 7 in Chapter 4.
