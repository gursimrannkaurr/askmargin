# Chapter 6 | Conclusion

Askmargin is a small but complete NLP pipeline: it reads PDFs, cleans and chunks the text, searches with TF-IDF and with embeddings, writes an answer with FLAN-T5 and refuses when the documents do not help. It answered most questions with page references, but it also made a clear mistake, which shows why the page sources matter. In future, a bigger test set and a stronger language model can be used.

## References

1. Vaswani et al. (2017). Attention Is All You Need. arXiv:1706.03762.
2. Devlin et al. (2019). BERT. arXiv:1810.04805.
3. Lewis et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. arXiv:2005.11401.
4. Reimers and Gurevych (2019). Sentence-BERT. arXiv:1908.10084.
