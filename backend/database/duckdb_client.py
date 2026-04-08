import duckdb
import os
from pathlib import Path
from typing import Optional

# ─── Path ─────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent


def get_db_path() -> Path:
    env_path = os.getenv("DUCKDB_PATH")
    if env_path:
        return Path(env_path).expanduser().resolve()
    return (BASE_DIR / "data" / "reddit.duckdb").resolve()


def ensure_posts_table(con, db_path: Path):
    try:
        con.execute("SELECT 1 FROM posts LIMIT 1")
    except Exception as exc:
        tables = [r[0] for r in con.execute("SHOW TABLES").fetchall()]
        table_list = ", ".join(tables) if tables else "<none>"
        raise RuntimeError(
            f"DuckDB at '{db_path}' does not contain required table 'posts'. "
            f"Available tables: {table_list}."
        ) from exc

# ─── Connection ───────────────────────────────────────────
def get_connection():
    db_path = get_db_path()

    if not db_path.exists():
        raise FileNotFoundError(
            f"DuckDB file not found at '{db_path}'. "
            "Set DUCKDB_PATH or mount /app/data with reddit.duckdb."
        )

    # Use read_only to avoid accidental creation of empty DB files in production.
    con = duckdb.connect(str(db_path), read_only=True)
    ensure_posts_table(con, db_path)
    return con

# ─── Get All Posts (with filters) ─────────────────────────
def get_posts(
    subreddit: Optional[str]  = None,
    ideology:  Optional[str]  = None,
    date_from: Optional[float] = None,
    date_to:   Optional[float] = None,
    post_ids:  Optional[list]  = None,
    limit:     int             = 1000
):
    con    = get_connection()
    where  = []
    params = []

    if subreddit:
        where.append("subreddit = ?")
        params.append(subreddit)

    if ideology:
        where.append("author_flair_text = ?")
        params.append(ideology)

    if date_from:
        where.append("created_utc >= ?")
        params.append(date_from)

    if date_to:
        where.append("created_utc <= ?")
        params.append(date_to)

    if post_ids:
        placeholders = ",".join(["?" for _ in post_ids])
        where.append(f"id IN ({placeholders})")
        params.extend(post_ids)

    query = "SELECT * FROM posts"
    if where:
        query += " WHERE " + " AND ".join(where)
    query += f" ORDER BY score DESC LIMIT {limit}"

    rows = con.execute(query, params).fetchall()
    cols = [d[0] for d in con.execute(query, params).description]
    con.close()

    return [dict(zip(cols, row)) for row in rows]

# ─── Get Timeline (posts per day) ─────────────────────────
def get_timeline(
    subreddit: Optional[str]   = None,
    ideology:  Optional[str]   = None,
    date_from: Optional[float] = None,
    date_to:   Optional[float] = None,
    post_ids:  Optional[list]  = None
):
    con    = get_connection()
    where  = []
    params = []

    if subreddit:
        where.append("subreddit = ?")
        params.append(subreddit)

    if ideology:
        where.append("author_flair_text = ?")
        params.append(ideology)

    if date_from:
        where.append("created_utc >= ?")
        params.append(date_from)

    if date_to:
        where.append("created_utc <= ?")
        params.append(date_to)

    if post_ids:
        placeholders = ",".join(["?" for _ in post_ids])
        where.append(f"id IN ({placeholders})")
        params.extend(post_ids)

    query = """
        SELECT
            CAST(epoch_ms(CAST(created_utc * 1000 AS BIGINT)) AS DATE) AS date,
            COUNT(*) as post_count,
            AVG(score) as avg_score
        FROM posts
    """
    if where:
        query += " WHERE " + " AND ".join(where)
    query += " GROUP BY date ORDER BY date"

    rows = con.execute(query, params).fetchall()
    con.close()

    return [
        {
            "date":       str(row[0]),
            "post_count": row[1],
            "avg_score":  round(row[2], 2)
        }
        for row in rows
    ]

# ─── Get Subreddit Breakdown ──────────────────────────────
def get_subreddit_breakdown(
    post_ids:  Optional[list]  = None,
    subreddit: Optional[str]   = None,
    ideology:  Optional[str]   = None,
    date_from: Optional[float] = None,
    date_to:   Optional[float] = None,
    limit: int = 20
):
    con    = get_connection()
    where  = []
    params = []
    if subreddit:
        where.append("subreddit = ?")
        params.append(subreddit)
    if ideology:
        where.append("author_flair_text = ?")
        params.append(ideology)

    if date_from:
        where.append("created_utc >= ?")
        params.append(date_from)

    if date_to:
        where.append("created_utc <= ?")
        params.append(date_to)

    if post_ids:
        placeholders = ",".join(["?" for _ in post_ids])
        where.append(f"id IN ({placeholders})")
        params.extend(post_ids)

    query = """
        SELECT
            subreddit,
            COUNT(*)    AS post_count,
            AVG(score)  AS avg_score,
            SUM(num_comments) AS total_comments
        FROM posts
    """
    if where:
        query += " WHERE " + " AND ".join(where)
    query += f" GROUP BY subreddit ORDER BY post_count DESC LIMIT {limit}"

    rows = con.execute(query, params).fetchall()
    con.close()

    return [
        {
            "subreddit":      row[0],
            "post_count":     row[1],
            "avg_score":      round(row[2], 2),
            "total_comments": row[3]
        }
        for row in rows
    ]

