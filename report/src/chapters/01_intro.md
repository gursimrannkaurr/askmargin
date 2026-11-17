# Chapter 1 | Introduction

## 1.1 Natural Language Processing

Natural Language Processing (NLP) is a branch of Artificial Intelligence that helps computers read, understand and use human language. Common uses are chatbots, translation, search engines and question answering.

## 1.2 Retrieval-Augmented Generation and Document Q&A

Chatbots do not know our private documents and sometimes make up answers. Retrieval-Augmented Generation (RAG) fixes this in two parts: first the program **retrieves** the passages of the documents that match the question, then a language model **generates** a short answer from only those passages. The page number of each passage is shown, so the answer can be checked. Typical uses are study help, company documents and customer support.

## 1.3 Objective of the Project

The objective is to build **Askmargin**, a small document question-answering assistant in Python. It should:

- read four public PDF papers and cut them into small chunks;
- find the best chunks for a question with two search methods and compare them;
- write a short answer with an open language model and show the pages used;
- refuse questions that the documents cannot answer.
