import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from pathlib import Path
from langdetect import detect
from deep_translator import GoogleTranslator
from ml.embeddings import get_chroma_collection, model

# ─── Semantic Search ──────────────────────────────────────
def semantic_search(
    query:      str,
    n_results:  int = 50,
    subreddit:  str = None,
    ideology:   str = None,
):
    # ── Edge case 1: empty query ──────────────────────────
    if not query or len(query.strip()) == 0:
        return {
            "results":  [],
            "message":  "Empty query — showing no results",
            "query_used": query,
            "translated": False
        }

    # ── Edge case 2: very short query ─────────────────────
    if len(query.strip()) < 3:
        return {
            "results":  [],
            "message":  "Query too short — please type at least 3 characters",
            "query_used": query,
            "translated": False
        }

    # ── Edge case 3: non-English query ────────────────────
    translated    = False
    original_query = query
    try:
        lang = detect(query)
        if lang != "en":
            query = GoogleTranslator(
                source="auto", target="en"
            ).translate(query)
            translated = True
            print(f"🌐 Translated '{original_query}' → '{query}'")
    except Exception:
        pass  # if detection fails just continue with original

    # ── Build filters ─────────────────────────────────────
    where = {}
    if subreddit:
        where["subreddit"] = subreddit
    if ideology:
        where["flair"] = ideology

    # ── Embed query ───────────────────────────────────────
    query_embedding = model.encode([query]).tolist()[0]

    # ── Search ChromaDB ───────────────────────────────────
    collection = get_chroma_collection()

    search_kwargs = {
        "query_embeddings": [query_embedding],
        "n_results":        min(n_results, collection.count()),
        "include":          ["documents", "metadatas", "distances"]
    }
    if where:
        search_kwargs["where"] = where

    results = collection.query(**search_kwargs)

    # ── Format results ────────────────────────────────────
    ids        = results["ids"][0]
    documents  = results["documents"][0]
    metadatas  = results["metadatas"][0]
    distances  = results["distances"][0]

    formatted = [
        {
            "id":         ids[i],
            "text":       documents[i],
            "subreddit":  metadatas[i].get("subreddit", ""),
            "author":     metadatas[i].get("author", ""),
            "flair":      metadatas[i].get("flair", ""),
            "score":      metadatas[i].get("score", 0),
            "relevance":  round(1 - distances[i], 4)
        }
        for i in range(len(ids))
    ]

    return {
        "results":      formatted,
        "message":      f"Found {len(formatted)} results",
        "query_used":   query,
        "original_query": original_query,
        "translated":   translated
    }


# ─── Test ─────────────────────────────────────────────────
if __name__ == "__main__":
    # Test 1: normal query
    print("\n🔍 Test 1: Normal query")
    r = semantic_search("resistance to government authority")
    print(f"   Found: {len(r['results'])} results")
    if r["results"]:
        print(f"   Top result: {r['results'][0]['text'][:80]}")

    # Test 2: zero keyword overlap
    print("\n🔍 Test 2: Zero keyword overlap")
    r = semantic_search("collective resource sharing")
    print(f"   Found: {len(r['results'])} results")
    if r["results"]:
        print(f"   Top result: {r['results'][0]['text'][:80]}")

    # Test 3: non-English
    print("\n🔍 Test 3: Non-English (Hindi)")
    r = semantic_search("सरकार के खिलाफ प्रतिरोध")
    print(f"   Translated: {r['translated']}")
    print(f"   Query used: {r['query_used']}")
    print(f"   Found: {len(r['results'])} results")

    # Test 4: empty query
    print("\n🔍 Test 4: Empty query")
    r = semantic_search("")
    print(f"   Message: {r['message']}")

    # Test 5: very short query
    print("\n🔍 Test 5: Short query")
    r = semantic_search("hi")
    print(f"   Message: {r['message']}")