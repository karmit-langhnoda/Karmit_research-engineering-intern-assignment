import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent))

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
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
from agents.graph import run_agent

# ─── App Setup ────────────────────────────────────────────
app = FastAPI(title="Reddit Narrative Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── 1. Summary Stats ─────────────────────────────────────
@app.get("/api/stats")
def stats():
    return get_summary_stats()

# ─── 2. Trending Topics ───────────────────────────────────
@app.get("/api/trending")
def trending(
    subreddit:  Optional[str]   = None,
    ideology:   Optional[str]   = None,
    date_from:  Optional[float] = None,
    date_to:    Optional[float] = None,
):
    timeline   = get_timeline(
        subreddit  = subreddit,
        ideology   = ideology,
        date_from  = date_from,
        date_to    = date_to
    )
    subreddits = get_subreddit_breakdown(
        subreddit  = subreddit,
        ideology   = ideology,
        date_from  = date_from,
        date_to    = date_to
    )
    summary = summarize_timeline(timeline, query="overall activity")

    return {
        "timeline":   timeline,
        "subreddits": subreddits,
        "summary":    summary
    }

# ─── 3. Search ────────────────────────────────────────────
@app.get("/api/search")
def search(
    q:          str             = Query(default=""),
    subreddit:  Optional[str]   = None,
    ideology:   Optional[str]   = None,
    date_from:  Optional[float] = None,
    date_to:    Optional[float] = None,
    limit:      int             = 50
):
    # run full agent
    result = run_agent(
        query   = q,
        filters = {
            "subreddit": subreddit,
            "ideology":  ideology,
            "date_from": date_from,
            "date_to":   date_to,
        }
    )

    # if error (empty/short query)
    if result.get("error"):
        return {
            "posts":           [],
            "timeline":        [],
            "subreddits":      [],
            "ideologies":      [],
            "domains":         [],
            "summary":         result["error"],
            "related_queries": [],
            "total":           0,
            "error":           result["error"]
        }

    return {
        "posts":           result["posts"][:limit],
        "timeline":        result["timeline"],
        "subreddits":      result["subreddits"],
        "ideologies":      result["ideologies"],
        "domains":         result["domains"],
        "summary":         result["summary"],
        "related_queries": result["related_queries"],
        "total":           len(result["posts"]),
        "error":           None
    }

# ─── 4. Network Graph ─────────────────────────────────────
@app.get("/api/network")
def network(
    min_connections: int          = 1,
    post_ids:        Optional[str] = None,
    remove_node:     Optional[str] = None
):
    ids = post_ids.split(",") if post_ids else None

    edges = get_network_data(
        post_ids         = ids,
        min_connections  = min_connections
    )

    if not edges:
        return {
            "nodes": [],
            "edges": [],
            "communities": {}
        }

    # build NetworkX graph
    G = nx.DiGraph()
    for e in edges:
        G.add_edge(
            e["source"], e["target"],
            weight = e["weight"]
        )

    # remove node if requested (edge case testing)
    if remove_node and remove_node in G:
        G.remove_node(remove_node)

    # handle disconnected components — never crash
    if len(G.nodes) == 0:
        return {"nodes": [], "edges": [], "communities": {}}

    # PageRank scores
    try:
        pagerank = nx.pagerank(G, alpha=0.85)
    except Exception:
        pagerank = {n: 1.0 for n in G.nodes}

    # Louvain community detection
    try:
        undirected   = G.to_undirected()
        communities  = best_partition(undirected)
    except Exception:
        communities  = {n: 0 for n in G.nodes}

    # betweenness centrality
    try:
        betweenness = nx.betweenness_centrality(G)
    except Exception:
        betweenness = {n: 0.0 for n in G.nodes}

    # format nodes
    nodes = [
        {
            "id":          node,
            "pagerank":    round(pagerank.get(node, 0), 6),
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

    # disconnected components info
    undirected_g   = G.to_undirected()
    components     = list(nx.connected_components(undirected_g))

    return {
        "nodes":       nodes,
        "edges":       formatted_edges,
        "communities": communities,
        "components":  len(components),
        "total_nodes": len(nodes),
        "total_edges": len(formatted_edges)
    }

# ─── 5. Topic Clusters ────────────────────────────────────
@app.get("/api/clusters")
def clusters(
    n_clusters: int            = 10,
    post_ids:   Optional[str]  = None
):
    ids = post_ids.split(",") if post_ids else None

    result = get_topic_clusters(
        n_clusters = n_clusters,
        post_ids   = ids
    )

    return result

# ─── 6. Ideology Map ──────────────────────────────────────
@app.get("/api/ideology")
def ideology(
    subreddit:  Optional[str]   = None,
    date_from:  Optional[float] = None,
    date_to:    Optional[float] = None,
    post_ids:   Optional[str]   = None
):
    ids = post_ids.split(",") if post_ids else None

    ideologies = get_ideology_breakdown(
        subreddit  = subreddit,
        date_from  = date_from,
        date_to    = date_to,
        post_ids   = ids
    )

    return {"ideologies": ideologies}

# ─── 7. Source Intelligence ───────────────────────────────
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

    domains = get_domain_breakdown(
        subreddit  = subreddit,
        ideology   = ideology,
        date_from  = date_from,
        date_to    = date_to,
        post_ids   = ids,
        limit      = limit
    )

    return {"domains": domains}

# ─── 8. Posts List ────────────────────────────────────────
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
            subreddit  = subreddit,
            ideology   = ideology,
            date_from  = date_from,
            date_to    = date_to,
            limit      = limit
        )
    }

# ─── Run ──────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)