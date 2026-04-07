import useStore from '../store/useStore'

const TABS = [
  { id: 'trending', label: '🔥 Trending Topics' },
  { id: 'network',  label: '🕸️ Community Network' },
  { id: 'ideology', label: '🧭 Ideology Map' },
  { id: 'sources',  label: '🔗 Source Intelligence' },
  { id: 'chat',     label: '💬 Chat Assistant' },
]

export default function TabBar() {
  const { activeTab, setActiveTab, clearSearch } = useStore()

  const handleTab = (id) => {
    setActiveTab(id)
    clearSearch()
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.82)',
      borderBottom: '1px solid #dbe4f0',
      backdropFilter: 'blur(10px)'
    }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-2" style={{ padding: '10px 0' }}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleTab(id)}
              className="px-5 py-3 text-sm font-medium transition-all"
              style={{
                color:      activeTab === id ? '#fff' : '#4b5c74',
                background: activeTab === id ? '#0b5fff' : '#f3f7fc',
                border:     activeTab === id ? '1px solid #0b5fff' : '1px solid #dbe4f0',
                borderRadius: '999px',
                boxShadow: activeTab === id ? '0 8px 16px rgba(11,95,255,0.2)' : 'none'
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