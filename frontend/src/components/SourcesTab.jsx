import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ScatterChart,
  Scatter, ZAxis, Cell
} from 'recharts'
import { getSources } from '../api'
import useStore from '../store/useStore'

const COLORS = [
  '#4f46e5','#06b6d4','#10b981','#f59e0b',
  '#ef4444','#8b5cf6','#ec4899','#14b8a6',
  '#f97316','#6366f1'
]

// classify domain type
function classifyDomain(domain) {
  if (!domain) return 'other'
  const d = domain.toLowerCase()
  if (d.includes('reddit'))                                    return 'reddit'
  if (d.includes('youtube') || d.includes('youtu.be'))        return 'video'
  if (['bbc','cnn','nytimes','reuters','apnews','theguardian',
       'washingtonpost','npr','foxnews','nbcnews'].some(n => d.includes(n)))
    return 'mainstream news'
  if (d.includes('wikipedia'))                                 return 'reference'
  if (d.includes('twitter') || d.includes('x.com') ||
      d.includes('facebook') || d.includes('instagram'))      return 'social media'
  if (d.includes('.gov'))                                      return 'government'
  if (d.includes('.edu'))                                      return 'academic'
  if (d.includes('substack') || d.includes('medium') ||
      d.includes('wordpress') || d.includes('blogspot'))      return 'blog'
  return 'alternative'
}

const TYPE_COLORS = {
  'mainstream news': '#10b981',
  'reddit':          '#ef4444',
  'video':           '#f59e0b',
  'reference':       '#06b6d4',
  'social media':    '#8b5cf6',
  'government':      '#4f46e5',
  'academic':        '#14b8a6',
  'blog':            '#ec4899',
  'alternative':     '#f97316',
  'other':           '#6b7280',
}

