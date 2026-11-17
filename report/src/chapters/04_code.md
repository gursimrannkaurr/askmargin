# Python Code with Explanations and Screenshots

The code was written in a Google Colab notebook (`askmargin_colab.ipynb`) and run top to bottom. The screenshots below are real captures of the Colab page, each showing code and its output. The complete code is also printed as plain text in the Appendix.

## Install the libraries and download the PDFs

Step 1 installs three libraries: PyMuPDF (reads PDFs), sentence-transformers (embeddings) and NLTK (sentence splitting). Step 2 downloads the four papers from arXiv with the `requests` library and prints the size of each file.

{{IMG:colab/colab-01.jpg|70,132,1100,690|100%|2|Colab: Step 1 (install) and the code of Step 2 (download).}}

## Read and clean the text

The output of Step 2 shows that all four papers were downloaded (2.22, 0.78, 0.89 and 0.55 MB). Step 3 defines `clean()`, which joins words broken by a hyphen at the end of a line and removes extra spaces, then reads every page and keeps its document name, page number and text.

{{IMG:colab/colab-02.jpg|70,112,1100,690|100%|3|Colab: output of Step 2 and the code of Step 3 (read and clean).}}

## Split the pages into chunks

Step 3 found **61 pages** in total (the printed sample is the start of page 5 of the Transformer paper). Step 4 cuts each page into chunks of whole sentences of about 500 characters, using the NLTK sentence tokenizer, with the last sentence repeated as overlap. The result is **716 chunks**; chunk number 20 is printed as an example.

{{IMG:colab/colab-03.jpg|70,112,1100,690|100%|4|Colab: output of Step 3 (61 pages) and the code of Step 4 (chunking).}}

## TF-IDF search

Step 5 builds the TF-IDF table of all chunks (English stop-words removed) and defines `search_tfidf()`, which scores every chunk against a question. For the question about the number of attention heads, TF-IDF returned a chunk from page 15 of the Transformer paper with score 0.33. Reading it shows that it is a caption of a figure about attention heads, not the sentence that gives the number. This is typical for word matching: the right words are present, but not the answer.

{{IMG:colab/colab-04.jpg|70,112,1100,690|100%|5|Colab: output of Step 4 (716 chunks) and the code and output of Step 5 (TF-IDF).}}

## Embedding search

Step 6 loads the MiniLM embedding model, turns all chunks into vectors of shape (716, 384), and defines `search_embed()`. Because the vectors are normalised, a simple dot product gives the cosine similarity. For the same question the top three chunks are from pages 2, 5 and 2 of the Transformer paper, with scores 0.71, 0.70 and 0.65. The output screenshot is cropped to its last lines; the lines above them are only download progress bars of the model.

{{IMG:colab/colab-05.jpg|45,140,600,365|80%|6|Colab: code of Step 6 (embeddings). This capture has a lower resolution than the others.}}

{{IMG:colab/colab-06.jpg|70,525,800,635|75%|7|Colab: output of Step 6: vector shape (716, 384) and the top three chunks with their scores.}}

## Compare the two methods

Step 7 holds the ten test questions, each with the paper it belongs to and the answer text that must appear in a retrieved chunk. The function `accuracy()` counts how many questions have the answer inside one of the top 3 chunks. Both methods score **0.9**, that is 9 correct out of 10.

{{IMG:colab/colab-07.jpg|70,112,1100,690|100%|8|Colab: Step 7, the ten test questions and the accuracy function.}}

## Generate the answer

The output of Step 7 shows TF-IDF 0.9 and Embeddings 0.9. Step 8 loads FLAN-T5-base and defines `ask()`. It finds the top 3 chunks with the embedding search, refuses if the best score is below `THRESHOLD = 0.25`, otherwise builds the prompt, lets FLAN-T5 write a short answer, and appends the sources (document and page of each chunk).

{{IMG:colab/colab-08.jpg|70,112,1100,690|100%|9|Colab: output of Step 7 (0.9 and 0.9) and the code of Step 8 (generation).}}

The model files (about 1 GB) are downloaded the first time, as shown below.

{{IMG:colab/colab-09.jpg|70,112,1100,330|100%|10|Colab: end of the code of Step 8 and the model-loading output.}}

## Try it

Step 9 asks four questions. The answers are in the next screenshot. The BERT vocabulary size (30,000) and the Wikipedia index size (21M documents) are correct. For the question about the generator model, the answer "RAG-Token Model" is **wrong**: the paper uses BART, which the system did not find. The question about France is correctly refused.

{{IMG:colab/colab-10.jpg|70,112,1100,560|100%|11|Colab: Step 9, four questions with answers and sources.}}
