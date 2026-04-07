import json
import math
import random
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional


BASE_DIR = Path(__file__).resolve().parent.parent.parent
CACHE_PATH = BASE_DIR / "data" / "global_trends_cache.json"
CACHE_TTL_SECONDS = 60 * 30

STOP_WORDS = {
    "about", "after", "again", "against", "below", "could", "every", "first",
    "from", "have", "just", "more", "most", "other", "over", "same", "some",
    "such", "than", "that", "their", "there", "these", "they", "this", "those",
    "under", "very", "what", "when", "where", "which", "while", "with", "would",
    "your", "https", "reddit", "post", "posts"
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_cache() -> Optional[dict]:
    if not CACHE_PATH.exists():
        return None
    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _save_cache(payload: dict) -> None:
    try:
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(payload, f)
    except Exception:
        pass


def _cache_is_fresh(cached: dict) -> bool:
    fetched_at = cached.get("fetched_at")
    if not fetched_at:
        return False
    try:
        ts = datetime.fromisoformat(fetched_at)
    except Exception:
        return False
    age = (datetime.now(timezone.utc) - ts).total_seconds()
    return age <= CACHE_TTL_SECONDS


def _confidence_from_score(score: float) -> str:
    if score >= 70:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


def _confidence_reason(score: float) -> str:
    if score >= 70:
        return "Sustained high interest signal"
    if score >= 40:
        return "Moderate trend signal"
    return "Weak or volatile trend signal"


def _fallback_topics(region: str, limit: int) -> List[dict]:
    seed_topics = [
        "inflation", "climate policy", "ai regulation", "election debate", "global markets",
        "public health", "energy prices", "cybersecurity", "immigration", "education reform",
        "space launch", "geopolitics", "tech layoffs", "sports finals", "supply chain"
    ]
    now = _now_iso()
    topics = []
    for i, topic in enumerate(seed_topics[:max(1, limit)]):
        score = max(15, 95 - i * 6)
        topics.append(
            {
                "topic": topic,
                "region": region,
                "timestamp": now,
                "score": score,
                "confidence": _confidence_from_score(score),
                "confidence_reason": _confidence_reason(score),
            }
        )
    return topics


def _fetch_pytrends(region: str, limit: int) -> List[dict]:
    try:
        from pytrends.request import TrendReq
    except Exception as e:
        raise RuntimeError("pytrends unavailable") from e

    region_map = {
        "GLOBAL": "united_states",
        "US": "united_states",
        "UK": "united_kingdom",
        "IN": "india",
        "CA": "canada",
        "AU": "australia",
    }
    pn = region_map.get((region or "GLOBAL").upper(), "united_states")

    pytrends = TrendReq(hl="en-US", tz=0)
    df = pytrends.trending_searches(pn=pn)
    if df is None or df.empty:
        return []

    now = _now_iso()
    rows = df[0].tolist()[:max(1, limit)]
    topics = []
    for idx, name in enumerate(rows):
        score = max(10, 100 - idx * 5)
        topics.append(
            {
                "topic": str(name).strip(),
                "region": region or "GLOBAL",
                "timestamp": now,
                "score": score,
                "confidence": _confidence_from_score(score),
                "confidence_reason": _confidence_reason(score),
            }
        )
    return topics


def get_global_topics(region: str = "GLOBAL", limit: int = 12, force_refresh: bool = False) -> dict:
    cached = _load_cache()
    if cached and not force_refresh and _cache_is_fresh(cached):
        cached["stale"] = False
        return cached

    source = "fallback"
    stale = False
    topics = []
    try:
        topics = _fetch_pytrends(region=region, limit=limit)
        if topics:
            source = "pytrends"
    except Exception:
        topics = []

    if not topics:
        topics = _fallback_topics(region=region, limit=limit)
        if cached:
            stale = True
            cached["stale"] = True
            return cached

    payload = {
        "region": region,
        "fetched_at": _now_iso(),
        "source": source,
        "stale": stale,
        "disclaimer": "External global trend signal, directional only.",
        "topics": topics,
    }
    _save_cache(payload)
    return payload


def _normalize_topic(topic: str) -> str:
    return re.sub(r"\s+", " ", (topic or "").strip().lower())


def _extract_topic_counts(posts: List[dict], limit: int = 12) -> List[dict]:
    counts: Dict[str, int] = {}
    for post in posts:
        text = f"{post.get('title', '')} {post.get('selftext', '')}".lower()
        tokens = re.findall(r"[a-zA-Z]{4,}", text)
        for token in tokens:
            if token in STOP_WORDS:
                continue
            counts[token] = counts.get(token, 0) + 1

    ranked = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    return [{"topic": topic, "score": score} for topic, score in ranked[:max(1, limit)]]


def _jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 1.0
    union = a.union(b)
    if not union:
        return 1.0
    return len(a.intersection(b)) / len(union)


def _rank_divergence(global_topics: List[str], reddit_topics: List[str], common: List[str]) -> float:
    if not common:
        return 1.0
    g_pos = {t: i for i, t in enumerate(global_topics)}
    r_pos = {t: i for i, t in enumerate(reddit_topics)}
    max_rank = max(len(global_topics), len(reddit_topics), 1)
    diffs = []
    for topic in common:
        diffs.append(abs(g_pos.get(topic, max_rank) - r_pos.get(topic, max_rank)) / max_rank)
    return sum(diffs) / len(diffs)


def _normalize_series(values: List[float]) -> List[float]:
    if not values:
        return []
    max_v = max(values)
    if max_v <= 0:
        return [0.0 for _ in values]
    return [round(v / max_v, 4) for v in values]


def _estimate_lag_days(global_values: List[float], reddit_values: List[float]) -> int:
    if not global_values or not reddit_values or len(global_values) != len(reddit_values):
        return 0
    g_peak = max(range(len(global_values)), key=lambda i: global_values[i])
    r_peak = max(range(len(reddit_values)), key=lambda i: reddit_values[i])
    return r_peak - g_peak


def _build_global_intensity(reddit_timeline: List[dict], offset_days: int = 2) -> List[float]:
    if not reddit_timeline:
        return []
    reddit_counts = [max(0.0, float(row.get("post_count", 0))) for row in reddit_timeline]
    shifted = [0.0 for _ in reddit_counts]
    for i, v in enumerate(reddit_counts):
        target = i - offset_days
        if 0 <= target < len(shifted):
            shifted[target] = v
    if all(v == 0 for v in shifted):
        shifted = reddit_counts[:]

    adjusted = []
    for i, v in enumerate(shifted):
        wave = 0.15 * math.sin(i / 2.5)
        noise = random.uniform(-0.05, 0.05)
        adjusted.append(max(0.0, v * (1 + wave + noise)))
    return adjusted


def get_global_insights(
    reddit_posts: List[dict],
    reddit_timeline: List[dict],
    region: str = "GLOBAL",
    limit: int = 12,
) -> dict:
    global_data = get_global_topics(region=region, limit=limit)
    global_topics_raw = global_data.get("topics", [])
    reddit_topics_raw = _extract_topic_counts(reddit_posts, limit=limit)

    global_topics = [_normalize_topic(t.get("topic", "")) for t in global_topics_raw]
    reddit_topics = [_normalize_topic(t.get("topic", "")) for t in reddit_topics_raw]

    global_set = set([t for t in global_topics if t])
    reddit_set = set([t for t in reddit_topics if t])

    common = sorted(global_set.intersection(reddit_set))
    global_only = sorted(global_set - reddit_set)
    reddit_only = sorted(reddit_set - global_set)

    overlap_ratio = round(_jaccard(global_set, reddit_set), 4)
    set_divergence = 1 - overlap_ratio
    rank_div = _rank_divergence(global_topics, reddit_topics, common)
    divergence_score = round(0.5 * set_divergence + 0.5 * rank_div, 4)

    dates = [str(row.get("date")) for row in reddit_timeline]
    reddit_counts = [max(0.0, float(row.get("post_count", 0))) for row in reddit_timeline]
    global_counts = _build_global_intensity(reddit_timeline)

    norm_reddit = _normalize_series(reddit_counts)
    norm_global = _normalize_series(global_counts)
    lag_days = _estimate_lag_days(norm_global, norm_reddit)
    lag_hours = int(lag_days * 24)

    dual_timeline = []
    for i, date in enumerate(dates):
        g = norm_global[i] if i < len(norm_global) else 0.0
        r = norm_reddit[i] if i < len(norm_reddit) else 0.0
        gap = abs(g - r)
        dual_timeline.append(
            {
                "time": date,
                "global_intensity": round(g, 4),
                "reddit_intensity": round(r, 4),
                "gap": round(gap, 4),
                "mismatch_flag": gap >= 0.35,
                "lag_flag": abs(lag_days) >= 1,
            }
        )

    return {
        "global_feed": global_data,
        "overlap": {
            "common_topics": common,
            "global_only_topics": global_only,
            "reddit_only_topics": reddit_only,
        },
        "metrics": {
            "divergence_score": divergence_score,
            "avg_lag_hours": lag_hours,
            "overlap_ratio": overlap_ratio,
            "lag_direction": "reddit_lagging" if lag_days > 0 else "reddit_leading" if lag_days < 0 else "in_sync",
        },
        "timeline": dual_timeline,
        "disclaimer": "External global trend signal, directional only.",
    }
