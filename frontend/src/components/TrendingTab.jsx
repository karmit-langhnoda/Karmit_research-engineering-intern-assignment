import { useEffect, useState } from 'react'
import TopicCluster from './TopicCluster'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line
} from 'recharts'
import { getTrending, getGlobalInsights } from '../api'
import useStore from '../store/useStore'

const COLORS = [
  '#0b5fff','#0891b2','#0f766e','#d97706',
  '#dc2626','#7c3aed','#db2777','#0f766e',
  '#ea580c','#2563eb'
]

export default function TrendingTab() {
  const { filters } = useStore()
  const [data,          setData]          = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [globalData,    setGlobalData]    = useState(null)
  const [globalLoading, setGlobalLoading] = useState(true)
  const [view,          setView]          = useState('timeline')

  useEffect(() => {
    setLoading(true)
    getTrending(filters)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [filters])

  useEffect(() => {
    setGlobalLoading(true)
    getGlobalInsights({ ...filters, region: 'GLOBAL', limit: 12 })
      .then(r => setGlobalData(r.data))
      .catch(() => setGlobalData(null))
      .finally(() => setGlobalLoading(false))
  }, [filters])

  if (loading) return <LoadingState />
  if (!data)   return <ErrorState />

  return (
    <div className="flex flex-col gap-6">

      {/* ── View Toggle ──────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[
          { id: 'timeline', label: '📈 Timeline View'     },
          { id: 'clusters', label: '🗺️ Topic Cluster Map' },
          { id: 'global',   label: '🌍 Global Intelligence' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            style={{
              padding:      '6px 16px',
              borderRadius: '6px',
              background:   view === id ? '#0b5fff' : '#ffffff',
              color:        view === id ? '#fff' : '#5b6b82',
              border:       '1px solid #dbe4f0',
              cursor:       'pointer',
              fontSize:     '13px'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Timeline View ────────────────────────── */}
      {view === 'timeline' && (
        <>
          {/* Timeline Chart */}
          <Card title="📈 Post Activity Over Time">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.timeline}>
                <defs>
                  <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0b5fff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0b5fff" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f0" />
                <XAxis
                  dataKey="date"
                  stroke="#5b6b82"
                  tick={{ fontSize: 11 }}
                  tickFormatter={d => d.slice(5)}
                  interval={Math.floor(data.timeline.length / 8)}
                />
                <YAxis stroke="#5b6b82" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background:   '#ffffff',
                    border:       '1px solid #dbe4f0',
                    borderRadius: '8px',
                    color:        '#0f1b2d'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="post_count"
                  stroke="#0b5fff"
                  fill="url(#colorPosts)"
                  strokeWidth={2}
                  name="Posts"
                />
              </AreaChart>
            </ResponsiveContainer>
            {data.summary && <AISummary text={data.summary} />}
          </Card>

          {/* Avg Score Timeline */}
          <Card title="⭐ Average Post Score Over Time">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.timeline}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0f766e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f0" />
                <XAxis
                  dataKey="date"
                  stroke="#5b6b82"
                  tick={{ fontSize: 11 }}
                  tickFormatter={d => d.slice(5)}
                  interval={Math.floor(data.timeline.length / 8)}
                />
                <YAxis stroke="#5b6b82" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background:   '#ffffff',
                    border:       '1px solid #dbe4f0',
                    borderRadius: '8px',
                    color:        '#0f1b2d'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="avg_score"
                  stroke="#0f766e"
                  fill="url(#colorScore)"
                  strokeWidth={2}
                  name="Avg Score"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Subreddit Breakdown */}
          <Card title="🏘️ Most Active Communities">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.subreddits}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f0" />
                <XAxis
                  type="number"
                  stroke="#5b6b82"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="subreddit"
                  stroke="#5b6b82"
                  tick={{ fontSize: 11 }}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    background:   '#ffffff',
                    border:       '1px solid #dbe4f0',
                    borderRadius: '8px',
                    color:        '#0f1b2d'
                  }}
                />
                <Bar dataKey="post_count" name="Posts" radius={[0, 4, 4, 0]}>
                  {data.subreddits.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {/* ── Cluster View ─────────────────────────── */}
      {view === 'clusters' && <TopicCluster />}

      {/* ── Global Intelligence ──────────────────── */}
      {view === 'global' && (
        <GlobalIntelligence
          data={globalData}
          loading={globalLoading}
        />
      )}

    </div>
  )
}

