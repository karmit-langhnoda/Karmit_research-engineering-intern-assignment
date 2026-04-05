import { useEffect, useState, useRef } from 'react'
import * as d3 from 'd3'
import { getNetwork } from '../api'

export default function NetworkTab() {
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [minConn,     setMinConn]     = useState(1)
  const [removeNode,  setRemoveNode]  = useState(null)
  const [selectedNode,setSelectedNode]= useState(null)
  const [colorBy,     setColorBy]     = useState('community')
  const svgRef = useRef(null)

  // ── Fetch Data ────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    getNetwork({ min_connections: minConn, remove_node: removeNode })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [minConn, removeNode])

  // ── Draw Network ──────────────────────────────────
  useEffect(() => {
    if (!data || !svgRef.current) return
    drawNetwork(data, svgRef.current, colorBy, setSelectedNode)
  }, [data, colorBy])

  return (
    <div className="flex flex-col gap-6">

      {/* ── Controls ─────────────────────────────── */}
      <div style={{
        background: '#1a1d27',
        border: '1px solid #2d3148',
        borderRadius: '12px',
        padding: '16px'
      }}>
        <div className="flex flex-wrap gap-6 items-center">

          {/* Min connections slider */}
          <div>
            <label style={{ color: '#8892b0', fontSize: '12px' }}>
              Min Connections: <span style={{ color: '#fff' }}>{minConn}</span>
            </label>
            <input
              type="range" min={1} max={20} value={minConn}
              onChange={e => {
                setMinConn(Number(e.target.value))
                setSelectedNode(null)
              }}
              style={{ display: 'block', marginTop: '6px', width: '160px' }}
            />
          </div>

          {/* Color by */}
          <div>
            <label style={{ color: '#8892b0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
              Color by:
            </label>
            <div className="flex gap-2">
              {['community', 'pagerank', 'connections'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setColorBy(opt)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    background: colorBy === opt ? '#4f46e5' : '#0f1117',
                    color: colorBy === opt ? '#fff' : '#8892b0',
                    border: '1px solid #2d3148',
                    cursor: 'pointer'
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 ml-auto">
            {[
              { label: 'Nodes',      value: data?.total_nodes  ?? '—' },
              { label: 'Edges',      value: data?.total_edges  ?? '—' },
              { label: 'Components', value: data?.components   ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ color: '#fff', fontWeight: '700', fontSize: '20px' }}>{value}</div>
                <div style={{ color: '#8892b0', fontSize: '11px' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Reset button */}
          {removeNode && (
            <button
              onClick={() => { setRemoveNode(null); setSelectedNode(null) }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Reset Network
            </button>
          )}
        </div>
      </div>

      {/* ── Main Panel ───────────────────────────── */}
      <div className="flex gap-4">

        {/* Network Graph */}
        <div style={{
          flex: 1,
          background: '#1a1d27',
          border: '1px solid #2d3148',
          borderRadius: '12px',
          padding: '16px',
          minHeight: '500px'
        }}>
          <h2 style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            🕸️ Subreddit Crosspost Network
          </h2>
          <p style={{ color: '#8892b0', fontSize: '12px', marginBottom: '12px' }}>
            Click a node to inspect · Right-click to remove
          </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#8892b0' }}>
              ⏳ Building network...
            </div>
          ) : data?.nodes?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#8892b0' }}>
              ⚠️ No connections found at this threshold
            </div>
          ) : (
            <svg ref={svgRef} width="100%" height="480"
              style={{ borderRadius: '8px', background: '#0f1117' }}
            />
          )}
        </div>

        {/* Node Detail Panel */}
        <div style={{
          width: '260px',
          background: '#1a1d27',
          border: '1px solid #2d3148',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <h3 style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
            Node Details
          </h3>

          {selectedNode ? (
            <div className="flex flex-col gap-3">
              <div style={{
                padding: '10px',
                background: '#0f1117',
                borderRadius: '8px',
                borderLeft: '3px solid #4f46e5'
              }}>
                <div style={{ color: '#fff', fontWeight: '700', fontSize: '16px' }}>
                  r/{selectedNode.id}
                </div>
              </div>

              {[
                { label: 'PageRank Score',    value: selectedNode.pagerank?.toFixed(4)    },
                { label: 'Betweenness',       value: selectedNode.betweenness?.toFixed(4) },
                { label: 'Community Cluster', value: selectedNode.community               },
                { label: 'Connections',       value: selectedNode.connections             },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #2d3148'
                }}>
                  <span style={{ color: '#8892b0', fontSize: '12px' }}>{label}</span>
                  <span style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '600' }}>{value}</span>
                </div>
              ))}

              <button
                onClick={() => setRemoveNode(selectedNode.id)}
                style={{
                  marginTop: '8px',
                  padding: '8px',
                  borderRadius: '6px',
                  background: '#7f1d1d',
                  color: '#fca5a5',
                  border: '1px solid #ef4444',
                  fontSize: '12px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Remove This Node
              </button>
            </div>
          ) : (
            <p style={{ color: '#8892b0', fontSize: '13px' }}>
              Click any node in the network to see its details and influence scores.
            </p>
          )}

          {/* Legend */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ color: '#8892b0', fontSize: '11px', marginBottom: '8px' }}>
              LEGEND
            </div>
            <div style={{ color: '#8892b0', fontSize: '11px', lineHeight: '1.8' }}>
              • Node size = PageRank score<br/>
              • Edge thickness = crosspost count<br/>
              • Colors = {colorBy === 'community' ? 'Louvain community' : colorBy}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── D3 Network Drawing ────────────────────────────────
function drawNetwork(data, svgEl, colorBy, onNodeClick) {
  const { nodes, edges } = data

  // clear previous
  d3.select(svgEl).selectAll('*').remove()

  if (!nodes || nodes.length === 0) return

  const width  = svgEl.clientWidth  || 700
  const height = svgEl.clientHeight || 480

  const svg = d3.select(svgEl)
    .attr('viewBox', `0 0 ${width} ${height}`)

  // zoom
  const g = svg.append('g')
  svg.call(
    d3.zoom()
      .scaleExtent([0.3, 4])
      .on('zoom', e => g.attr('transform', e.transform))
  )

  // color scale
  const communities = [...new Set(nodes.map(n => n.community))]
  const colorScale  = d3.scaleOrdinal()
    .domain(communities)
    .range(d3.schemeTableau10)

  const getColor = (node) => {
    if (colorBy === 'community') return colorScale(node.community)
    if (colorBy === 'pagerank') {
      const pr = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(nodes, n => n.pagerank)])
      return pr(node.pagerank)
    }
    const cs = d3.scaleSequential(d3.interpolateGreens)
      .domain([0, d3.max(nodes, n => n.connections)])
    return cs(node.connections)
  }

  // node size by pagerank
  const maxPR   = d3.max(nodes, n => n.pagerank) || 1
  const sizeScale = d3.scaleSqrt().domain([0, maxPR]).range([6, 28])

  // edge weight scale
  const maxWeight  = d3.max(edges, e => e.weight) || 1
  const edgeScale  = d3.scaleLinear().domain([1, maxWeight]).range([0.5, 4])

  // force simulation
  const simulation = d3.forceSimulation(nodes)
    .force('link',   d3.forceLink(edges)
      .id(d => d.id)
      .distance(80)
      .strength(0.3)
    )
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => sizeScale(d.pagerank) + 5))

  // draw edges
  const link = g.append('g').selectAll('line')
    .data(edges)
    .join('line')
    .attr('stroke', '#2d3148')
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', d => edgeScale(d.weight))

  // draw nodes
  const node = g.append('g').selectAll('circle')
    .data(nodes)
    .join('circle')
    .attr('r',      d => sizeScale(d.pagerank))
    .attr('fill',   d => getColor(d))
    .attr('stroke', '#0f1117')
    .attr('stroke-width', 1.5)
    .style('cursor', 'pointer')
    .call(
      d3.drag()
        .on('start', (e, d) => {
          if (!e.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end',   (e, d) => {
          if (!e.active) simulation.alphaTarget(0)
          d.fx = null; d.fy = null
        })
    )
    .on('click',       (e, d) => { e.stopPropagation(); onNodeClick(d) })
    .on('contextmenu', (e, d) => { e.preventDefault(); onNodeClick(d) })

  // draw labels
  const label = g.append('g').selectAll('text')
    .data(nodes.filter(n => n.pagerank > maxPR * 0.1))
    .join('text')
    .text(d => d.id)
    .attr('font-size',   10)
    .attr('fill',        '#cbd5e1')
    .attr('text-anchor', 'middle')
    .attr('dy',          d => -sizeScale(d.pagerank) - 3)
    .style('pointer-events', 'none')

  // tooltip
  node.append('title').text(d =>
    `r/${d.id}\nPageRank: ${d.pagerank?.toFixed(4)}\nCommunity: ${d.community}\nConnections: ${d.connections}`
  )

  // tick
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
    node
      .attr('cx', d => d.x).attr('cy', d => d.y)
    label
      .attr('x', d => d.x).attr('y', d => d.y)
  })
}