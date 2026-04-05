import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ── Model to use ──────────────────────────────────────
MODEL = "llama-3.3-70b-versatile"

# ─── Generate Timeline Summary ────────────────────────
def summarize_timeline(timeline_data: list, query: str = "") -> str:
    if not timeline_data or len(timeline_data) == 0:
        return "No timeline data available for this query."

    try:
        peak  = max(timeline_data, key=lambda x: x["post_count"])
        total = sum(x["post_count"] for x in timeline_data)
        days  = len(timeline_data)

        prompt = f"""
You are analyzing Reddit post activity data for a non-technical audience.

Query: "{query if query else 'all posts'}"
Total posts: {total}
Time period: {days} days
Peak activity: {peak['post_count']} posts on {peak['date']}
Sample data: {timeline_data[:5]}

Write exactly 2 sentences:
1. What the overall trend shows
2. When and why activity was highest

Use simple language. No technical terms. No bullet points.
"""
        response = client.chat.completions.create(
            model    = MODEL,
            messages = [{"role": "user", "content": prompt}],
            max_tokens  = 150,
            temperature = 0.3
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"⚠️ summarize_timeline error: {e}")
        peak = max(timeline_data, key=lambda x: x["post_count"])
        return f"Activity peaked on {peak['date']} with {peak['post_count']} posts across {len(timeline_data)} days."

# ─── Generate Search Summary ──────────────────────────
def summarize_search_results(
    posts:      list,
    query:      str,
    timeline:   list = None,
    subreddits: list = None,
    ideologies: list = None
) -> str:
    if not posts or len(posts) == 0:
        return "No posts found matching this query."

    try:
        top_posts      = [p.get("title", p.get("text", ""))[:80] for p in posts[:5]]
        top_subreddits = [s["subreddit"] for s in (subreddits or [])[:3]]
        top_ideologies = [i["ideology"]  for i in (ideologies or [])[:3]]

        prompt = f"""
You are an investigative analyst summarizing Reddit data for a journalist.

Query: "{query}"
Posts found: {len(posts)}
Top subreddits: {top_subreddits}
Top ideologies: {top_ideologies}
Sample posts: {top_posts}

Write exactly 2-3 sentences explaining:
1. What people are saying about this topic
2. Which communities are most active
3. Any notable pattern or framing

Use simple language. Be specific. No bullet points.
"""
        response = client.chat.completions.create(
            model       = MODEL,
            messages    = [{"role": "user", "content": prompt}],
            max_tokens  = 200,
            temperature = 0.3
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"⚠️ summarize_search_results error: {e}")
        top_subreddits = [s["subreddit"] for s in (subreddits or [])[:1]]
        return f"Found {len(posts)} posts about '{query}'. Most active in {top_subreddits[0] if top_subreddits else 'various'} communities."

# ─── Generate Related Queries ─────────────────────────
def generate_related_queries(query: str, posts: list) -> list:
    if not query or not posts:
        return []

    try:
        sample = [p.get("title", p.get("text", ""))[:60] for p in posts[:5]]

        prompt = f"""
Based on this Reddit search query: "{query}"
And these sample results: {sample}

Suggest exactly 3 related search queries a researcher might want to explore next.
Return ONLY a JSON array of 3 strings. Nothing else. No markdown. No explanation.
Example: ["query one", "query two", "query three"]
"""
        response = client.chat.completions.create(
            model       = MODEL,
            messages    = [{"role": "user", "content": prompt}],
            max_tokens  = 100,
            temperature = 0.5
        )
        text = response.choices[0].message.content.strip()
        # clean any markdown backticks if present
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)

    except Exception as e:
        print(f"⚠️ generate_related_queries error: {e}")
        return [
            f"{query} community discussion",
            f"{query} recent posts",
            f"{query} debate"
        ]

# ─── Test ─────────────────────────────────────────────
if __name__ == "__main__":
    print("🔄 Testing Groq summarizer...")

    sample_timeline = [
        {"date": "2025-02-01", "post_count": 12, "avg_score": 8},
        {"date": "2025-02-17", "post_count": 47, "avg_score": 23},
        {"date": "2025-02-18", "post_count": 31, "avg_score": 15},
    ]

    print("\n📊 Timeline Summary:")
    print(summarize_timeline(sample_timeline, "anarchism"))

    print("\n🔍 Search Summary:")
    sample_posts = [
        {"title": "Not paying student loans as resistance"},
        {"title": "Direct action against debt"}
    ]
    print(summarize_search_results(
        posts      = sample_posts,
        query      = "student loan resistance",
        subreddits = [{"subreddit": "Anarchism"}],
        ideologies = [{"ideology": "anarcho-nihilist"}]
    ))

    print("\n💡 Related Queries:")
    print(generate_related_queries("student loan resistance", sample_posts))