function GlobalIntelligence({ data, loading }) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#5b6b82' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
        Loading global intelligence...
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#5b6b82' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
        Could not load global intelligence data
      </div>
    )
  }

  const feed = data.global_feed || {}
  const topics = feed.topics || []
  const metrics = data.metrics || {}
  const timeline = data.timeline || []

  return (
    <div className="flex flex-col gap-6">
      <div style={{
        background: '#fff8e6',
        border: '1px solid #e7c66b',
        borderRadius: '12px',
        padding: '14px 16px'
      }}>
        <div style={{ color: '#8a5a00', fontWeight: '700', fontSize: '12px' }}>
          EXTERNAL SIGNAL DISCLAIMER
        </div>
        <div style={{ color: '#8a5a00', marginTop: '4px', fontSize: '13px' }}>
          {data.disclaimer || 'External global trend signal, directional only.'}
        </div>
      </div>

      <Card title="📉 Dual-layer Timeline (Global vs Reddit)">
        {timeline.length === 0 ? (
          <div style={{ color: '#5b6b82', textAlign: 'center', padding: '30px' }}>
            Not enough timeline data to compare
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f0" />
                <XAxis
                  dataKey="time"
                  stroke="#5b6b82"
                  tick={{ fontSize: 11 }}
                  tickFormatter={d => String(d).slice(5)}
                  interval={Math.floor(timeline.length / 8)}
                />
                <YAxis stroke="#5b6b82" tick={{ fontSize: 11 }} domain={[0, 1]} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #dbe4f0',
                    borderRadius: '8px',
                    color: '#0f1b2d'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="global_intensity"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={false}
                  name="Global"
                />
                <Line
                  type="monotone"
                  dataKey="reddit_intensity"
                  stroke="#0f766e"
                  strokeWidth={2.5}
                  dot={false}
                  name="Reddit"
                />
                <Line
                  type="monotone"
                  dataKey="gap"
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  name="Mismatch Gap"
                />
              </LineChart>
            </ResponsiveContainer>

            <div style={{
              marginTop: '8px',
              padding: '10px 12px',
              background: '#f8fafc',
              border: '1px solid #dbe4f0',
              borderRadius: '8px',
              color: '#94a3b8',
              fontSize: '12px'
            }}>
              Red dashed line highlights mismatch zones. Lag status: <span style={{ color: '#0f1b2d' }}>{metrics.lag_direction || 'in_sync'}</span>
            </div>
          </>
        )}
      </Card>

      <Card title="🌍 Global Topics Feed">
        {topics.length === 0 ? (
          <p style={{ color: '#5b6b82' }}>No global topics available</p>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
            {topics.map((t, i) => (
              <div
                key={`${t.topic}-${i}`}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #dbe4f0',
                  borderRadius: '10px',
                  padding: '12px'
                }}
              >
                <div style={{ color: '#0f1b2d', fontWeight: '600' }}>{t.topic}</div>
                <div style={{ color: '#5b6b82', fontSize: '12px', marginTop: '4px' }}>
                  {t.region} · score {t.score}
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Badge confidence={t.confidence} />
                  <span style={{ color: '#64748b', fontSize: '11px' }}>{t.confidence_reason}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function Badge({ confidence }) {
  const map = {
    High: '#0f766e',
    Medium: '#d97706',
    Low: '#dc2626',
  }
  const color = map[confidence] || '#64748b'
  return (
    <span style={{
      fontSize: '11px',
      color,
      border: `1px solid ${color}`,
      borderRadius: '999px',
      padding: '2px 8px'
    }}>
      {confidence || 'Unknown'} confidence
    </span>
  )
}

// ── Reusable Card ─────────────────────────────────────
function Card({ title, children }) {
  return (
    <div style={{
      background:   '#ffffff',
      border:       '1px solid #dbe4f0',
      borderRadius: '12px',
      padding:      '20px'
    }}>
      <h2 style={{
        color:        '#0f1b2d',
        fontSize:     '16px',
        fontWeight:   '600',
        marginBottom: '16px'
      }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

// ── AI Summary Box ────────────────────────────────────
function AISummary({ text }) {
  return (
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
        {text}
      </p>
    </div>
  )
}

// ── Loading State ─────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#5b6b82' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
      Loading trending data...
    </div>
  )
}

// ── Error State ───────────────────────────────────────
function ErrorState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#5b6b82' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
      Could not load data
    </div>
  )
}