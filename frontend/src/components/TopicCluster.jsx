import { useEffect, useState, useRef } from 'react'
import * as d3 from 'd3'
import { getClusters } from '../api'

const CLUSTER_COLORS = [
  '#0b5fff','#0891b2','#0f766e','#d97706','#dc2626',
  '#7c3aed','#db2777','#0f766e','#ea580c','#2563eb',
  '#65a30d','#0284c7','#c026d3','#ea580c','#65a30d',
]

export default function TopicCluster() {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [nClusters,  setNClusters]  = useState(2)
  const [selected,   setSelected]   = useState(null)
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const svgRef  = useRef(null)
  const sliderRef = useRef(null)

  // ── Fetch clusters ────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      setError('')
      setSelected(null)
      getClusters({ n_clusters: nClusters })
        .then(r => {
          if (cancelled) return
          const payload = r?.data || {}
          if (payload.error) {
            setError(payload.error)
            return
          }
          setData(payload)
        })
        .catch(() => {
          if (cancelled) return
          setError('Could not load cluster data. Try a nearby cluster value.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 220)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [nClusters])

  // ── Draw scatter plot ─────────────────────────────
  useEffect(() => {
    if (!data || !svgRef.current) return
    drawScatter(data, svgRef.current, selected, setSelected, setHoveredPoint)
  }, [data, selected])

  const clusters = data?.clusters || []
  const points   = data?.points   || []

  // posts in selected cluster
  const selectedPosts = selected !== null
    ? points.filter(p => p.cluster === selected)
    : []

  return (
    <div className="flex flex-col gap-6">

      {/* ── Controls ─────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #dbe4f0',
        borderRadius: '12px',
        padding: '16px'
      }}>
        <div className="flex flex-wrap gap-8 items-center">

          {/* Cluster slider */}
          <div>
            <label style={{ color: '#5b6b82', fontSize: '12px' }}>
              Number of Clusters:
              <span style={{
                color: '#0f1b2d',
                fontWeight: '700',
                fontSize: '20px',
                marginLeft: '10px'
              }}>
                {nClusters}
              </span>
            </label>
            <div className="flex items-center gap-3 mt-2">
              <span style={{ color: '#5b6b82', fontSize: '11px' }}>1</span>
              <input
                ref={sliderRef}
                type="range"
                min={1}
                max={5}
                value={nClusters}
                onChange={e => setNClusters(Number(e.target.value))}
                style={{ width: '200px' }}
              />
              <span style={{ color: '#5b6b82', fontSize: '11px' }}>5</span>
            </div>
            <p style={{ color: '#5b6b82', fontSize: '11px', marginTop: '4px' }}>
              Drag to change between 1 and 5 clusters
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-6">
            {[
              { label: 'Total Posts',  value: data?.total      ?? '—' },
              { label: 'Clusters',     value: data?.n_clusters ?? '—' },
              { label: 'Selected',     value: selected !== null ? `Cluster ${selected}` : 'None' },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ color: '#0f1b2d', fontWeight: '700', fontSize: '20px' }}>
                  {value}
                </div>
                <div style={{ color: '#5b6b82', fontSize: '11px' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Clear selection */}
          {selected !== null && (
            <button
              onClick={() => setSelected(null)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: '#c5d2e6',
                color: '#0f1b2d',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>

      {/* ── Main Panel ───────────────────────────── */}
      <div className="flex gap-4">

        {/* Scatter Plot */}
        <div style={{
          flex: 1,
          background: '#ffffff',
          border: '1px solid #dbe4f0',
          borderRadius: '12px',
          padding: '16px',
          position: 'relative'
        }}>
          <h2 style={{
            color: '#0f1b2d',
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '4px'
          }}>
            🗺️ Topic Embedding Map
          </h2>
          <p style={{ color: '#5b6b82', fontSize: '12px', marginBottom: '12px' }}>
            Each dot = one post · Colors = topic cluster · Click cluster to explore
          </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px', color: '#5b6b82' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              Computing embeddings and clusters...
            </div>
          ) : !data ? (
            <div style={{ textAlign: 'center', padding: '100px', color: '#5b6b82' }}>
              ⚠️ Could not load cluster data
            </div>
          ) : (
            <>
              {error && (
                <div style={{
                  marginBottom: '10px',
                  padding: '10px 12px',
                  background: '#fff8e6',
                  border: '1px solid #e7c66b',
                  borderRadius: '8px',
                  color: '#8a5a00',
                  fontSize: '12px'
                }}>
                  {error}
                </div>
              )}
              <svg
                ref={svgRef}
                width="100%"
                height="500"
                style={{ borderRadius: '8px', background: '#f8fafc' }}
              />
            </>
          )}

          {/* Hover tooltip */}
          {hoveredPoint && (
            <div style={{
              position:     'absolute',
              top:          '60px',
              left:         '20px',
              background:   '#ffffff',
              border:       '1px solid #dbe4f0',
              borderRadius: '8px',
              padding:      '10px',
              maxWidth:     '260px',
              pointerEvents:'none',
              zIndex:       10
            }}>
              <div style={{ color: '#0f1b2d', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                {hoveredPoint.text?.slice(0, 80)}...
              </div>
              <div style={{ color: '#5b6b82', fontSize: '11px' }}>
                r/{hoveredPoint.subreddit} · Score: {hoveredPoint.score}
              </div>
              {hoveredPoint.flair && (
                <div style={{ color: '#0b5fff', fontSize: '11px' }}>
                  {hoveredPoint.flair}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cluster List + Detail */}
        <div style={{
          width: '280px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>

          {/* Cluster List */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #dbe4f0',
            borderRadius: '12px',
            padding: '16px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            <h3 style={{
              color: '#0f1b2d',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '10px'
            }}>
              Topic Clusters
            </h3>
            <div className="flex flex-col gap-1">
              {clusters.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelected(selected === c.id ? null : c.id)}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '8px',
                    padding:      '7px 10px',
                    borderRadius: '6px',
                    background:   selected === c.id ? '#f8fafc' : 'transparent',
                    border:       selected === c.id
                      ? `1px solid ${CLUSTER_COLORS[c.id % CLUSTER_COLORS.length]}`
                      : '1px solid transparent',
                    cursor:       'pointer',
                    textAlign:    'left',
                    width:        '100%'
                  }}
                >
                  <div style={{
                    width:        '10px',
                    height:       '10px',
                    borderRadius: '50%',
                    background:   CLUSTER_COLORS[c.id % CLUSTER_COLORS.length],
                    flexShrink:   0
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color:     '#0f1b2d',
                      fontSize:  '11px',
                      fontWeight:'500'
                    }}>
                      {c.label}
                    </div>
                    <div style={{ color: '#5b6b82', fontSize: '10px' }}>
                      {c.count} posts
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Cluster Posts */}
          {selected !== null && selectedPosts.length > 0 && (
            <div style={{
              background: '#ffffff',
              border: `1px solid ${CLUSTER_COLORS[selected % CLUSTER_COLORS.length]}`,
              borderRadius: '12px',
              padding: '14px',
              flex: 1,
              overflowY: 'auto',
              maxHeight: '300px'
            }}>
              <h3 style={{
                color: '#0f1b2d',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '10px'
              }}>
                Cluster {selected} Posts ({selectedPosts.length})
              </h3>
              <div className="flex flex-col gap-2">
                {selectedPosts.slice(0, 8).map(p => (
                  <div key={p.id} style={{
                    padding:      '8px',
                    background:   '#f8fafc',
                    borderRadius: '6px'
                  }}>
                    <div style={{
                      color:     '#24364d',
                      fontSize:  '11px',
                      lineHeight:'1.4'
                    }}>
                      {p.text?.slice(0, 70)}...
                    </div>
                    <div style={{
                      color:     '#5b6b82',
                      fontSize:  '10px',
                      marginTop: '3px'
                    }}>
                      ▲{p.score} · r/{p.subreddit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── D3 Scatter Plot ───────────────────────────────────
function drawScatter(data, svgEl, selected, onSelect, onHover) {
  const { points } = data
  if (!points?.length) return

  d3.select(svgEl).selectAll('*').remove()

  const width  = svgEl.clientWidth  || 700
  const height = svgEl.clientHeight || 500
  const margin = { top: 20, right: 20, bottom: 20, left: 20 }

  const svg = d3.select(svgEl)
    .attr('viewBox', `0 0 ${width} ${height}`)

  const g = svg.append('g')

  // zoom + pan
  svg.call(
    d3.zoom()
      .scaleExtent([0.5, 10])
      .on('zoom', e => g.attr('transform', e.transform))
  )

  // scales
  const xScale = d3.scaleLinear()
    .domain(d3.extent(points, p => p.x))
    .range([margin.left, width - margin.right])

  const yScale = d3.scaleLinear()
    .domain(d3.extent(points, p => p.y))
    .range([height - margin.bottom, margin.top])

  // draw points
  g.selectAll('circle')
    .data(points)
    .join('circle')
    .attr('cx',      p => xScale(p.x))
    .attr('cy',      p => yScale(p.y))
    .attr('r',       p => {
      if (selected === null) return 3
      return p.cluster === selected ? 5 : 2
    })
    .attr('fill', p => CLUSTER_COLORS[p.cluster % CLUSTER_COLORS.length])
    .attr('opacity', p => {
      if (selected === null) return 0.7
      return p.cluster === selected ? 1 : 0.15
    })
    .style('cursor', 'pointer')
    .on('click', (e, p) => {
      e.stopPropagation()
      onSelect(selected === p.cluster ? null : p.cluster)
    })
    .on('mouseenter', (e, p) => onHover(p))
    .on('mouseleave', () => onHover(null))

  // cluster labels at centroid
  const centroids = {}
  points.forEach(p => {
    if (!centroids[p.cluster]) centroids[p.cluster] = { x: 0, y: 0, count: 0 }
    centroids[p.cluster].x     += xScale(p.x)
    centroids[p.cluster].y     += yScale(p.y)
    centroids[p.cluster].count += 1
  })

  Object.entries(centroids).forEach(([cluster, c]) => {
    const cx = c.x / c.count
    const cy = c.y / c.count
    const label = data.clusters.find(cl => cl.id === Number(cluster))?.label || `Topic ${cluster}`

    if (selected === null || selected === Number(cluster)) {
      g.append('text')
        .attr('x', cx)
        .attr('y', cy)
        .text(label.slice(0, 20))
        .attr('font-size', 10)
        .attr('fill', '#24364d')
        .attr('text-anchor', 'middle')
        .attr('pointer-events', 'none')
        .attr('opacity', 0.8)
    }
  })
}