import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, Cell
} from 'recharts'
import { getIdeology, getSearch } from '../api'

const COLORS = [
  '#0b5fff','#0891b2','#0f766e','#d97706',
  '#dc2626','#7c3aed','#db2777','#0f766e',
  '#ea580c','#2563eb'
]

export default function IdeologyTab() {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState(null)
  const [compareA,   setCompareA]   = useState('')
  const [compareB,   setCompareB]   = useState('')
  const [compareData,setCompareData] = useState(null)
  const [comparing,  setComparing]  = useState(false)

  useEffect(() => {
    setLoading(true)
    getIdeology()
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  const handleCompare = async () => {
    if (!compareA || !compareB) return
    setComparing(true)
    try {
      const [resA, resB] = await Promise.all([
        getSearch({ q: compareA, ideology: compareA }),
        getSearch({ q: compareB, ideology: compareB }),
      ])
      setCompareData({ a: resA.data, b: resB.data })
    } finally {
      setComparing(false)
    }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#5b6b82' }}>
      ⏳ Loading ideology data...
    </div>
  )

  const ideologies = data?.ideologies || []
  const flairs     = ideologies.map(i => i.ideology).filter(Boolean)

  return (
    <div className="flex flex-col gap-6">

      {/* ── Overview Bar Chart ───────────────────── */}
      <Card title="🧭 Post Volume by Ideology">
        {ideologies.length === 0 ? (
          <div style={{ color: '#5b6b82', textAlign: 'center', padding: '40px' }}>
            No ideology flair data found in current selection
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={ideologies} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f0" />
              <XAxis
                type="number"
                stroke="#5b6b82"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="ideology"
                stroke="#5b6b82"
                tick={{ fontSize: 11 }}
                width={140}
              />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #dbe4f0',
                  borderRadius: '8px',
                  color: '#0f1b2d'
                }}
              />
              <Bar
                dataKey="post_count"
                name="Posts"
                radius={[0, 4, 4, 0]}
                onClick={(d) => setSelected(d.ideology)}
                style={{ cursor: 'pointer' }}
              >
                {ideologies.map((_, i) => (
                  <Cell
                    key={i}
                    fill={COLORS[i % COLORS.length]}
                    opacity={selected === ideologies[i].ideology ? 1 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <p style={{ color: '#5b6b82', fontSize: '12px', marginTop: '8px' }}>
          Click any bar to explore posts from that ideology group
        </p>
      </Card>

      {/* ── Selected Ideology Detail ─────────────── */}
      {selected && (
        <IdeologyDetail ideology={selected} onClose={() => setSelected(null)} />
      )}

      {/* ── Avg Score Comparison ─────────────────── */}
      <Card title="⭐ Average Engagement by Ideology">
        {ideologies.length === 0 ? (
          <div style={{ color: '#5b6b82', textAlign: 'center', padding: '40px' }}>
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ideologies} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f0" />
              <XAxis
                type="number"
                stroke="#5b6b82"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="ideology"
                stroke="#5b6b82"
                tick={{ fontSize: 11 }}
                width={140}
              />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #dbe4f0',
                  borderRadius: '8px',
                  color: '#0f1b2d'
                }}
              />
              <Bar
                dataKey="avg_score"
                name="Avg Score"
                radius={[0, 4, 4, 0]}
              >
                {ideologies.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.6} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── Compare Two Ideologies ───────────────── */}
      <Card title="⚔️ Compare Two Ideologies">
        <div className="flex gap-3 items-end flex-wrap mb-4">
          <div>
            <label style={{ color: '#5b6b82', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Ideology A
            </label>
            <select
              value={compareA}
              onChange={e => setCompareA(e.target.value)}
              style={{
                background: '#f8fafc',
                border: '1px solid #dbe4f0',
                color: '#0f1b2d',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                minWidth: '180px'
              }}
            >
              <option value="">Select ideology...</option>
              {flairs.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div style={{ color: '#5b6b82', fontSize: '18px', paddingBottom: '8px' }}>vs</div>

          <div>
            <label style={{ color: '#5b6b82', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Ideology B
            </label>
            <select
              value={compareB}
              onChange={e => setCompareB(e.target.value)}
              style={{
                background: '#f8fafc',
                border: '1px solid #dbe4f0',
                color: '#0f1b2d',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                minWidth: '180px'
              }}
            >
              <option value="">Select ideology...</option>
              {flairs.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCompare}
            disabled={!compareA || !compareB || comparing}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              background: compareA && compareB ? '#0b5fff' : '#dbe4f0',
              color: '#0f1b2d',
              border: 'none',
              cursor: compareA && compareB ? 'pointer' : 'not-allowed',
              fontSize: '13px'
            }}
          >
            {comparing ? 'Comparing...' : 'Compare'}
          </button>
        </div>

        {/* Compare Results */}
        {compareData && (
          <CompareView
            labelA={compareA}
            labelB={compareB}
            dataA={compareData.a}
            dataB={compareData.b}
          />
        )}
      </Card>

    </div>
  )
}

// ── Ideology Detail Panel ─────────────────────────────
function IdeologyDetail({ ideology, onClose }) {
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    getSearch({ q: ideology })
      .then(r => setDetail(r.data))
  }, [ideology])

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #0b5fff',
      borderRadius: '12px',
      padding: '20px'
    }}>
      <div className="flex justify-between items-center mb-4">
        <h3 style={{ color: '#0f1b2d', fontSize: '16px', fontWeight: '600' }}>
          📌 {ideology}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#5b6b82',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >✕</button>
      </div>

      {!detail ? (
        <div style={{ color: '#5b6b82' }}>Loading...</div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Summary */}
          {detail.summary && (
            <div style={{
              padding: '12px',
              background: '#f8fafc',
              borderLeft: '3px solid #0b5fff',
              borderRadius: '0 8px 8px 0',
              color: '#5b6b82',
              fontSize: '13px',
              lineHeight: '1.6'
            }}>
              {detail.summary}
            </div>
          )}

          {/* Top subreddits */}
          {detail.subreddits?.length > 0 && (
            <div>
              <div style={{ color: '#5b6b82', fontSize: '11px', marginBottom: '6px' }}>
                TOP SUBREDDITS
              </div>
              <div className="flex flex-wrap gap-2">
                {detail.subreddits.slice(0, 5).map(s => (
                  <span key={s.subreddit} style={{
                    padding: '3px 10px',
                    background: '#f8fafc',
                    border: '1px solid #dbe4f0',
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: '#0f1b2d'
                  }}>
                    r/{s.subreddit} ({s.post_count})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Top posts */}
          {detail.posts?.length > 0 && (
            <div>
              <div style={{ color: '#5b6b82', fontSize: '11px', marginBottom: '6px' }}>
                TOP POSTS
              </div>
              <div className="flex flex-col gap-2">
                {detail.posts.slice(0, 3).map(p => (
                  <div key={p.id} style={{
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#24364d'
                  }}>
                    <span style={{ color: '#0b5fff', marginRight: '8px' }}>
                      ▲ {p.score}
                    </span>
                    {p.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Compare View ──────────────────────────────────────
function CompareView({ labelA, labelB, dataA, dataB }) {
  const metrics = [
    {
      label: 'Total Posts',
      a: dataA.total,
      b: dataB.total,
    },
    {
      label: 'Top Subreddit',
      a: dataA.subreddits?.[0]?.subreddit || '—',
      b: dataB.subreddits?.[0]?.subreddit || '—',
    },
    {
      label: 'Top Domain',
      a: dataA.domains?.[0]?.domain || '—',
      b: dataB.domains?.[0]?.domain || '—',
    },
  ]

  return (
    <div className="flex flex-col gap-4">

      {/* Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px'
      }}>
        {metrics.map(({ label, a, b }) => (
          <div key={label} style={{
            background: '#f8fafc',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#5b6b82', fontSize: '11px', marginBottom: '8px' }}>
              {label}
            </div>
            <div className="flex justify-around">
              <div>
                <div style={{ color: '#0b5fff', fontSize: '13px', fontWeight: '600' }}>{a}</div>
                <div style={{ color: '#5b6b82', fontSize: '10px' }}>{labelA}</div>
              </div>
              <div style={{ color: '#dbe4f0' }}>|</div>
              <div>
                <div style={{ color: '#0f766e', fontSize: '13px', fontWeight: '600' }}>{b}</div>
                <div style={{ color: '#5b6b82', fontSize: '10px' }}>{labelB}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Side by side summaries */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {[
          { label: labelA, data: dataA, color: '#0b5fff' },
          { label: labelB, data: dataB, color: '#0f766e' },
        ].map(({ label, data, color }) => (
          <div key={label} style={{
            background: '#f8fafc',
            borderRadius: '8px',
            padding: '14px',
            borderLeft: `3px solid ${color}`
          }}>
            <div style={{ color, fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              {label}
            </div>
            <p style={{ color: '#5b6b82', fontSize: '12px', lineHeight: '1.6' }}>
              {data.summary || 'No summary available'}
            </p>
          </div>
        ))}
      </div>

    </div>
  )
}

// ── Card ──────────────────────────────────────────────
function Card({ title, children }) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #dbe4f0',
      borderRadius: '12px',
      padding: '20px'
    }}>
      <h2 style={{
        color: '#0f1b2d',
        fontSize: '16px',
        fontWeight: '600',
        marginBottom: '16px'
      }}>
        {title}
      </h2>
      {children}
    </div>
  )
}