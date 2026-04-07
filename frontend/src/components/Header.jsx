import { useState } from 'react'
import useStore from '../store/useStore'
import { getSearch } from '../api'

export default function Header() {
  const {
    stats, searchQuery,
    setSearchQuery, setSearchResults,
    setIsSearching, clearSearch, isSearching
  } = useStore()

  const [input, setInput] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    setSearchQuery(input)
    setIsSearching(true)

    try {
      const res = await getSearch({ q: input })
      setSearchResults(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleClear = () => {
    setInput('')
    clearSearch()
  }

  return (
    <header style={{
      background: 'rgba(255,255,255,0.86)',
      borderBottom: '1px solid #dbe4f0',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      <div className="max-w-7xl mx-auto px-4 py-4">

        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f1b2d', letterSpacing: '-0.02em' }}>
              🔍 RedditLens
            </h1>
            <p style={{ color: '#5b6b82', fontSize: '13px' }}>
              Narrative Intelligence Dashboard
            </p>
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex gap-6">
              {[
                { label: 'Posts',      value: stats.total_posts?.toLocaleString() },
                { label: 'Subreddits', value: stats.total_subreddits },
                { label: 'Authors',    value: stats.total_authors?.toLocaleString() },
                { label: 'Domains',    value: stats.total_domains },
              ].map(({ label, value }) => (
                <div key={label} className="text-center" style={{
                  background: '#f8fbff',
                  border: '1px solid #dbe4f0',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  minWidth: '90px'
                }}>
                  <div className="text-xl font-bold" style={{ color: '#0f1b2d' }}>{value}</div>
                  <div style={{ color: '#5b6b82', fontSize: '11px' }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search any topic, narrative, or query... (try: resistance to authority)"
            className="flex-1 px-4 py-2 rounded-lg outline-none"
            style={{
              background: '#f8fafc',
              border: '1px solid #dbe4f0',
              color: '#0f1b2d',
              fontSize: '14px',
              boxShadow: 'inset 0 1px 2px rgba(15, 27, 45, 0.05)'
            }}
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-2 rounded-lg font-medium"
            style={{ background: '#0b5fff', color: '#fff', boxShadow: '0 6px 14px rgba(11,95,255,0.24)' }}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 rounded-lg"
              style={{ background: '#e2eaf6', color: '#24364d' }}
            >
              Clear
            </button>
          )}
        </form>

      </div>
    </header>
  )
}