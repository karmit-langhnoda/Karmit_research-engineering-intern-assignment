import { useEffect, useState, useRef } from 'react'
import * as d3 from 'd3'
import { getClusters } from '../api'

const CLUSTER_COLORS = [
  '#4f46e5','#06b6d4','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1',
  '#84cc16','#0ea5e9','#d946ef','#fb923c','#a3e635',
]

export default function TopicCluster() {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [nClusters,  setNClusters]  = useState(10)
  const [selected,   setSelected]   = useState(null)
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const svgRef  = useRef(null)
  const sliderRef = useRef(null)

  // ── Fetch clusters ────────────────────────────────
  useEffect(() => {
    setLoading(true)
    setSelected(null)
    getClusters({ n_clusters: nClusters })
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
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
        background: '#1a1d27',
        border: '1px solid #2d3148',
        borderRadius: '12px',
        padding: '16px'
      }}>
        <div className="flex flex-wrap gap-8 items-center">

          {/* Cluster slider */}
          <div>
            <label style={{ color: '#8892b0', fontSize: '12px' }}>
              Number of Clusters:
              <span style={{
                color: '#fff',
                fontWeight: '700',
                fontSize: '20px',
                marginLeft: '10px'
              }}>
                {nClusters}
              </span>
            </label>
            <div className="flex items-center gap-3 mt-2">
              <span style={{ color: '#8892b0', fontSize: '11px' }}>2</span>
              <input
                ref={sliderRef}
                type="range"
                min={2}
                max={50}
                value={nClusters}
                onChange={e => setNClusters(Number(e.target.value))}
                style={{ width: '200px' }}
              />
              <span style={{ color: '#8892b0', fontSize: '11px' }}>50</span>
            </div>
            <p style={{ color: '#8892b0', fontSize: '11px', marginTop: '4px' }}>
              Drag to change · Extreme values handled gracefully
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
                <div style={{ color: '#fff', fontWeight: '700', fontSize: '20px' }}>
                  {value}
                </div>
                <div style={{ color: '#8892b0', fontSize: '11px' }}>{label}</div>
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
                background: '#374151',
                color: '#e2e8f0',
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
          background: '#1a1d27',
          border: '1px solid #2d3148',
          borderRadius: '12px',
          padding: '16px',
          position: 'relative'
        }}>
          <h2 style={{
            color: '#e2e8f0',
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '4px'
          }}>
            🗺️ Topic Embedding Map
          </h2>
          <p style={{ color: '#8892b0', fontSize: '12px', marginBottom: '12px' }}>
            Each dot = one post · Colors = topic cluster · Click cluster to explore
          </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px', color: '#8892b0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              Computing embeddings and clusters...
            </div>
          ) : !data ? (
            <div style={{ textAlign: 'center', padding: '100px', color: '#8892b0' }}>
              ⚠️ Could not load cluster data
            </div>
          ) : (
            <svg
              ref={svgRef}
              width="100%"
              height="500"
              style={{ borderRadius: '8px', background: '#0f1117' }}
            />
          )}

          {/* Hover tooltip */}
          {hoveredPoint && (
            <div style={{
              position:     'absolute',
              top:          '60px',
              left:         '20px',
              background:   '#1a1d27',
              border:       '1px solid #2d3148',
              borderRadius: '8px',
              padding:      '10px',
              maxWidth:     '260px',
              pointerEvents:'none',
              zIndex:       10
            }}>
              <div style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                {hoveredPoint.text?.slice(0, 80)}...
              </div>
              <div style={{ color: '#8892b0', fontSize: '11px' }}>
                r/{hoveredPoint.subreddit} · Score: {hoveredPoint.score}
              </div>
              {hoveredPoint.flair && (
                <div style={{ color: '#4f46e5', fontSize: '11px' }}>
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
            background: '#1a1d27',
            border: '1px solid #2d3148',
            borderRadius: '12px',
            padding: '16px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            <h3 style={{
              color: '#e2e8f0',
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
                    background:   selected === c.id ? '#0f1117' : 'transparent',
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
                      color:     '#e2e8f0',
                      fontSize:  '11px',
                      fontWeight:'500'
                    }}>
                      {c.label}
                    </div>
                    <div style={{ color: '#8892b0', fontSize: '10px' }}>
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
              background: '#1a1d27',
              border: `1px solid ${CLUSTER_COLORS[selected % CLUSTER_COLORS.length]}`,
              borderRadius: '12px',
              padding: '14px',
              flex: 1,
              overflowY: 'auto',
              maxHeight: '300px'
            }}>
              <h3 style={{
                color: '#e2e8f0',
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
                    background:   '#0f1117',
                    borderRadius: '6px'
                  }}>
                    <div style={{
                      color:     '#cbd5e1',
                      fontSize:  '11px',
                      lineHeight:'1.4'
                    }}>
                      {p.text?.slice(0, 70)}...
                    </div>
                    <div style={{
                      color:     '#8892b0',
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
        .attr('fill', '#cbd5e1')
        .attr('text-anchor', 'middle')
        .attr('pointer-events', 'none')
        .attr('opacity', 0.8)
    }
  })
}