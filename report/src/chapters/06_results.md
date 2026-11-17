# Results and Conclusion

## Results

{{CAP:tcap|<b>Table 1:</b> Results of the experiments (from the Colab outputs).}}

| Test | Result |
|---|---|
| TF-IDF search, top-3 accuracy on 10 questions | 0.9 (9 of 10) |
| Embedding search, top-3 accuracy on 10 questions | 0.9 (9 of 10) |
| Demo with 3 questions from the papers | 2 correct, 1 wrong |
| Demo with 1 question not in the papers | refused correctly |

## What worked and what did not

**What worked.** Both search methods found the answer text in their top 3 chunks for 9 of the 10 test questions. The answers come with the document and page of the chunks they used. The question about France was refused instead of answered, so the refusal rule works on this example.

**What did not work.** For the question about the generator model, the system answered "RAG-Token Model", but the correct answer is BART. The three sources it printed are pages of the RAG paper, so a reader checking them would find the mistake, but the answer itself is wrong. FLAN-T5-base is a small model and can pick a wrong detail from the text it is given. The sources list shows all three chunks, not only the one that holds the answer. TF-IDF and embeddings tied at 0.9 on only ten questions, so we cannot say that one is better; a larger test set is needed. The refusal rule was tried on a single out-of-topic question.

## Conclusion

Askmargin shows a complete small NLP pipeline: reading and cleaning PDFs, splitting them into sentence-based chunks, searching with TF-IDF and with sentence embeddings, generating a short answer with FLAN-T5, and refusing when the documents do not help. It answered most questions with page references and avoided a made-up answer for an off-topic question, but it also made a clear mistake, which shows why the page sources are important. Future work: use a bigger test set, try a stronger language model, and re-rank the top chunks before generating the answer.

## References

<ol class="refs">
<li>Vaswani, A. et al. (2017). Attention Is All You Need. arXiv:1706.03762.</li>
<li>Devlin, J. et al. (2019). BERT: Pre-training of Deep Bidirectional Transformers. arXiv:1810.04805.</li>
<li>Lewis, P. et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. arXiv:2005.11401.</li>
<li>Reimers, N. and Gurevych, I. (2019). Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks. arXiv:1908.10084.</li>
<li>Chung, H. W. et al. (2022). Scaling Instruction-Finetuned Language Models (FLAN-T5). arXiv:2210.11416.</li>
<li>Libraries: PyMuPDF, NLTK, scikit-learn, sentence-transformers (model all-MiniLM-L6-v2) and Hugging Face Transformers.</li>
</ol>
