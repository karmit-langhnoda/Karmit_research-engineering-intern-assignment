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
    <header style={{ background: '#1a1d27', borderBottom: '1px solid #2d3148' }}>
      <div className="max-w-7xl mx-auto px-4 py-4">

        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              🔍 RedditLens
            </h1>
            <p style={{ color: '#8892b0', fontSize: '13px' }}>
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
                <div key={label} className="text-center">
                  <div className="text-xl font-bold text-white">{value}</div>
                  <div style={{ color: '#8892b0', fontSize: '11px' }}>{label}</div>
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
            className="flex-1 px-4 py-2 rounded-lg text-white outline-none"
            style={{
              background: '#0f1117',
              border: '1px solid #2d3148',
              fontSize: '14px'
            }}
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-2 rounded-lg font-medium text-white"
            style={{ background: '#4f46e5' }}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 rounded-lg text-white"
              style={{ background: '#374151' }}
            >
              Clear
            </button>
          )}
        </form>

      </div>
    </header>
  )
}