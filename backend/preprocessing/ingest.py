import duckdb
import json
import os
from pathlib import Path

# ─── Paths ────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_PATH = BASE_DIR / "data" / "data.jsonl"
DB_PATH   = BASE_DIR / "data" / "reddit.duckdb"

# ─── Connect to DuckDB ────────────────────────────────────
def get_connection():
    return duckdb.connect(str(DB_PATH))

# ─── Create Table ─────────────────────────────────────────
def create_table(con):
    con.execute("""
        CREATE TABLE IF NOT EXISTS posts (
            id                  VARCHAR PRIMARY KEY,
            title               VARCHAR,
            selftext            VARCHAR,
            author              VARCHAR,
            author_flair_text   VARCHAR,
            subreddit           VARCHAR,
            subreddit_subscribers INTEGER,
            score               INTEGER,
            upvote_ratio        FLOAT,
            num_comments        INTEGER,
            num_crossposts      INTEGER,
            created_utc         DOUBLE,
            domain              VARCHAR,
            url                 VARCHAR,
            permalink           VARCHAR,
            is_crosspost        BOOLEAN,
            crosspost_parent    VARCHAR,
            crosspost_origin_subreddit    VARCHAR,
            crosspost_origin_score        INTEGER,
            crosspost_origin_subscribers  INTEGER,
            full_text           VARCHAR
        )
    """)
    print("✅ Table created successfully")

# ─── Parse One Post ───────────────────────────────────────
def parse_post(raw: dict):
    try:
        d = raw.get("data", {})

        # skip posts with no title
        if not d.get("title"):
            return None

        # crosspost info
        crosspost_list = d.get("crosspost_parent_list", [])
        is_crosspost   = len(crosspost_list) > 0
        origin         = crosspost_list[0] if is_crosspost else {}

        # combine title + body for full text search
        title    = d.get("title", "") or ""
        selftext = d.get("selftext", "") or ""
        full_text = f"{title} {selftext}".strip()

        return {
            "id":                   d.get("id", ""),
            "title":                title,
            "selftext":             selftext,
            "author":               d.get("author", ""),
            "author_flair_text":    d.get("author_flair_text", None),
            "subreddit":            d.get("subreddit", ""),
            "subreddit_subscribers": d.get("subreddit_subscribers", 0),
            "score":                d.get("score", 0),
            "upvote_ratio":         d.get("upvote_ratio", 0.0),
            "num_comments":         d.get("num_comments", 0),
            "num_crossposts":       d.get("num_crossposts", 0),
            "created_utc":          d.get("created_utc", 0.0),
            "domain":               d.get("domain", ""),
            "url":                  d.get("url_overridden_by_dest", d.get("url", "")),
            "permalink":            d.get("permalink", ""),
            "is_crosspost":         is_crosspost,
            "crosspost_parent":     d.get("crosspost_parent", None),
            "crosspost_origin_subreddit":   origin.get("subreddit", None),
            "crosspost_origin_score":       origin.get("score", None),
            "crosspost_origin_subscribers": origin.get("subreddit_subscribers", None),
            "full_text":            full_text,
        }
    except Exception as e:
        print(f"⚠️  Skipping post due to error: {e}")
        return None

# ─── Load All Posts ───────────────────────────────────────
def ingest(batch_size: int = 1000):
    if not DATA_PATH.exists():
        print(f"❌ Dataset not found at {DATA_PATH}")
        return

    con = get_connection()
    create_table(con)

    total   = 0
    skipped = 0
    batch   = []

    print(f"📂 Reading from {DATA_PATH}")

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue

            try:
                raw  = json.loads(line)
                post = parse_post(raw)

                if post is None:
                    skipped += 1
                    continue

                batch.append(post)

                # insert in batches of 1000
                if len(batch) >= batch_size:
                    insert_batch(con, batch)
                    total += len(batch)
                    print(f"  ✅ Inserted {total} posts so far...")
                    batch = []

            except json.JSONDecodeError as e:
                print(f"  ⚠️  Line {line_num}: JSON error — {e}")
                skipped += 1
                continue

    # insert remaining posts
    if batch:
        insert_batch(con, batch)
        total += len(batch)

    print(f"\n🎉 Ingestion complete!")
    print(f"   Total inserted : {total}")
    print(f"   Total skipped  : {skipped}")

    # verify
    count = con.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
    print(f"   Posts in DB    : {count}")

    con.close()

# ─── Batch Insert ─────────────────────────────────────────
def insert_batch(con, batch: list):
    con.executemany("""
        INSERT OR IGNORE INTO posts VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    """, [
        (
            p["id"], p["title"], p["selftext"],
            p["author"], p["author_flair_text"],
            p["subreddit"], p["subreddit_subscribers"],
            p["score"], p["upvote_ratio"],
            p["num_comments"], p["num_crossposts"],
            p["created_utc"], p["domain"],
            p["url"], p["permalink"],
            p["is_crosspost"], p["crosspost_parent"],
            p["crosspost_origin_subreddit"],
            p["crosspost_origin_score"],
            p["crosspost_origin_subscribers"],
            p["full_text"]
        )
        for p in batch
    ])

# ─── Run ──────────────────────────────────────────────────
if __name__ == "__main__":
    ingest()