# Chapter 5 | Results and Analysis

{{CAP:tcap|<b>Table 5.1:</b> Results of the experiments.}}

| Test | Result |
|---|---|
| TF-IDF search, top-3 accuracy (10 questions) | 0.9 (9 of 10) |
| Embedding search, top-3 accuracy (10 questions) | 0.9 (9 of 10) |
| 3 questions from the papers | 2 correct, 1 wrong |
| 1 question not in the papers | refused correctly |

- Both searches found the answer text for 9 of 10 questions, so on this small test neither is clearly better.
- The answers show the document and page of the chunks used.
- The question about France was refused instead of answered.
- The question about the generator model got a **wrong** answer ("RAG-Token Model", correct is BART); FLAN-T5-base is small and can pick a wrong detail.
- Only 10 test questions and one refusal example were used, so the results are only indicative.

The same idea is also available as a website, **askmargin.vercel.app**, which runs in the browser.

{{IMG:02-answer.png|0,60,1120,1100|66%|5.1|Askmargin website: an answer with page citations.}}
