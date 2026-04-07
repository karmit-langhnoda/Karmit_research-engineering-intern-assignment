import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ScatterChart,
  Scatter, ZAxis, Cell
} from 'recharts'
import { getSources } from '../api'
import useStore from '../store/useStore'

const COLORS = [
  '#0b5fff','#0891b2','#0f766e','#d97706',
  '#dc2626','#7c3aed','#db2777','#0f766e',
  '#ea580c','#2563eb'
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
  'mainstream news': '#0f766e',
  'reddit':          '#dc2626',
  'video':           '#d97706',
  'reference':       '#0891b2',
  'social media':    '#7c3aed',
  'government':      '#0b5fff',
  'academic':        '#0f766e',
  'blog':            '#db2777',
  'alternative':     '#ea580c',
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
    <div style={{ textAlign: 'center', padding: '60px', color: '#5b6b82' }}>
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
        background: '#ffffff',
        border: '1px solid #dbe4f0',
        borderRadius: '12px',
        padding: '16px'
      }}>
        <div style={{ color: '#5b6b82', fontSize: '12px', marginBottom: '10px' }}>
          FILTER BY SOURCE TYPE
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill
            label="All"
            count={domains.length}
            color="#0b5fff"
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
          <div style={{ color: '#5b6b82', textAlign: 'center', padding: '40px' }}>
            No domains found for this filter
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={filtered.slice(0, 15)}
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
                dataKey="domain"
                stroke="#5b6b82"
                tick={{ fontSize: 10 }}
                width={160}
              />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #dbe4f0',
                  borderRadius: '8px',
                  color: '#0f1b2d'
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
        <p style={{ color: '#5b6b82', fontSize: '12px', marginTop: '8px' }}>
          Click any bar to inspect that domain
        </p>
      </Card>

      {/* ── Selected Domain Detail ───────────────── */}
      {selected && (
        <div style={{
          background: '#ffffff',
          border: `1px solid ${TYPE_COLORS[selected.type] || '#dbe4f0'}`,
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div className="flex justify-between items-center mb-3">
            <h3 style={{ color: '#0f1b2d', fontSize: '16px', fontWeight: '600' }}>
              🔗 {selected.domain}
            </h3>
            <button
              onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', color: '#5b6b82', cursor: 'pointer', fontSize: '18px' }}
            >✕</button>
          </div>
          <div className="flex gap-6 flex-wrap">
            {[
              { label: 'Source Type',   value: selected.type,                   color: TYPE_COLORS[selected.type] },
              { label: 'Times Shared',  value: selected.share_count,            color: '#0f1b2d' },
              { label: 'Avg Post Score',value: Math.round(selected.avg_score),  color: '#0f1b2d' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '12px 20px',
                textAlign: 'center'
              }}>
                <div style={{ color, fontWeight: '700', fontSize: '20px' }}>{value}</div>
                <div style={{ color: '#5b6b82', fontSize: '11px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Scatter: Share Count vs Avg Score ────── */}
      <Card title="📊 Source Influence Map (Reach vs Engagement)">
        <p style={{ color: '#5b6b82', fontSize: '12px', marginBottom: '12px' }}>
          X = how often shared · Y = average post score · Colored by source type
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f0" />
            <XAxis
              dataKey="x"
              name="Times Shared"
              stroke="#5b6b82"
              tick={{ fontSize: 11 }}
              label={{ value: 'Times Shared', position: 'insideBottom', offset: -5, fill: '#5b6b82', fontSize: 11 }}
            />
            <YAxis
              dataKey="y"
              name="Avg Score"
              stroke="#5b6b82"
              tick={{ fontSize: 11 }}
              label={{ value: 'Avg Score', angle: -90, position: 'insideLeft', fill: '#5b6b82', fontSize: 11 }}
            />
            <ZAxis dataKey="z" range={[40, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                background: '#ffffff',
                border: '1px solid #dbe4f0',
                borderRadius: '8px',
                color: '#0f1b2d'
              }}
              formatter={(val, name) => [val, name]}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return (
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #dbe4f0',
                    borderRadius: '8px',
                    padding: '10px'
                  }}>
                    <div style={{ color: '#0f1b2d', fontWeight: '600', fontSize: '13px' }}>{d?.name}</div>
                    <div style={{ color: '#5b6b82', fontSize: '12px' }}>Type: {d?.type}</div>
                    <div style={{ color: '#5b6b82', fontSize: '12px' }}>Shared: {d?.x} times</div>
                    <div style={{ color: '#5b6b82', fontSize: '12px' }}>Avg Score: {d?.y}</div>
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
              <span style={{ color: '#5b6b82', fontSize: '11px' }}>{type}</span>
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
                  background: '#f8fafc',
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
                <div style={{ color: '#5b6b82', fontSize: '12px', marginTop: '2px' }}>
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
        background: active ? color : '#f8fafc',
        color: active ? '#fff' : '#5b6b82',
        border: `1px solid ${active ? color : '#dbe4f0'}`,
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