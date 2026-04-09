import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import useStore from '../store/useStore'
import { getSearch } from '../api'

export default function SearchPanel() {
  const {
    searchQuery,
    searchResults,
    clearSearch
  } = useStore()

  if (!searchResults) return null

  const {
    posts             = [],
    timeline          = [],
    summary           = '',
    timeline_summary  = '',
    related_queries   = [],
    total             = 0,
    error             = null,
    core_topic        = ''
  } = searchResults

  return (
    <div className="flex flex-col gap-6">

      {/* ── Search Header ────────────────────────── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #dbe4f0',
        borderRadius: '12px',
        padding: '16px'
      }}>
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <h2 style={{ color: '#0f1b2d', fontSize: '18px', fontWeight: '700' }}>
              🔍 "{searchQuery}"
            </h2>
            <p style={{ color: '#5b6b82', fontSize: '13px', marginTop: '4px' }}>
              {error ? error : `${total} posts found`}
              {core_topic && (
                <span style={{ color: '#0891b2', marginLeft: '8px' }}>
                  · Core topic: {core_topic}
                </span>
              )}
              {searchResults.translated && (
                <span style={{ color: '#0b5fff', marginLeft: '8px' }}>
                  · Translated from original query
                </span>
              )}
            </p>
          </div>

          <button
            onClick={clearSearch}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: '#c5d2e6',
              color: '#0f1b2d',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            ← Back to Dashboard
          </button>
        </div>

      </div>

      {/* ── Error State ──────────────────────────── */}
      {error && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #dc2626',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <div style={{ color: '#b42318', fontSize: '16px' }}>{error}</div>
          <div style={{ color: '#5b6b82', fontSize: '13px', marginTop: '8px' }}>
            Try a longer or different search query
          </div>
        </div>
      )}

      {/* ── No Results ───────────────────────────── */}
      {!error && total === 0 && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #dbe4f0',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
          <div style={{ color: '#0f1b2d', fontSize: '16px' }}>No results found</div>
          <div style={{ color: '#5b6b82', fontSize: '13px', marginTop: '8px' }}>
            Try rephrasing your query
          </div>
        </div>
      )}

      {/* ── Results ──────────────────────────────── */}
      {!error && total > 0 && (
        <>
          {/* AI Summary */}
          {summary && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #dbe4f0',
              borderRadius: '12px',
              padding: '16px',
              borderLeft: '4px solid #0b5fff'
            }}>
              <div style={{ color: '#0b5fff', fontSize: '11px', fontWeight: '600', marginBottom: '6px' }}>
                AI INVESTIGATION SUMMARY
              </div>
              <p style={{ color: '#24364d', fontSize: '14px', lineHeight: '1.7' }}>
                {summary}
              </p>

              {/* Related queries */}
              {related_queries.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ color: '#5b6b82', fontSize: '11px', marginBottom: '6px' }}>
                    EXPLORE NEXT:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {related_queries.map((q, i) => (
                      <RelatedQuery key={i} query={q} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #dbe4f0',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <h3 style={{
                color: '#0f1b2d',
                fontSize: '15px',
                fontWeight: '600',
                marginBottom: '16px'
              }}>
                📈 When were these posts made?
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="searchColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0b5fff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0b5fff" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f0" />
                  <XAxis
                    dataKey="date"
                    stroke="#5b6b82"
                    tick={{ fontSize: 10 }}
                    tickFormatter={d => d.slice(5)}
                    interval={Math.floor(timeline.length / 6)}
                  />
                  <YAxis stroke="#5b6b82" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #dbe4f0',
                      borderRadius: '8px',
                      color: '#0f1b2d'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="post_count"
                    stroke="#0b5fff"
                    fill="url(#searchColor)"
                    strokeWidth={2}
                    name="Posts"
                  />
                </AreaChart>
              </ResponsiveContainer>

              {/* ── AI Summary under timeline ─────── */}
              {timeline_summary && (
                <div style={{
                  marginTop:    '12px',
                  padding:      '12px 16px',
                  background:   '#f8fafc',
                  borderLeft:   '3px solid #0b5fff',
                  borderRadius: '0 8px 8px 0',
                }}>
                  <span style={{ color: '#0b5fff', fontSize: '12px', fontWeight: '600' }}>
                    AI SUMMARY
                  </span>
                  <p style={{ color: '#5b6b82', fontSize: '13px', marginTop: '4px', lineHeight: '1.6' }}>
                    {timeline_summary}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Posts List */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #dbe4f0',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h3 style={{
              color: '#0f1b2d',
              fontSize: '15px',
              fontWeight: '600',
              marginBottom: '16px'
            }}>
              📋 All {total} Posts
            </h3>
            <div className="flex flex-col gap-2">
              {posts.map(post => (
                <PostRow key={post.id} post={post} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Related Query Button ──────────────────────────────
function RelatedQuery({ query }) {
  const { setSearchResults, setIsSearching, setSearchQuery } = useStore()

  const handleClick = async () => {
    setSearchQuery(query)
    setIsSearching(true)
    try {
      const res = await getSearch({ q: query })
      setSearchResults(res.data)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      style={{
        padding: '4px 12px',
        borderRadius: '20px',
        background: '#f8fafc',
        color: '#0b5fff',
        border: '1px solid #0b5fff',
        fontSize: '12px',
        cursor: 'pointer'
      }}
    >
      → {query}
    </button>
  )
}

// ── Post Row ──────────────────────────────────────────
function PostRow({ post }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        padding: '12px',
        background: '#f8fafc',
        borderRadius: '8px',
        cursor: 'pointer',
        border: '1px solid transparent',
        transition: 'border 0.2s'
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#dbe4f0'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
    >
      <div className="flex gap-3 items-start">
        <div style={{
          minWidth: '48px',
          textAlign: 'center',
          padding: '4px',
          background: '#ffffff',
          borderRadius: '6px'
        }}>
          <div style={{ color: '#0b5fff', fontWeight: '700', fontSize: '14px' }}>
            ▲{post.score}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            color: '#0f1b2d',
            fontSize: '13px',
            fontWeight: '500',
            lineHeight: '1.4'
          }}>
            {post.title}
          </div>
          <div style={{ color: '#5b6b82', fontSize: '11px', marginTop: '4px' }}>
            r/{post.subreddit} · u/{post.author}
            {post.author_flair_text && (
              <span style={{
                marginLeft: '6px',
                padding: '1px 6px',
                background: '#ffffff',
                borderRadius: '10px',
                color: '#0b5fff'
              }}>
                {post.author_flair_text}
              </span>
            )}
            · {post.num_comments} comments
          </div>

          {expanded && post.selftext && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              background: '#ffffff',
              borderRadius: '6px',
              color: '#5b6b82',
              fontSize: '12px',
              lineHeight: '1.6'
            }}>
              {post.selftext.slice(0, 400)}
              {post.selftext.length > 400 && '...'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}