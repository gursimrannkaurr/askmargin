# Chapter 4 | Implementation

The code was run in Google Colab. The screenshots below show the code and its output.

## 4.1 Install libraries and download the PDFs

{{IMG:colab/colab-01.jpg|70,132,1100,690|88%|4.1|Step 1 and 2: installing the libraries and downloading the four PDFs.}}

## 4.2 Read and clean the text

{{IMG:colab/colab-02.jpg|70,112,1100,690|88%|4.2|Step 3: the four PDFs are downloaded; the text of every page is cleaned.}}

## 4.3 Split into chunks

{{IMG:colab/colab-03.jpg|70,112,1100,690|88%|4.3|Step 4: 61 pages are split into sentence-based chunks.}}

## 4.4 TF-IDF search

{{IMG:colab/colab-04.jpg|70,112,1100,690|88%|4.4|Step 5: 716 chunks; TF-IDF finds the best chunk for a question.}}

## 4.5 Embedding search

{{IMG:colab/colab-05.jpg|45,140,600,365|62%|4.5|Step 6: code for the MiniLM embeddings.}}

{{IMG:colab/colab-06.jpg|70,525,800,635|62%|4.6|Step 6 output: vectors (716, 384) and the top 3 chunks with scores.}}

## 4.6 Compare the two searches

{{IMG:colab/colab-07.jpg|70,112,1100,690|88%|4.7|Step 7: ten test questions and the accuracy function.}}

## 4.7 Generate the answer

{{IMG:colab/colab-08.jpg|70,112,1100,690|88%|4.8|Step 7 result (TF-IDF 0.9, embeddings 0.9) and the code of Step 8.}}

{{IMG:colab/colab-09.jpg|70,112,1100,330|88%|4.9|Step 8: FLAN-T5 model is loaded.}}

## 4.8 Ask questions

{{IMG:colab/colab-10.jpg|70,112,1100,560|88%|4.10|Step 9: answers with sources, and a refusal for the question about France.}}
