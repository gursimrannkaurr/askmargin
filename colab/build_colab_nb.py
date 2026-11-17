import nbformat as nbf
nb = nbf.v4.new_notebook(); C = []
md = lambda t: C.append(nbf.v4.new_markdown_cell(t.strip("\n")))
code = lambda t: C.append(nbf.v4.new_code_cell(t.strip("\n")))

md("# Askmargin: Document Q&A with RAG\nAsk a question about PDF documents and get an answer with the page it came from.")
md("## Step 1. Install libraries")
code("!pip -q install pymupdf sentence-transformers nltk")
md("## Step 2. Download the documents\nFour public research papers from arXiv.")
code('''import os, re, requests, fitz, nltk, numpy as np
nltk.download("punkt", quiet=True); nltk.download("punkt_tab", quiet=True)
os.makedirs("pdfs", exist_ok=True)
PAPERS = {"attention": "1706.03762", "bert": "1810.04805", "rag": "2005.11401", "sbert": "1908.10084"}
for name, arxiv_id in PAPERS.items():
    r = requests.get(f"https://arxiv.org/pdf/{arxiv_id}", timeout=60)
    open(f"pdfs/{name}.pdf", "wb").write(r.content)
    print(name, "downloaded:", round(len(r.content) / 1e6, 2), "MB")''')
md("## Step 3. Read and clean the text\nText is read page by page so every piece of text keeps its page number.")
code('''def clean(text):
    text = re.sub(r"-\\n(?=[a-z])", "", text)   # join words split at line ends
    text = re.sub(r"\\s+", " ", text)           # remove extra spaces and new lines
    return text.strip()

pages = []
for name in PAPERS:
    for number, page in enumerate(fitz.open(f"pdfs/{name}.pdf"), start=1):
        text = clean(page.get_text())
        if len(text) > 80:
            pages.append({"doc": name, "page": number, "text": text})

print("Total pages:", len(pages))
print(pages[4]["doc"], "page", pages[4]["page"], ":", pages[4]["text"][:200], "...")''')
md("## Step 4. Split the pages into chunks\nA page holds many topics, so each page is cut into small chunks of about 500 characters made of whole sentences.")
code('''from nltk.tokenize import sent_tokenize

def make_chunks(pages, size=500):
    chunks = []
    for p in pages:
        current = []
        for sentence in sent_tokenize(p["text"]):
            if current and len(" ".join(current)) + len(sentence) > size:
                chunks.append({"doc": p["doc"], "page": p["page"], "text": " ".join(current)})
                current = [current[-1]]          # keep last sentence as overlap
            current.append(sentence)
        if len(" ".join(current)) > 60:
            chunks.append({"doc": p["doc"], "page": p["page"], "text": " ".join(current)})
    return chunks

chunks = make_chunks(pages)
print("Number of chunks:", len(chunks))
print(chunks[20])''')
md("## Step 5. Search method 1: TF-IDF (word matching)")
code('''from sklearn.feature_extraction.text import TfidfVectorizer

tfidf = TfidfVectorizer(stop_words="english")
tfidf_matrix = tfidf.fit_transform([c["text"] for c in chunks])

def search_tfidf(question):
    return (tfidf_matrix @ tfidf.transform([question]).T).toarray().ravel()

scores = search_tfidf("How many attention heads does the Transformer use?")
best = scores.argmax()
print("Best chunk:", chunks[best]["doc"], "page", chunks[best]["page"], "score", round(scores[best], 2))
print(chunks[best]["text"])''')
md("## Step 6. Search method 2: embeddings (meaning matching)\nAn embedding model turns each chunk into a list of 384 numbers. Chunks with similar meaning get similar numbers.")
code('''from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")
chunk_vectors = model.encode([c["text"] for c in chunks], normalize_embeddings=True)
print("Chunk vectors:", chunk_vectors.shape)

def search_embed(question):
    q = model.encode([question], normalize_embeddings=True)[0]
    return chunk_vectors @ q            # cosine similarity

scores = search_embed("How many attention heads does the Transformer use?")
for i in scores.argsort()[::-1][:3]:
    print(chunks[i]["doc"], "page", chunks[i]["page"], "score", round(scores[i], 2))''')
md("## Step 7. Which search method is better?\nTen questions with known answers. A search is correct if one of its top 3 chunks contains the answer.")
code('''tests = [
 ("How many parallel attention heads does the Transformer use?", "attention", "h = 8"),
 ("How many identical layers are stacked in the encoder?", "attention", "N = 6"),
 ("What BLEU score did the big model reach on English-to-German translation?", "attention", "28.4"),
 ("What size is the vocabulary used by BERT tokenizer?", "bert", "30,000"),
 ("How many parameters does the base version of BERT have?", "bert", "110M"),
 ("What fraction of tokens is hidden in the masked language model objective?", "bert", "15%"),
 ("How many passages does the Wikipedia retrieval index contain?", "rag", "21M"),
 ("Which pre-trained seq2seq model acts as the generator?", "rag", "BART"),
 ("How long does finding the most similar pair among 10,000 sentences take with plain BERT?", "sbert", "65 hours"),
 ("Which pooling strategy is the default for building sentence embeddings?", "sbert", "MEAN"),
]

def accuracy(search_fn):
    correct = 0
    for question, doc, answer in tests:
        top3 = search_fn(question).argsort()[::-1][:3]
        correct += any(chunks[i]["doc"] == doc and answer in chunks[i]["text"] for i in top3)
    return correct / len(tests)

print("TF-IDF    :", accuracy(search_tfidf))
print("Embeddings:", accuracy(search_embed))''')
md("## Step 8. Generate the answer\nThe best 3 chunks are given to a small open language model (FLAN-T5) with the instruction to answer only from them. If even the best chunk is not similar enough to the question, the assistant says it cannot find the answer.")
code('''from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

tok = AutoTokenizer.from_pretrained("google/flan-t5-base")
llm = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-base")
THRESHOLD = 0.25

def ask(question):
    scores = search_embed(question)
    top = scores.argsort()[::-1][:3]
    if scores.max() < THRESHOLD:
        return "I could not find this in the documents."
    context = "\\n".join(chunks[i]["text"] for i in top)
    prompt = f"Answer using only the context. Be brief.\\n\\nContext:\\n{context}\\n\\nQuestion: {question}\\nAnswer:"
    ids = tok(prompt, return_tensors="pt", truncation=True, max_length=1024)
    answer = tok.decode(llm.generate(**ids, max_new_tokens=40)[0], skip_special_tokens=True)
    sources = ", ".join(f"{chunks[i]['doc']} p.{chunks[i]['page']}" for i in top)
    return f"{answer}   [sources: {sources}]"''')
md("## Step 9. Try it")
code('''for q in ["What size is the vocabulary used by BERT tokenizer?",
          "How many passages does the Wikipedia retrieval index contain?",
          "Which pre-trained seq2seq model acts as the generator?",
          "What is the capital city of France?"]:
    print("Q:", q)
    print("A:", ask(q), "\\n")''')
nb["cells"] = C
nb["metadata"]["kernelspec"] = {"display_name": "Python 3", "language": "python", "name": "python3"}
nbf.write(nb, "askmargin_colab.ipynb")
