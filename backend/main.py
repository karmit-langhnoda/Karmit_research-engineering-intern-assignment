import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent))

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from pydantic import BaseModel
import networkx as nx
from community import best_partition

from database.duckdb_client import (
    get_posts,
    get_timeline,
    get_subreddit_breakdown,
    get_ideology_breakdown,
    get_domain_breakdown,
    get_network_data,
    get_summary_stats
)
from database.chroma_client import semantic_search
from ml.clustering import get_topic_clusters
from ml.summarizer import summarize_timeline, summarize_search_results
from ml.global_trends import get_global_topics, get_global_insights
from agents.graph import run_agent

# ─── App Setup ────────────────────────────────────────
app = FastAPI(title="Reddit Narrative Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins  = ["*"],
    allow_methods  = ["*"],
    allow_headers  = ["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


class ChatMessage(BaseModel):
    role: str
    text: str


class ChatRequest(BaseModel):
    q: str
    history: list[ChatMessage] = []
    subreddit: Optional[str] = None
    ideology: Optional[str] = None
    date_from: Optional[float] = None
    date_to: Optional[float] = None
    limit: int = 50


def _build_chat_query(q: str, history: list[ChatMessage]) -> str:
    # Keep only recent user turns to limit prompt size.
    recent_user_turns = [m.text for m in history if m.role == "user"][-4:]
    if not recent_user_turns:
        return q

    context = "\n".join([f"- {m}" for m in recent_user_turns])
    return (
        "Use the conversation context to interpret the latest user question.\n"
        f"Conversation context:\n{context}\n\n"
        f"Latest user question: {q}"
    )

# ─── 1. Summary Stats ─────────────────────────────────
@app.get("/api/stats")
def stats():
    return get_summary_stats()

# ─── 2. Trending Topics ───────────────────────────────
@app.get("/api/trending")
def trending(
    subreddit:  Optional[str]   = None,
    ideology:   Optional[str]   = None,
    date_from:  Optional[float] = None,
    date_to:    Optional[float] = None,
):
    timeline = get_timeline(
        subreddit = subreddit,
        ideology  = ideology,
        date_from = date_from,
        date_to   = date_to
    )
    subreddits = get_subreddit_breakdown(
        subreddit = subreddit,
        ideology  = ideology,
        date_from = date_from,
        date_to   = date_to
    )

    # GenAI summary — dynamic based on actual data
    summary = summarize_timeline(
        timeline_data = timeline,
        query         = "overall Reddit activity"
    )

    return {
        "timeline":   timeline,
        "subreddits": subreddits,
        "summary":    summary
    }


@app.get("/api/global-trending")
def global_trending(
    region: str = Query(default="GLOBAL"),
    limit: int = Query(default=12, ge=3, le=30),
    refresh: bool = Query(default=False),
):
    return get_global_topics(
        region=region,
        limit=limit,
        force_refresh=refresh,
    )


@app.get("/api/global-insights")
def global_insights(
    subreddit: Optional[str] = None,
    ideology: Optional[str] = None,
    date_from: Optional[float] = None,
    date_to: Optional[float] = None,
    region: str = Query(default="GLOBAL"),
    limit: int = Query(default=12, ge=3, le=30),
):
    timeline = get_timeline(
        subreddit=subreddit,
        ideology=ideology,
        date_from=date_from,
        date_to=date_to,
    )
    posts = get_posts(
        subreddit=subreddit,
        ideology=ideology,
        date_from=date_from,
        date_to=date_to,
        limit=500,
    )

    return get_global_insights(
        reddit_posts=posts,
        reddit_timeline=timeline,
        region=region,
        limit=limit,
    )

# ─── 3. Search ────────────────────────────────────────
@app.get("/api/search")
def search(
    q:          str             = Query(default=""),
    subreddit:  Optional[str]   = None,
    ideology:   Optional[str]   = None,
    date_from:  Optional[float] = None,
    date_to:    Optional[float] = None,
    limit:      int             = 50
):
    try:
        # run full LangGraph agent
        result = run_agent(
            query   = q,
            filters = {
                "subreddit": subreddit,
                "ideology":  ideology,
                "date_from": date_from,
                "date_to":   date_to,
            }
        )
    except Exception as exc:
        return {
            "posts":            [],
            "timeline":         [],
            "subreddits":       [],
            "ideologies":       [],
            "domains":          [],
            "summary":          "Search failed due to a backend error.",
            "timeline_summary": "",
            "related_queries":  [],
            "total":            0,
            "error":            str(exc),
            "core_topic":       ""
        }

    # handle error from agent
    if result.get("error"):
        return {
            "posts":            [],
            "timeline":         [],
            "subreddits":       [],
            "ideologies":       [],
            "domains":          [],
            "summary":          result["error"],
            "timeline_summary": "",
            "related_queries":  [],
            "total":            0,
            "error":            result["error"],
            "core_topic":       ""
        }

    return {
        "posts":            result["posts"][:limit],
        "timeline":         result["timeline"],
        "subreddits":       result["subreddits"],
        "ideologies":       result["ideologies"],
        "domains":          result["domains"],
        "summary":          result["summary"],
        "timeline_summary": result.get("timeline_summary", ""),
        "related_queries":  result["related_queries"],
        "total":            len(result["posts"]),
        "error":            None,
        "core_topic":       result.get("core_topic", "")
    }


@app.post("/api/chat")
def chat(req: ChatRequest):
    contextual_query = _build_chat_query(req.q, req.history)

    try:
        result = run_agent(
            query=contextual_query,
            filters={
                "subreddit": req.subreddit,
                "ideology": req.ideology,
                "date_from": req.date_from,
                "date_to": req.date_to,
            },
        )
    except Exception as exc:
        return {
            "answer": "Chat failed due to a backend error.",
            "summary": "",
            "posts": [],
            "timeline": [],
            "subreddits": [],
            "ideologies": [],
            "domains": [],
            "related_queries": [],
            "total": 0,
            "error": str(exc),
            "core_topic": "",
        }

    if result.get("error"):
        return {
            "answer": result["error"],
            "summary": result["error"],
            "posts": [],
            "timeline": [],
            "subreddits": [],
            "ideologies": [],
            "domains": [],
            "related_queries": [],
            "total": 0,
            "error": result["error"],
            "core_topic": "",
        }

    answer = result.get("summary") or "I analyzed the conversation context and found related results."

    return {
        "answer": answer,
        "summary": result.get("summary", ""),
        "posts": result.get("posts", [])[: req.limit],
        "timeline": result.get("timeline", []),
        "subreddits": result.get("subreddits", []),
        "ideologies": result.get("ideologies", []),
        "domains": result.get("domains", []),
        "related_queries": result.get("related_queries", []),
        "total": len(result.get("posts", [])),
        "error": None,
        "core_topic": result.get("core_topic", ""),
    }

# ─── 4. Network Graph ─────────────────────────────────
@app.get("/api/network")
def network(
    min_connections: int           = 1,
    post_ids:        Optional[str] = None,
    remove_node:     Optional[str] = None
):
    ids   = post_ids.split(",") if post_ids else None
    edges = get_network_data(
        post_ids        = ids,
        min_connections = min_connections
    )

    if not edges:
        return {
            "nodes":       [],
            "edges":       [],
            "communities": {},
            "components":  0,
            "total_nodes": 0,
            "total_edges": 0
        }

    # build NetworkX graph
    G = nx.DiGraph()
    for e in edges:
        G.add_edge(
            e["source"], e["target"],
            weight = e["weight"]
        )

    # remove node if requested
    if remove_node and remove_node in G:
        G.remove_node(remove_node)

    # handle empty graph after removal
    if len(G.nodes) == 0:
        return {
            "nodes":       [],
            "edges":       [],
            "communities": {},
            "components":  0,
            "total_nodes": 0,
            "total_edges": 0
        }

    # ── PageRank ──────────────────────────────────────
    try:
        pagerank = nx.pagerank(G, alpha=0.85)
    except Exception:
        pagerank = {n: 1.0 for n in G.nodes}

    # ── Louvain community detection ───────────────────
    try:
        undirected  = G.to_undirected()
        communities = best_partition(undirected)
    except Exception:
        communities = {n: 0 for n in G.nodes}

    # ── Betweenness centrality ────────────────────────
    try:
        betweenness = nx.betweenness_centrality(G)
    except Exception:
        betweenness = {n: 0.0 for n in G.nodes}

    # ── Disconnected components ───────────────────────
    undirected_g = G.to_undirected()
    components   = list(nx.connected_components(undirected_g))

    # format nodes
    nodes = [
        {
            "id":          node,
            "pagerank":    round(pagerank.get(node, 0),    6),
            "betweenness": round(betweenness.get(node, 0), 6),
            "community":   communities.get(node, 0),
            "connections": G.degree(node)
        }
        for node in G.nodes
    ]

    # format edges
    formatted_edges = [
        {
            "source": e["source"],
            "target": e["target"],
            "weight": e["weight"]
        }
        for e in edges
        if e["source"] in G.nodes and e["target"] in G.nodes
    ]

    return {
        "nodes":       nodes,
        "edges":       formatted_edges,
        "communities": communities,
        "components":  len(components),
        "total_nodes": len(nodes),
        "total_edges": len(formatted_edges)
    }

# ─── 5. Topic Clusters ────────────────────────────────
@app.get("/api/clusters")
def clusters(
    n_clusters: int           = Query(default=5, ge=2, le=8),
    post_ids:   Optional[str] = None
):
    ids = post_ids.split(",") if post_ids else None
    try:
        return get_topic_clusters(
            n_clusters = n_clusters,
            post_ids   = ids
        )
    except Exception as exc:
        return {
            "error": f"Clustering failed: {exc}",
            "points": [],
            "clusters": [],
            "n_clusters": n_clusters,
            "total": 0
        }

# ─── 6. Ideology Map ──────────────────────────────────
@app.get("/api/ideology")
def ideology(
    subreddit:  Optional[str]   = None,
    date_from:  Optional[float] = None,
    date_to:    Optional[float] = None,
    post_ids:   Optional[str]   = None
):
    ids = post_ids.split(",") if post_ids else None
    return {
        "ideologies": get_ideology_breakdown(
            subreddit = subreddit,
            date_from = date_from,
            date_to   = date_to,
            post_ids  = ids
        )
    }

# ─── 7. Source Intelligence ───────────────────────────
@app.get("/api/sources")
def sources(
    subreddit:  Optional[str]   = None,
    ideology:   Optional[str]   = None,
    date_from:  Optional[float] = None,
    date_to:    Optional[float] = None,
    post_ids:   Optional[str]   = None,
    limit:      int             = 30
):
    ids = post_ids.split(",") if post_ids else None
    return {
        "domains": get_domain_breakdown(
            subreddit = subreddit,
            ideology  = ideology,
            date_from = date_from,
            date_to   = date_to,
            post_ids  = ids,
            limit     = limit
        )
    }

# ─── 8. Posts List ────────────────────────────────────
@app.get("/api/posts")
def posts(
    subreddit:  Optional[str]   = None,
    ideology:   Optional[str]   = None,
    date_from:  Optional[float] = None,
    date_to:    Optional[float] = None,
    limit:      int             = 100
):
    return {
        "posts": get_posts(
            subreddit = subreddit,
            ideology  = ideology,
            date_from = date_from,
            date_to   = date_to,
            limit     = limit
        )
    }

# ─── 9. Nomic Atlas Export ────────────────────────────
@app.get("/api/nomic-export")
def nomic_export():
    """
    Export embeddings metadata for Nomic Atlas visualization.
    Visit atlas.nomic.ai to upload and explore interactively.
    """
    from ml.embeddings import get_chroma_collection

    try:
        collection = get_chroma_collection()
        data = collection.get(
            limit   = 1000,
            include = ["documents", "metadatas"]
        )

        points = []
        for i in range(len(data["ids"])):
            points.append({
                "id":        data["ids"][i],
                "text":      data["documents"][i][:100],
                "subreddit": data["metadatas"][i].get("subreddit", ""),
                "flair":     data["metadatas"][i].get("flair",     ""),
                "score":     data["metadatas"][i].get("score",     0),
            })

        return {
            "total":   len(points),
            "points":  points,
            "message": "Upload to atlas.nomic.ai for interactive visualization"
        }
    except Exception as e:
        return {"error": str(e), "total": 0, "points": []}

# ─── Run ──────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host   = "0.0.0.0",
        port   = 8000,
        reload = True
    )