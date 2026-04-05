import useStore from '../store/useStore'

const TABS = [
  { id: 'trending', label: '🔥 Trending Topics' },
  { id: 'network',  label: '🕸️ Community Network' },
  { id: 'ideology', label: '🧭 Ideology Map' },
  { id: 'sources',  label: '🔗 Source Intelligence' },
]

export default function TabBar() {
  const { activeTab, setActiveTab, clearSearch } = useStore()

  const handleTab = (id) => {
    setActiveTab(id)
    clearSearch()
  }

  return (
    <div style={{ background: '#1a1d27', borderBottom: '1px solid #2d3148' }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleTab(id)}
              className="px-5 py-3 text-sm font-medium transition-all"
              style={{
                color:        activeTab === id ? '#fff' : '#8892b0',
                borderBottom: activeTab === id
                  ? '2px solid #4f46e5'
                  : '2px solid transparent',
                background:   'transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}