# ─── Get Ideology Breakdown ───────────────────────────────
def get_ideology_breakdown(
    post_ids:  Optional[list]  = None,
    subreddit: Optional[str]   = None,
    date_from: Optional[float] = None,
    date_to:   Optional[float] = None
):
    con    = get_connection()
    where  = ["author_flair_text IS NOT NULL"]
    params = []

    if subreddit:
        where.append("subreddit = ?")
        params.append(subreddit)

    if date_from:
        where.append("created_utc >= ?")
        params.append(date_from)

    if date_to:
        where.append("created_utc <= ?")
        params.append(date_to)

    if post_ids:
        placeholders = ",".join(["?" for _ in post_ids])
        where.append(f"id IN ({placeholders})")
        params.extend(post_ids)

    query = """
        SELECT
            author_flair_text,
            COUNT(*)   AS post_count,
            AVG(score) AS avg_score
        FROM posts
        WHERE """ + " AND ".join(where) + """
        GROUP BY author_flair_text
        ORDER BY post_count DESC
        LIMIT 20
    """

    rows = con.execute(query, params).fetchall()
    con.close()

    return [
        {
            "ideology":   row[0],
            "post_count": row[1],
            "avg_score":  round(row[2], 2)
        }
        for row in rows
    ]

# ─── Get Domain Breakdown ─────────────────────────────────
def get_domain_breakdown(
    post_ids:  Optional[list]  = None,
    subreddit: Optional[str]   = None,
    ideology:  Optional[str]   = None,
    date_from: Optional[float] = None,
    date_to:   Optional[float] = None,
    limit: int = 20
):
    con    = get_connection()
    where  = [
        "domain IS NOT NULL",
        "domain != ''",
        "domain NOT LIKE 'self.%'"
    ]
    params = []

    if subreddit:
        where.append("subreddit = ?")
        params.append(subreddit)

    if ideology:
        where.append("author_flair_text = ?")
        params.append(ideology)

    if date_from:
        where.append("created_utc >= ?")
        params.append(date_from)

    if date_to:
        where.append("created_utc <= ?")
        params.append(date_to)

    if post_ids:
        placeholders = ",".join(["?" for _ in post_ids])
        where.append(f"id IN ({placeholders})")
        params.extend(post_ids)

    query = """
        SELECT
            domain,
            COUNT(*)   AS share_count,
            AVG(score) AS avg_score
        FROM posts
        WHERE """ + " AND ".join(where) + """
        GROUP BY domain
        ORDER BY share_count DESC
        LIMIT ?
    """
    params.append(limit)

    rows = con.execute(query, params).fetchall()
    con.close()

    return [
        {
            "domain":      row[0],
            "share_count": row[1],
            "avg_score":   round(row[2], 2)
        }
        for row in rows
    ]

# ─── Get Network Data (crosspost connections) ─────────────
def get_network_data(
    post_ids:  Optional[list] = None,
    min_connections: int      = 1
):
    con    = get_connection()
    where  = [
        "is_crosspost = true",
        "crosspost_origin_subreddit IS NOT NULL"
    ]
    params = []

    if post_ids:
        placeholders = ",".join(["?" for _ in post_ids])
        where.append(f"id IN ({placeholders})")
        params.extend(post_ids)

    query = """
        SELECT
            crosspost_origin_subreddit AS source,
            subreddit                  AS target,
            COUNT(*)                   AS weight,
            AVG(score)                 AS avg_score
        FROM posts
        WHERE """ + " AND ".join(where) + """
        GROUP BY source, target
        HAVING COUNT(*) >= ?
        ORDER BY weight DESC
    """
    params.append(min_connections)

    rows = con.execute(query, params).fetchall()
    con.close()

    return [
        {
            "source":    row[0],
            "target":    row[1],
            "weight":    row[2],
            "avg_score": round(row[3], 2)
        }
        for row in rows
    ]

# ─── Get Summary Stats ────────────────────────────────────
def get_summary_stats():
    con = get_connection()

    total_posts = con.execute(
        "SELECT COUNT(*) FROM posts"
    ).fetchone()[0]

    total_subreddits = con.execute(
        "SELECT COUNT(DISTINCT subreddit) FROM posts"
    ).fetchone()[0]

    total_authors = con.execute(
        "SELECT COUNT(DISTINCT author) FROM posts"
    ).fetchone()[0]

    total_domains = con.execute(
        """SELECT COUNT(DISTINCT domain) FROM posts
           WHERE domain IS NOT NULL
           AND domain != ''
           AND domain NOT LIKE 'self.%'"""
    ).fetchone()[0]

    date_range = con.execute(
        "SELECT MIN(created_utc), MAX(created_utc) FROM posts"
    ).fetchone()

    con.close()

    return {
        "total_posts":       total_posts,
        "total_subreddits":  total_subreddits,
        "total_authors":     total_authors,
        "total_domains":     total_domains,
        "date_from":         date_range[0],
        "date_to":           date_range[1]
    }

# ─── Quick Test ───────────────────────────────────────────
if __name__ == "__main__":
    print("📊 Summary Stats:")
    stats = get_summary_stats()
    for k, v in stats.items():
        print(f"   {k}: {v}")

    print("\n📋 Top 3 Subreddits:")
    for s in get_subreddit_breakdown(limit=3):
        print(f"   {s}")

    print("\n📈 Timeline (first 3 days):")
    for t in get_timeline()[:3]:
        print(f"   {t}")

    print("\n🔗 Top Domains:")
    for d in get_domain_breakdown(limit=3):
        print(f"   {d}")