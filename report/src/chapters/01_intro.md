# Problem Introduction

## The problem

Many important documents are long PDFs: lecture notes, research papers, company policies, product manuals. When we need one fact from a 50-page PDF, we have to read many pages to find it. Ordinary keyword search (Ctrl+F) only finds exact words, so it fails when the question is worded differently from the text.

Chatbots such as ChatGPT can answer questions easily, but they have two problems for this job. First, they do not know our private documents. Second, when they do not know the answer they often **make one up** and sound very sure. This is called *hallucination*. A wrong answer that sounds right is dangerous, because the reader cannot tell.

## What is RAG?

The idea used in this project is called **Retrieval-Augmented Generation (RAG)**. It works in two parts. First we *retrieve*: the program searches the documents and picks the few passages that are most related to the question. Then we *generate*: a language model writes a short answer using only those passages. Because the answer is built from the documents, we can also show **which page** it came from. If no passage is related enough, the program says "I could not find this in the documents" instead of guessing.

## Where it is used

- **Study help:** ask questions about your own notes or textbooks and see the page to re-read.
- **Company documents:** find a rule in hundreds of policy files.
- **Customer support:** answer questions from the product manual, with the page as proof.

## Objective

The objective of this mini-project is to build a small question-answering assistant, called **Askmargin**, in Python using NLP techniques. It reads four public PDF papers, finds the best passages for a question with two search methods, compares the two methods on ten test questions, writes an answer with an open language model, and refuses questions that the documents cannot answer.