export default function SourcesTab() {
  const { filters }              = useStore()
  const [data,     setData]      = useState(null)
  const [loading,  setLoading]   = useState(true)
  const [selected, setSelected]  = useState(null)
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    setLoading(true)
    getSources({ ...filters, limit: 40 })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [filters])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#8892b0' }}>
      ⏳ Loading source data...
    </div>
  )

  const domains = (data?.domains || []).map(d => ({
    ...d,
    type: classifyDomain(d.domain)
  }))

  // type breakdown for filter
  const typeCounts = domains.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + d.share_count
    return acc
  }, {})

  const filtered = filterType === 'all'
    ? domains
    : domains.filter(d => d.type === filterType)

  // scatter data
  const scatterData = domains.map((d, i) => ({
    x:     d.share_count,
    y:     Math.round(d.avg_score),
    z:     d.share_count,
    name:  d.domain,
    type:  d.type,
    color: TYPE_COLORS[d.type] || '#6b7280'
  }))

  return (
    <div className="flex flex-col gap-6">

      {/* ── Type Filter Pills ────────────────────── */}
      <div style={{
        background: '#1a1d27',
        border: '1px solid #2d3148',
        borderRadius: '12px',
        padding: '16px'
      }}>
        <div style={{ color: '#8892b0', fontSize: '12px', marginBottom: '10px' }}>
          FILTER BY SOURCE TYPE
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill
            label="All"
            count={domains.length}
            color="#4f46e5"
            active={filterType === 'all'}
            onClick={() => setFilterType('all')}
          />
          {Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <Pill
                key={type}
                label={type}
                count={count}
                color={TYPE_COLORS[type]}
                active={filterType === type}
                onClick={() => setFilterType(type)}
              />
            ))
          }
        </div>
      </div>

      {/* ── Top Domains Bar Chart ────────────────── */}
      <Card title="🔗 Most Shared Domains">
        {filtered.length === 0 ? (
          <div style={{ color: '#8892b0', textAlign: 'center', padding: '40px' }}>
            No domains found for this filter
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={filtered.slice(0, 15)}
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
                dataKey="domain"
                stroke="#8892b0"
                tick={{ fontSize: 10 }}
                width={160}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a1d27',
                  border: '1px solid #2d3148',
                  borderRadius: '8px',
                  color: '#e2e8f0'
                }}
                formatter={(val, name) => [val, 'Times Shared']}
              />
              <Bar
                dataKey="share_count"
                name="Shared"
                radius={[0, 4, 4, 0]}
                onClick={(d) => setSelected(d)}
                style={{ cursor: 'pointer' }}
              >
                {filtered.slice(0, 15).map((d, i) => (
                  <Cell
                    key={i}
                    fill={TYPE_COLORS[d.type] || COLORS[i % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <p style={{ color: '#8892b0', fontSize: '12px', marginTop: '8px' }}>
          Click any bar to inspect that domain
        </p>
      </Card>

      {/* ── Selected Domain Detail ───────────────── */}
      {selected && (
        <div style={{
          background: '#1a1d27',
          border: `1px solid ${TYPE_COLORS[selected.type] || '#2d3148'}`,
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div className="flex justify-between items-center mb-3">
            <h3 style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '600' }}>
              🔗 {selected.domain}
            </h3>
            <button
              onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', color: '#8892b0', cursor: 'pointer', fontSize: '18px' }}
            >✕</button>
          </div>
          <div className="flex gap-6 flex-wrap">
            {[
              { label: 'Source Type',   value: selected.type,                   color: TYPE_COLORS[selected.type] },
              { label: 'Times Shared',  value: selected.share_count,            color: '#e2e8f0' },
              { label: 'Avg Post Score',value: Math.round(selected.avg_score),  color: '#e2e8f0' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: '#0f1117',
                borderRadius: '8px',
                padding: '12px 20px',
                textAlign: 'center'
              }}>
                <div style={{ color, fontWeight: '700', fontSize: '20px' }}>{value}</div>
                <div style={{ color: '#8892b0', fontSize: '11px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Scatter: Share Count vs Avg Score ────── */}
      <Card title="📊 Source Influence Map (Reach vs Engagement)">
        <p style={{ color: '#8892b0', fontSize: '12px', marginBottom: '12px' }}>
          X = how often shared · Y = average post score · Colored by source type
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
            <XAxis
              dataKey="x"
              name="Times Shared"
              stroke="#8892b0"
              tick={{ fontSize: 11 }}
              label={{ value: 'Times Shared', position: 'insideBottom', offset: -5, fill: '#8892b0', fontSize: 11 }}
            />
            <YAxis
              dataKey="y"
              name="Avg Score"
              stroke="#8892b0"
              tick={{ fontSize: 11 }}
              label={{ value: 'Avg Score', angle: -90, position: 'insideLeft', fill: '#8892b0', fontSize: 11 }}
            />
            <ZAxis dataKey="z" range={[40, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                background: '#1a1d27',
                border: '1px solid #2d3148',
                borderRadius: '8px',
                color: '#e2e8f0'
              }}
              formatter={(val, name) => [val, name]}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return (
                  <div style={{
                    background: '#1a1d27',
                    border: '1px solid #2d3148',
                    borderRadius: '8px',
                    padding: '10px'
                  }}>
                    <div style={{ color: '#fff', fontWeight: '600', fontSize: '13px' }}>{d?.name}</div>
                    <div style={{ color: '#8892b0', fontSize: '12px' }}>Type: {d?.type}</div>
                    <div style={{ color: '#8892b0', fontSize: '12px' }}>Shared: {d?.x} times</div>
                    <div style={{ color: '#8892b0', fontSize: '12px' }}>Avg Score: {d?.y}</div>
                  </div>
                )
              }}
            />
            <Scatter data={scatterData} shape="circle">
              {scatterData.map((d, i) => (
                <Cell key={i} fill={d.color} fillOpacity={0.7} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Type Legend */}
        <div className="flex flex-wrap gap-3 mt-4">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div style={{
                width: '10px', height: '10px',
                borderRadius: '50%',
                background: color
              }} />
              <span style={{ color: '#8892b0', fontSize: '11px' }}>{type}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Type Breakdown Summary ───────────────── */}
      <Card title="📂 Source Type Breakdown">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '12px'
        }}>
          {Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <div
                key={type}
                onClick={() => setFilterType(type)}
                style={{
                  background: '#0f1117',
                  borderRadius: '8px',
                  padding: '14px',
                  borderLeft: `3px solid ${TYPE_COLORS[type]}`,
                  cursor: 'pointer',
                  opacity: filterType === type || filterType === 'all' ? 1 : 0.4
                }}
              >
                <div style={{
                  color: TYPE_COLORS[type],
                  fontWeight: '700',
                  fontSize: '22px'
                }}>
                  {count}
                </div>
                <div style={{ color: '#8892b0', fontSize: '12px', marginTop: '2px' }}>
                  {type}
                </div>
              </div>
            ))
          }
        </div>
      </Card>

    </div>
  )
}

// ── Pill Filter Button ────────────────────────────────
function Pill({ label, count, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        background: active ? color : '#0f1117',
        color: active ? '#fff' : '#8892b0',
        border: `1px solid ${active ? color : '#2d3148'}`,
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      {label} ({count})
    </button>
  )
}

// ── Card ──────────────────────────────────────────────
function Card({ title, children }) {
  return (
    <div style={{
      background: '#1a1d27',
      border: '1px solid #2d3148',
      borderRadius: '12px',
      padding: '20px'
    }}>
      <h2 style={{
        color: '#e2e8f0',
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