import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))
import numpy as np
from pathlib import Path
from sklearn.cluster import KMeans
from sklearn.preprocessing import normalize
import umap.umap_ as umap
from ml.embeddings import get_chroma_collection, model

# ─── Get Clusters ─────────────────────────────────────────
def get_topic_clusters(
    n_clusters:  int  = 10,
    post_ids:    list = None,
    max_posts:   int  = 2000
):
    collection = get_chroma_collection()

    # ── Fetch embeddings from ChromaDB ────────────────────
    if post_ids:
        data = collection.get(
            ids     = post_ids[:max_posts],
            include = ["embeddings", "documents", "metadatas"]
        )
    else:
        data = collection.get(
            limit   = max_posts,
            include = ["embeddings", "documents", "metadatas"]
        )

    ids        = data["ids"]
    documents = data.get("documents")
    if documents is None:
        documents = []

    metadatas = data.get("metadatas")
    if metadatas is None:
        metadatas = []

    raw_embeddings = data.get("embeddings")
    if raw_embeddings is None:
        raw_embeddings = []
    elif isinstance(raw_embeddings, np.ndarray):
        raw_embeddings = raw_embeddings.tolist()

    # ── Edge case: not enough posts ───────────────────────
    if len(ids) < 2:
        return {
            "error":   "Not enough posts to cluster",
            "points":  [],
            "clusters": []
        }

    # ── Ensure embeddings exist ───────────────────────────
    if len(raw_embeddings) != len(ids):
        try:
            raw_embeddings = model.encode(
                [d if d else "empty post" for d in documents],
                show_progress_bar=False,
                batch_size=64
            ).tolist()
        except Exception:
            return {
                "error": "Could not prepare embeddings for clustering",
                "points": [],
                "clusters": []
            }

    embeddings = np.array(raw_embeddings)

    # ── Clamp n_clusters ──────────────────────────────────
    # keep upper bound safe for KMeans (must be <= n_samples)
    n_clusters = max(2, min(n_clusters, min(50, len(ids))))

    # ── Normalize embeddings ──────────────────────────────
    embeddings_norm = normalize(embeddings)

    # ── UMAP: reduce to 2D for visualization ──────────────
    try:
        reducer = umap.UMAP(
            n_components = 2,
            n_neighbors  = min(15, len(ids) - 1),
            min_dist     = 0.1,
            metric       = "cosine",
            random_state = 42
        )
        embeddings_2d = reducer.fit_transform(embeddings_norm)
    except Exception:
        # fallback projection avoids request failure if UMAP fails
        if embeddings_norm.shape[1] >= 2:
            embeddings_2d = embeddings_norm[:, :2]
        else:
            embeddings_2d = np.column_stack([
                embeddings_norm[:, 0],
                np.zeros(len(ids))
            ])

    # ── KMeans clustering ─────────────────────────────────
    try:
        kmeans  = KMeans(
            n_clusters = n_clusters,
            random_state = 42,
            n_init = 10
        )
        labels  = kmeans.fit_predict(embeddings_norm)
    except Exception:
        labels = np.array([i % n_clusters for i in range(len(ids))])

    # ── Build cluster labels (top words per cluster) ──────
    cluster_texts = {}
    for i, label in enumerate(labels):
        if label not in cluster_texts:
            cluster_texts[label] = []
        cluster_texts[label].append(documents[i])

    cluster_labels = {}
    for label, texts in cluster_texts.items():
        combined = " ".join(texts[:20])
        STOP_WORDS = {
            "their", "about", "people", "would", "could",
            "should", "which", "there", "these", "those",
            "other", "where", "being", "after", "before",
            "through", "between", "against", "during",
            "https", "that", "have", "this", "with",
            "from", "they", "will", "been", "were",
            "when", "what", "your", "just", "more"
        }
        words = [
            w.lower() for w in combined.split()
            if len(w) > 4 and w.lower() not in STOP_WORDS
        ]
        freq = {}
        for w in words:
            freq[w] = freq.get(w, 0) + 1
        top_words = sorted(freq, key=freq.get, reverse=True)[:3]
        cluster_labels[label] = " · ".join(top_words)

    # ── Format output ─────────────────────────────────────
    points = []
    for i in range(len(ids)):
        points.append({
            "id":        ids[i],
            "x":         float(embeddings_2d[i][0]),
            "y":         float(embeddings_2d[i][1]),
            "cluster":   int(labels[i]),
            "label":     cluster_labels.get(int(labels[i]), f"Topic {labels[i]}"),
            "text":      documents[i][:100],
            "subreddit": metadatas[i].get("subreddit", ""),
            "flair":     metadatas[i].get("flair", ""),
            "score":     metadatas[i].get("score", 0),
        })

    clusters = [
        {
            "id":    int(k),
            "label": v,
            "count": int(np.sum(labels == k))
        }
        for k, v in cluster_labels.items()
    ]

    return {
        "points":     points,
        "clusters":   sorted(clusters, key=lambda x: x["count"], reverse=True),
        "n_clusters": n_clusters,
        "total":      len(points)
    }


# ─── Test ─────────────────────────────────────────────────
if __name__ == "__main__":
    print("🔄 Testing clustering with n=5...")
    result = get_topic_clusters(n_clusters=5)
    print(f"   Total points : {result['total']}")
    print(f"   Clusters     : {result['n_clusters']}")
    for c in result["clusters"][:3]:
        print(f"   → {c['label']} ({c['count']} posts)")

    print("\n🔄 Testing extreme value n=1...")
    result = get_topic_clusters(n_clusters=1)
    print(f"   Clamped to   : {result['n_clusters']} clusters")

    print("\n🔄 Testing extreme value n=999...")
    result = get_topic_clusters(n_clusters=999)
    print(f"   Clamped to   : {result['n_clusters']} clusters")