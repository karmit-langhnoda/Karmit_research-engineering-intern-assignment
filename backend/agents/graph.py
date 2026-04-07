import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from langgraph.graph import StateGraph, END
from agents.nodes import (
    AgentState,
    query_understanding_node,
    retrieval_node,
    aggregation_node,
    synthesis_node
)

# ─── Build Graph ──────────────────────────────────────
def build_agent():
    graph = StateGraph(AgentState)

    # add all nodes
    graph.add_node("query_understanding", query_understanding_node)
    graph.add_node("retrieval",           retrieval_node)
    graph.add_node("aggregation",         aggregation_node)
    graph.add_node("synthesis",           synthesis_node)

    # define flow
    graph.set_entry_point("query_understanding")
    graph.add_edge("query_understanding", "retrieval")
    graph.add_edge("retrieval",           "aggregation")
    graph.add_edge("aggregation",         "synthesis")
    graph.add_edge("synthesis",           END)

    return graph.compile()

# ─── Run Agent ────────────────────────────────────────
def run_agent(query: str, filters: dict = {}):
    agent = build_agent()

    initial_state = AgentState(
        query            = query,
        post_ids         = [],
        posts            = [],
        timeline         = [],
        subreddits       = [],
        ideologies       = [],
        domains          = [],
        summary          = "",
        timeline_summary = "",
        related_queries  = [],
        error            = None,
        filters          = filters,
        core_topic       = ""
    )

    result = agent.invoke(initial_state)
    return result

# ─── Test ─────────────────────────────────────────────
if __name__ == "__main__":
    print("🤖 Testing LangGraph agent...")

    result = run_agent("resistance to authority")

    print(f"   Core topic     : {result['core_topic']}")
    print(f"   Posts found    : {len(result['posts'])}")
    print(f"   Timeline days  : {len(result['timeline'])}")
    print(f"   Top subreddit  : {result['subreddits'][0] if result['subreddits'] else 'none'}")
    print(f"   Summary        : {result['summary'][:120]}")
    print(f"   Timeline summ  : {result['timeline_summary'][:120]}")
    print(f"   Related queries: {result['related_queries']}")
    print(f"   Error          : {result['error']}")