import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))
import os
import json
from pathlib import Path
from threading import Lock
import chromadb
from sentence_transformers import SentenceTransformer
from database.duckdb_client import get_connection

# ─── Paths ────────────────────────────────────────────────
BASE_DIR    = Path(__file__).resolve().parent.parent.parent
CHROMA_PATH = Path(
    os.getenv("CHROMA_PATH", str(BASE_DIR / "data" / "chroma_db"))
).resolve()

_chroma_lock = Lock()
_chroma_client = None
_chroma_collection = None

_model_lock = Lock()
_model = None


def get_embedding_model():
    global _model

    if _model is not None:
        return _model

    with _model_lock:
        if _model is None:
            print("Loading embedding model...")
            _model = SentenceTransformer("all-MiniLM-L6-v2")
            print("Embedding model loaded")

    return _model

# ─── Chroma Client ────────────────────────────────────────
def get_chroma_collection():
    global _chroma_client, _chroma_collection

    if _chroma_collection is not None:
        return _chroma_collection

    with _chroma_lock:
        if _chroma_collection is None:
            _chroma_client = chromadb.PersistentClient(path=str(CHROMA_PATH))
            try:
                # Read-first mode prevents write failures on locked/read-only volumes.
                _chroma_collection = _chroma_client.get_collection(
                    name="reddit_posts"
                )
            except Exception:
                if os.getenv("CHROMA_AUTO_CREATE", "0") == "1":
                    _chroma_collection = _chroma_client.get_or_create_collection(
                        name="reddit_posts",
                        metadata={"hnsw:space": "cosine"}
                    )
                else:
                    raise RuntimeError(
                        "Could not open Chroma collection 'reddit_posts'. "
                        "Ensure /app/data/chroma_db exists and is readable. "
                        "Set CHROMA_AUTO_CREATE=1 only when you intentionally want to write/create it."
                    )

    return _chroma_collection

# ─── Embed All Posts ──────────────────────────────────────
def embed_all_posts(batch_size: int = 500):
    collection = get_chroma_collection()

    # check if already embedded
    existing = collection.count()
    if existing > 0:
        print(f"✅ Already embedded {existing} posts. Skipping.")
        return

    con   = get_connection()
    rows  = con.execute(
        "SELECT id, full_text, subreddit, author, author_flair_text, score FROM posts"
    ).fetchall()
    con.close()

    total = len(rows)
    print(f"📊 Embedding {total} posts in batches of {batch_size}...")

    for i in range(0, total, batch_size):
        batch = rows[i : i + batch_size]

        ids        = [str(row[0]) for row in batch]
        texts      = [str(row[1]) if row[1] else "empty post" for row in batch]
        metadatas  = [
            {
                "subreddit":  str(row[2] or ""),
                "author":     str(row[3] or ""),
                "flair":      str(row[4] or ""),
                "score":      int(row[5] or 0),
            }
            for row in batch
        ]

        model = get_embedding_model()
        embeddings = model.encode(
            texts,
            show_progress_bar=False,
            batch_size=64
        ).tolist()

        collection.add(
            ids        = ids,
            documents  = texts,
            embeddings = embeddings,
            metadatas  = metadatas
        )

        print(f"  ✅ Embedded {min(i + batch_size, total)}/{total}")

    print(f"\n🎉 Embedding complete! {collection.count()} posts in ChromaDB")

# ─── Test ─────────────────────────────────────────────────
if __name__ == "__main__":
    embed_all_posts()