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
CHROMA_PATH = BASE_DIR / "data" / "chroma_db"

_chroma_lock = Lock()
_chroma_client = None
_chroma_collection = None

# ─── Model (loads once) ───────────────────────────────────
print("🔄 Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("✅ Model loaded")

# ─── Chroma Client ────────────────────────────────────────
def get_chroma_collection():
    global _chroma_client, _chroma_collection

    if _chroma_collection is not None:
        return _chroma_collection

    with _chroma_lock:
        if _chroma_collection is None:
            _chroma_client = chromadb.PersistentClient(path=str(CHROMA_PATH))
            _chroma_collection = _chroma_client.get_or_create_collection(
                name="reddit_posts",
                metadata={"hnsw:space": "cosine"}
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