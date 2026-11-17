# Chapter 3 | Methodology

The system follows seven steps.

1. **Read and clean:** read every PDF page with its page number; join hyphenated words and remove extra spaces.
2. **Chunking:** split pages into chunks of about 500 characters made of whole sentences.
3. **TF-IDF search:** tokenise, remove stop-words and score chunks by matching words.
4. **Embedding search:** turn chunks and question into 384 numbers and compare them with cosine similarity.
5. **Compare:** test both searches on 10 questions (top-3 accuracy).
6. **Generate:** give the best 3 chunks to FLAN-T5 with the instruction to answer only from them; print the sources.
7. **Refuse:** if the best similarity is below 0.25, answer "I could not find this in the documents."

{{DIAGRAM:x}}
{{CAP:fcap|<b>Figure 3.1:</b> Pipeline of Askmargin.}}
