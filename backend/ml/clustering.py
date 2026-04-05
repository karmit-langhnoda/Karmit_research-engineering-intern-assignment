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
    embeddings = np.array(data["embeddings"])
    documents  = data["documents"]
    metadatas  = data["metadatas"]

    # ── Edge case: not enough posts ───────────────────────
    if len(ids) < 2:
        return {
            "error":   "Not enough posts to cluster",
            "points":  [],
            "clusters": []
        }

    # ── Clamp n_clusters ──────────────────────────────────
    # handles extreme values from slider
    n_clusters = max(2, min(n_clusters, len(ids) // 2))

    # ── Normalize embeddings ──────────────────────────────
    embeddings_norm = normalize(embeddings)

    # ── UMAP: reduce to 2D for visualization ──────────────
    reducer = umap.UMAP(
        n_components = 2,
        n_neighbors  = min(15, len(ids) - 1),
        min_dist     = 0.1,
        metric       = "cosine",
        random_state = 42
    )
    embeddings_2d = reducer.fit_transform(embeddings_norm)

    # ── KMeans clustering ─────────────────────────────────
    kmeans  = KMeans(
        n_clusters = n_clusters,
        random_state = 42,
        n_init = 10
    )
    labels  = kmeans.fit_predict(embeddings_norm)

    # ── Build cluster labels (top words per cluster) ──────
    cluster_texts = {}
    for i, label in enumerate(labels):
        if label not in cluster_texts:
            cluster_texts[label] = []
        cluster_texts[label].append(documents[i])

    cluster_labels = {}
    for label, texts in cluster_texts.items():
        combined = " ".join(texts[:20])
        words    = [
            w.lower() for w in combined.split()
            if len(w) > 4
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