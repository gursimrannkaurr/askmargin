# Chapter 3 | NLP Pipeline Step by Step

## 3.1 Overview

The pipeline has seven steps. Steps 1 to 4 prepare the documents and the two search methods. Step 5 compares the two methods. Steps 6 and 7 turn the best passages into a final answer, or into a refusal when the documents do not help.

{{DIAGRAM:x}}
{{CAP:fcap|<b>Figure 3.1:</b> The Askmargin pipeline.}}

## 3.2 Step 1: Read and clean the text

The PDFs are read page by page with the library PyMuPDF, and every page keeps its page number, because the number becomes the citation later. Raw PDF text has small problems: words are split with a hyphen at the end of a line, and there are extra spaces and line breaks. A few lines using *regular expressions* join the split words and tidy the spaces. Pages with almost no text are skipped.

## 3.3 Step 2: Split the pages into chunks

A page talks about many things, and a language model can only read a limited amount of text. So each page is cut into **chunks** of about 500 characters. The cut is made with the NLTK sentence tokenizer, so a chunk always contains whole sentences and never stops in the middle of one. The last sentence of a chunk is repeated at the start of the next chunk (overlap), so an answer lying on the border is not lost.

## 3.4 Step 3: TF-IDF search (word matching)

TF-IDF gives each chunk a score for the words of the question. A word that appears often in a chunk but rarely in the other chunks counts a lot. Before this, the text is split into words (tokenisation) and very common words such as "the" and "is" are removed (stop-word removal). The chunk whose words match the question best is the winner. This method is fast and good with exact words, but it does not understand meaning.

## 3.5 Step 4: Embedding search (meaning matching)

An embedding model, **all-MiniLM-L6-v2**, turns every chunk into a list of 384 numbers, so that chunks with similar meaning get similar numbers. The question is turned into numbers in the same way. We then measure how close the question and each chunk are with **cosine similarity** (a score near 1 means very similar, near 0 means unrelated). This can match "How many layers..." with a chunk that says "a stack of N = 6 identical layers" even though the words are different.

## 3.6 Step 5: Compare the two methods

We do not want to guess which search is better, so we test both on the same ten questions. A search gets a point when one of its top 3 chunks contains the answer text. The result is called top-3 accuracy.

## 3.7 Step 6: Generate the answer with FLAN-T5

The best three chunks from the embedding search are pasted into a prompt for **FLAN-T5-base**, a small open language model that runs for free in Google Colab. The prompt says: answer using only the context and be brief. The pages of the three chunks are printed next to the answer as the sources. They come from the stored page numbers, so the model cannot invent them.

## 3.8 Step 7: Refuse when unsure

For a question like "What is the capital city of France?" the four papers contain nothing useful, but a search still returns some chunk. To avoid a made-up answer, the program looks at the best cosine score. If it is below the threshold **0.25**, it does not call the model and replies "I could not find this in the documents."
