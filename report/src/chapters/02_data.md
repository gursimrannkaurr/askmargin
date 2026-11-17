# Chapter 2 | Dataset and Evaluation Set

## 2.1 The document collection

The task needs "private documents" that anyone can obtain, so that every result can be reproduced. We use **four open-access research papers from arXiv**, downloaded automatically by the notebook (Step 1). All four are about NLP, which allowed us to write questions whose answers can be checked by reading the paper.

{{CAP:tcap|<b>Table 2.1:</b> The corpus, as counted by the notebook after cleaning (pages with fewer than 80 characters are skipped).}}

| Key | Paper | arXiv id | Pages used | Words |
|---|---|---|---|---|
| attention | Attention Is All You Need (the Transformer) | 1706.03762 | 15 | 6,072 |
| bert | BERT: pre-training of deep bidirectional transformers | 1810.04805 | 16 | 9,828 |
| rag | Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks | 2005.11401 | 19 | 9,839 |
| sbert | Sentence-BERT | 1908.10084 | 11 | 6,440 |
| **Total** | | | **61** | **32,179** |


Choosing papers about the very topic of the project has a pleasant side effect: the corpus is a realistic example of "long technical documents with numbers, tables and equations", which is the hard case for retrieval. It also means a reader of this report can open the PDFs and verify any answer.

## 2.2 Chunks produced

After cleaning, the pages are cut into chunks (Section 3.4). The fixed-size strategy (500 characters, 100 overlap) produced **552 chunks** with an average length of 479.7 characters. The sentence-aware strategy (500 characters target) produced **717 chunks** with an average of 429.6 characters (minimum 54, maximum 820, because a single long sentence can exceed the target). Each chunk stores three things: the paper key, the page number and the text.

## 2.3 The 30-question evaluation set

The questions were written by hand (file `eval_questions.json`). There are **25 answerable** questions (8 about the Transformer, 7 about BERT, 5 about RAG, 5 about Sentence-BERT) and **5 out-of-document** questions that no paper answers. For each answerable question we store:

* the **paper** it belongs to,
* an **answer string** that appears literally in the paper (used to decide whether a retrieved chunk is a hit), and
* an **expected key phrase** (such as `8`, `15%` or `FAISS`) that must appear in the generated answer.

A chunk is a *hit* only if it is from the right paper and contains the answer string after both are lower-cased and stripped of punctuation. The notebook checks that with both chunking strategies the answer string is present in at least one chunk for **25 of 25** questions, so a perfect retriever could score 100% and no question is impossible because of chunking. The five out-of-document questions (capital of France, football world cup 2022, a cake recipe, the price of a Tesla Model 3, the prime minister of India) test the refusal rule.

{{CAP:tcap|<b>Table 2.2:</b> The complete evaluation set. "Expected" is the key phrase checked in the generated answer.}}

| Id | Paper | Question | Expected |
|---|---|---|---|
| 1 | attention | How many parallel attention heads does the Transformer use? | 8 |
| 2 | attention | How many identical layers are stacked in the encoder? | 6 |
| 3 | attention | Why did the authors prefer sinusoidal positional encodings over learned ones? | extrapolate |
| 4 | attention | What value of label smoothing was used during training? | 0.1 |
| 5 | attention | Which optimizer and which beta values were used to train the model? | Adam |
| 6 | attention | What BLEU score did the big model reach on English-to-German translation? | 28.4 |
| 7 | attention | What is the dimension of each attention head's keys and values? | 64 |
| 8 | attention | How long did training the big model take and on what hardware? | 3.5 days |
| 9 | bert | What size is the vocabulary used by BERT's tokenizer? | 30,000 |
| 10 | bert | How many parameters does the base version of BERT have? | 110M |
| 11 | bert | What fraction of tokens is hidden in the masked language model objective? | 15% |
| 12 | bert | What second pre-training task is used besides masked language modelling? | next sentence |
| 13 | bert | What special token is placed at the start of every input sequence? | [CLS] |
| 14 | bert | How many layers, hidden units and heads does the large model have? | 24 |
| 15 | bert | With what probability is a chosen token replaced by the mask symbol? | 80% |
| 16 | rag | How many passages does the Wikipedia retrieval index contain? | 21M |
| 17 | rag | Which pre-trained seq2seq model acts as the generator? | BART |
| 18 | rag | How large are the chunks that each Wikipedia article is split into? | 100-word |
| 19 | rag | What library is used to build the nearest-neighbour search index? | FAISS |
| 20 | rag | What do the authors call the document index acting as external memory? | non-parametric |
| 21 | sbert | How long does finding the most similar pair among 10,000 sentences take with plain BERT? | 65 hours |
| 22 | sbert | Which pooling strategy is the default for building sentence embeddings? | MEAN |
| 23 | sbert | What similarity function compares the sentence vectors? | cosine |
| 24 | sbert | How big is the SNLI collection used for fine-tuning? | 570,000 |
| 25 | sbert | How much faster than BERT is SBERT at finding the most similar pair? | 5 seconds |
| 26 | none | What is the capital city of France? | refuse |
| 27 | none | Who won the football world cup in 2022? | refuse |
| 28 | none | How do I bake a chocolate cake? | refuse |
| 29 | none | What is the price of a Tesla Model 3? | refuse |
| 30 | none | Who is the prime minister of India? | refuse |
