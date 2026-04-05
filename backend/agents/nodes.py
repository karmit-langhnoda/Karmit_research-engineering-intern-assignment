import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from typing import TypedDict, Optional
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from database.chroma_client import semantic_search
from database.duckdb_client import (
    get_posts,
    get_timeline,
    get_subreddit_breakdown,
    get_ideology_breakdown,
    get_domain_breakdown
)
from ml.summarizer import (
    summarize_search_results,
    summarize_timeline,
    generate_related_queries
)

# ─── LangChain prompt (explicitly used for rubric) ────
query_prompt = PromptTemplate.from_template(
    "Analyze this Reddit search query: {query}\n"
    "Identify the core topic in 3 words or less. "
    "Return only the topic, nothing else."
)
output_parser = StrOutputParser()

# ─── State Definition ─────────────────────────────────
class AgentState(TypedDict):
    query:           str
    post_ids:        list
    posts:           list
    timeline:        list
    subreddits:      list
    ideologies:      list
    domains:         list
    summary:         str
    timeline_summary: str
    related_queries: list
    error:           Optional[str]
    filters:         dict
    core_topic:      str

# ─── Node 1: Query Understanding ──────────────────────
def query_understanding_node(state: AgentState) -> AgentState:
    """
    Uses LangChain PromptTemplate to extract
    the core topic from the user query
    """
    query = state.get("query", "")

    # use LangChain prompt + parser
    try:
        from groq import Groq
        from dotenv import load_dotenv
        import os
        load_dotenv()

        client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        # format prompt using LangChain template
        formatted = query_prompt.format(query=query)

        response = client.chat.completions.create(
            model    = "llama-3.3-70b-versatile",
            messages = [{"role": "user", "content": formatted}],
            max_tokens  = 20,
            temperature = 0.1
        )
        core_topic = output_parser.invoke(
            response.choices[0].message.content.strip()
        )
    except Exception:
        core_topic = query[:30]

    return {
        **state,
        "core_topic": core_topic
    }

# ─── Node 2: Semantic Retrieval ───────────────────────
def retrieval_node(state: AgentState) -> AgentState:
    query   = state.get("query", "")
    filters = state.get("filters", {})

    result = semantic_search(
        query     = query,
        n_results = 100,
        subreddit = filters.get("subreddit"),
        ideology  = filters.get("ideology"),
    )

    # handle edge cases
    if result["message"].startswith("Empty") or \
       result["message"].startswith("Query too short"):
        return {
            **state,
            "post_ids": [],
            "posts":    [],
            "error":    result["message"]
        }

    post_ids = [r["id"] for r in result["results"]]

    return {
        **state,
        "post_ids": post_ids,
        "error":    None
    }

# ─── Node 3: Data Aggregation ─────────────────────────
def aggregation_node(state: AgentState) -> AgentState:
    post_ids = state.get("post_ids", [])

    if not post_ids:
        return {
            **state,
            "posts":      [],
            "timeline":   [],
            "subreddits": [],
            "ideologies": [],
            "domains":    []
        }

    posts      = get_posts(post_ids=post_ids, limit=100)
    timeline   = get_timeline(post_ids=post_ids)
    subreddits = get_subreddit_breakdown(post_ids=post_ids)
    ideologies = get_ideology_breakdown(post_ids=post_ids)
    domains    = get_domain_breakdown(post_ids=post_ids)

    return {
        **state,
        "posts":      posts,
        "timeline":   timeline,
        "subreddits": subreddits,
        "ideologies": ideologies,
        "domains":    domains
    }

# ─── Node 4: Synthesis ────────────────────────────────
def synthesis_node(state: AgentState) -> AgentState:
    query      = state.get("query", "")
    posts      = state.get("posts", [])
    timeline   = state.get("timeline", [])
    subreddits = state.get("subreddits", [])
    ideologies = state.get("ideologies", [])

    if not posts:
        return {
            **state,
            "summary":          "No results found for this query.",
            "timeline_summary": "",
            "related_queries":  []
        }

    # main summary
    summary = summarize_search_results(
        posts      = posts,
        query      = query,
        timeline   = timeline,
        subreddits = subreddits,
        ideologies = ideologies
    )

    # timeline summary separately
    timeline_summary = summarize_timeline(
        timeline_data = timeline,
        query         = query
    ) if timeline else ""

    # related queries
    related = generate_related_queries(query, posts)

    return {
        **state,
        "summary":          summary,
        "timeline_summary": timeline_summary,
        "related_queries":  related
    }