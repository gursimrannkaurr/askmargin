# Askmargin: Question Answering over Documents using RAG

## Introduction

### What is NLP

Natural Language Processing (NLP) is the part of computer science that teaches computers to read, understand and use human language. Examples are search engines, translation, spam filters and chatbots. In this project NLP is used to find the right part of a document for a question and to write a short answer from it.

### What is RAG

A chatbot such as a large language model has only learned from old data and does not know our own documents. When it does not know something it can still write a sentence that sounds right but is false. This is why chatbots sometimes make things up. Retrieval-Augmented Generation (RAG) fixes this by looking up the document first. The system searches the document for the parts that match the question, and the language model writes the answer using only those parts. Because the answer comes from a real page, it can also show where it was found.

### Objective of the Project

- To build an assistant that answers a question from a set of PDF documents.
- To compare two ways of searching: word matching (TF-IDF) and meaning matching (embeddings).
- To show the page number of every answer and to refuse questions that are not in the documents.

## Dataset

The documents are four public research papers from arXiv:

- Attention Is All You Need (Transformer)
- BERT
- RAG (Retrieval-Augmented Generation)
- Sentence-BERT

Together they have 61 pages, which were cut into 716 chunks (small pieces of text). To test the search, 10 questions with known answers were prepared, for example "How many parallel attention heads does the Transformer use?".

## Tools and Libraries Used

- Google Colab (to run the notebook)
- Python
- PyMuPDF (reads the PDF files)
- NLTK (splits text into sentences)
- scikit-learn TF-IDF (word matching)
- sentence-transformers, model all-MiniLM-L6-v2 (embeddings)
- FLAN-T5 from Hugging Face transformers (writes the answer)

The full code is in the notebook: github.com/gursimrannkaurr/askmargin/blob/main/colab/askmargin_colab.ipynb

## Methodology

The assistant works in seven simple steps, shown below with the real Colab output.

### Reading and Cleaning Text

The four papers are downloaded from arXiv and read page by page with PyMuPDF, so every piece of text keeps its page number. Each page is cleaned by joining words that were split at the end of a line and by removing extra spaces. The result is 61 pages of clean text.

{{IMG:colab/colab-01.jpg|70,132,1100,690|100%|1|Installing the libraries and downloading the four PDFs.}}
{{IMG:colab/colab-02.jpg|70,112,1100,690|100%|2|Download result and the code that cleans the text.}}

### Splitting into Chunks

A page has many topics, so each page is cut into small chunks of about 500 characters made of whole sentences. The last sentence of a chunk is repeated in the next one so that no idea is cut in the middle. The 61 pages became 716 chunks.

{{IMG:colab/colab-03.jpg|70,112,1100,690|100%|3|The cleaned text has 61 pages; the code that makes chunks.}}

### TF-IDF Search

TF-IDF gives every chunk a score based on how many of the question words it contains. Common words count less and rare words count more. The chunk with the highest score is the best match. It only compares words, so it can miss a chunk that uses different words with the same meaning.

{{IMG:colab/colab-04.jpg|70,112,1100,690|100%|4|716 chunks and the TF-IDF search with its best chunk.}}

### Embedding Search

An embedding model (all-MiniLM-L6-v2) changes each chunk into a list of 384 numbers that represents its meaning. The question is changed into numbers in the same way. Cosine similarity then tells how close the two lists are: a score near 1 means the meanings are very similar and a score near 0 means they are not related. The chunks with the highest scores are returned.

{{IMG:colab/colab-05.jpg|45,140,600,365|75%|5|Code for the embedding search.}}
{{IMG:colab/colab-06.jpg|70,525,800,635|90%|6|Vectors of shape (716, 384) and the top 3 chunks with their scores.}}

### Comparing the Two Searches

Ten questions with known answers were used. A search is counted as correct if one of its top 3 chunks contains the answer. Both methods got 0.9, which means 9 of the 10 questions.

{{IMG:colab/colab-07.jpg|70,112,1100,690|100%|7|The ten test questions and the accuracy code.}}
{{IMG:colab/colab-08.jpg|70,112,1100,690|100%|8|Accuracy of TF-IDF and embeddings (both 0.9), and the start of the answer code.}}

### Generating the Answer

The best 3 chunks are given to FLAN-T5, a small language model from Hugging Face, with the instruction to answer only from them. Before this, the best embedding similarity is checked. If it is under 0.25, the assistant says that it cannot find the answer instead of guessing. The answer is printed together with the document and page numbers of the chunks.

{{IMG:colab/colab-09.jpg|70,112,1100,330|100%|9|The FLAN-T5 model is loaded.}}

### Trying the Assistant

Four questions were asked. Three of them are about the papers and one (the capital of France) is not in the papers.

{{IMG:colab/colab-10.jpg|70,112,1100,560|100%|10|Answers with sources, and a refusal for the question about France.}}

## Results and Analysis

Both searches found the answer text for 9 of 10 test questions, so they are tied and neither can be called better on this small test.

{{CAP:tcap|Top-3 accuracy on 10 questions}}

| Search method | Accuracy |
|---|---|
| TF-IDF | 0.9 |
| Embeddings | 0.9 |

- The answers 30,000 (vocabulary size of BERT) and 21M documents (Wikipedia index of RAG) are correct.
- For "Which pre-trained seq2seq model acts as the generator?" the answer was "RAG-Token Model". This is wrong, the correct answer is BART.
- The question about the capital of France was correctly refused.
- Limitations: only 10 questions were used, and the generator model is small, so it can pick a wrong detail.

### Web Demo

The same idea is also available as a website, askmargin.vercel.app, which runs in the browser. It shows the best matching sentences from the papers with their page citations, so the answer is extractive (copied from the document, not newly written). For a question that is not in the documents it refuses to answer. The website uses a refusal threshold of 0.24, while the notebook uses 0.25.

{{IMG:02-answer.png|0,260,1120,1320|78%|11|The website gives an answer with page citations.}}
{{IMG:04-refusal.png|0,260,1120,800|78%|12|The website refuses a question that is not in the documents.}}

## Conclusion

Askmargin shows that a document question answering assistant can be built with simple open tools. Searching the document first and answering only from the best chunks keeps the answer tied to a real page. TF-IDF and embeddings both reached 0.9 on the test questions, and the assistant correctly refused a question that was not in the papers. One answer was wrong, so the small generator model is the weakest part and could be improved with a larger model and more test questions.

## References

- Vaswani et al., "Attention Is All You Need", arXiv:1706.03762.
- Devlin et al., "BERT: Pre-training of Deep Bidirectional Transformers", arXiv:1810.04805.
- Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", arXiv:2005.11401.
- Reimers and Gurevych, "Sentence-BERT", arXiv:1908.10084.
- PyMuPDF, NLTK, scikit-learn, sentence-transformers and Hugging Face transformers (FLAN-T5) documentation.
