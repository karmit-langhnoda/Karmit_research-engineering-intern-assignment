import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts'
import { getTrending } from '../api'
import useStore from '../store/useStore'

const COLORS = [
  '#4f46e5','#06b6d4','#10b981','#f59e0b',
  '#ef4444','#8b5cf6','#ec4899','#14b8a6',
  '#f97316','#6366f1'
]

export default function TrendingTab() {
  const { filters } = useStore()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getTrending(filters)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [filters])

  if (loading) return <LoadingState />
  if (!data)   return <ErrorState />

  return (
    <div className="flex flex-col gap-6">

      {/* ── Timeline Chart ───────────────────────── */}
      <Card title="📈 Post Activity Over Time">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.timeline}>
            <defs>
              <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
            <XAxis
              dataKey="date"
              stroke="#8892b0"
              tick={{ fontSize: 11 }}
              tickFormatter={d => d.slice(5)}
              interval={Math.floor(data.timeline.length / 8)}
            />
            <YAxis stroke="#8892b0" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: '#1a1d27',
                border: '1px solid #2d3148',
                borderRadius: '8px',
                color: '#e2e8f0'
              }}
            />
            <Area
              type="monotone"
              dataKey="post_count"
              stroke="#4f46e5"
              fill="url(#colorPosts)"
              strokeWidth={2}
              name="Posts"
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* AI Summary */}
        {data.summary && (
          <AISummary text={data.summary} />
        )}
      </Card>

      {/* ── Subreddit Breakdown ───────────────────── */}
      <Card title="🏘️ Most Active Communities">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data.subreddits}
            layout="vertical"
            margin={{ left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
            <XAxis
              type="number"
              stroke="#8892b0"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="subreddit"
              stroke="#8892b0"
              tick={{ fontSize: 11 }}
              width={120}
            />
            <Tooltip
              contentStyle={{
                background: '#1a1d27',
                border: '1px solid #2d3148',
                borderRadius: '8px',
                color: '#e2e8f0'
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

      {/* ── Avg Score Timeline ────────────────────── */}
      <Card title="⭐ Average Post Score Over Time">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data.timeline}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
            <XAxis
              dataKey="date"
              stroke="#8892b0"
              tick={{ fontSize: 11 }}
              tickFormatter={d => d.slice(5)}
              interval={Math.floor(data.timeline.length / 8)}
            />
            <YAxis stroke="#8892b0" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: '#1a1d27',
                border: '1px solid #2d3148',
                borderRadius: '8px',
                color: '#e2e8f0'
              }}
            />
            <Area
              type="monotone"
              dataKey="avg_score"
              stroke="#10b981"
              fill="url(#colorScore)"
              strokeWidth={2}
              name="Avg Score"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

    </div>
  )
}

// ── Reusable Card ──────────────────────────────────────
function Card({ title, children }) {
  return (
    <div style={{
      background:   '#1a1d27',
      border:       '1px solid #2d3148',
      borderRadius: '12px',
      padding:      '20px'
    }}>
      <h2 style={{
        color:        '#e2e8f0',
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
      background:   '#0f1117',
      borderLeft:   '3px solid #4f46e5',
      borderRadius: '0 8px 8px 0',
    }}>
      <span style={{ color: '#4f46e5', fontSize: '12px', fontWeight: '600' }}>
        AI SUMMARY
      </span>
      <p style={{ color: '#8892b0', fontSize: '13px', marginTop: '4px', lineHeight: '1.6' }}>
        {text}
      </p>
    </div>
  )
}

// ── Loading State ─────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#8892b0' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
      Loading trending data...
    </div>
  )
}

// ── Error State ───────────────────────────────────────
function ErrorState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#8892b0' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
      Could not load data
    </div>
  )
}