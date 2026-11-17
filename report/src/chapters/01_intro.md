# Chapter 1 | Problem Introduction

## 1.1 The problem in one paragraph

Large language models (LLMs) such as ChatGPT can write fluent answers to almost any question, but they have two weaknesses that matter a lot in real work. First, they only know what was in their training data, so they know nothing about *your* documents: a company policy, a lecture PDF, a signed contract, a patient report. Second, when they do not know something they often **hallucinate**, which means they produce a confident, well-written answer that is simply false. A model that sounds sure but is wrong is worse than no model at all, because the reader has no way to notice the mistake.

**Askmargin** is the NLP application built in this project to address both weaknesses. The user gives it a set of PDF documents and asks a question in plain English. Askmargin finds the passages of the documents that are most relevant to the question, writes a short answer using *only* those passages, and shows the **page number** where the evidence was found. If the documents do not contain the answer, it says so instead of guessing. The name comes from the habit of writing a note in the margin of a page: every answer points back to a page.

The technique used is called **Retrieval-Augmented Generation (RAG)**. Instead of asking the model to answer from memory, we first *retrieve* relevant text from a document collection and then let the model *generate* an answer from that text. RAG is currently the most common way in which companies connect an LLM to private data.

## 1.2 Why plain LLMs hallucinate

A language model is trained to predict the next word. It learns patterns of language and a large amount of world knowledge, but this knowledge is stored loosely inside its weights and is not looked up the way a database record is. Three things follow from this:

* **Knowledge is frozen.** Anything that happened after the training date, or anything that was never public (internal reports, personal files), is unknown to the model.
* **There is no built-in "I do not know".** The model always produces the most likely next words, so for an unknown fact it produces a plausible-sounding guess.
* **There is no source.** The answer cannot be checked because the model cannot say where it learnt a fact.

RAG attacks all three: the knowledge lives in a document store that can be updated at any time, the model is told to use only the supplied text, and each supplied chunk carries its page number, which becomes the citation.

## 1.3 Real-world applications

The same pipeline (split documents, search them by meaning, answer from the best passages, cite the source) is used in many industries:

| Domain | Typical question | Why RAG fits |
|---|---|---|
| Enterprise search | "What is our laptop replacement policy for new joiners?" | Thousands of wikis, PDFs and slide decks that keyword search handles poorly; answers must follow the current version of a policy. |
| Customer support | "How do I reset the router to factory settings?" | Answers must come from the manual of the exact product, and a wrong instruction costs money. |
| Legal | "What is the notice period in clause 14 of this agreement?" | Lawyers need the exact clause and page, not a summary from memory. |
| Medical | "What dose adjustment does this guideline recommend for kidney patients?" | Guidelines change; the answer must cite the approved document and refuse when it is not covered. |
| Education | "Explain the difference between BERT and Sentence-BERT from my notes." | A study assistant that answers from the student's own material and tells them which page to re-read. |
| Research | "Which optimiser did the paper use?" | Quick lookup inside long papers, as demonstrated by the corpus of this project. |

In legal and medical settings a **refusal** is as important as a correct answer. A system that answers "I could not find this in the documents" when the question is out of scope is safer than one that always answers. This is why refusal is a first-class feature of Askmargin and is evaluated separately.

## 1.4 Objectives of the project

1. Choose a real-world NLP task (document question answering) and a public dataset (four open-access research papers).
2. Implement every stage of the pipeline ourselves in Python: text extraction and cleaning, tokenisation, stop-word removal, lemmatisation, chunking, TF-IDF, BM25, dense sentence embeddings, a vector store with cosine similarity and FAISS, a refusal rule, and answer generation with an open model.
3. Evaluate honestly on a hand-written test set of 30 questions, using Recall@k, Mean Reciprocal Rank (MRR) and answer-level checks, and compare design choices (retrieval method, chunking strategy, chunk size).
4. Show the result as a working web demo at <b>askmargin.vercel.app</b>.

Everything runs on free tools (PyMuPDF, NLTK, scikit-learn, rank-bm25, Sentence-Transformers, FAISS, FLAN-T5 through Hugging Face Transformers) on a laptop CPU or free Google Colab, so every number in this report can be reproduced.
