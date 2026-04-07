import { useEffect } from 'react'
import useStore from './store/useStore'
import { getStats } from './api'
import Header from './components/Header'
import TabBar from './components/TabBar'
import TrendingTab from './components/TrendingTab'
import NetworkTab from './components/NetworkTab'
import IdeologyTab from './components/IdeologyTab'
import SourcesTab from './components/SourcesTab'
import SearchPanel from './components/SearchPanel'
import Chatbot from './components/Chatbot'

export default function App() {
  const { activeTab, searchResults, setStats } = useStore()

  useEffect(() => {
    getStats().then(r => setStats(r.data))
  }, [])

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      <Header />
      <TabBar />

      <main className="max-w-7xl mx-auto px-4 py-6" style={{ paddingTop: '24px', paddingBottom: '36px' }}>
        {/* Search results override tab content */}
        {searchResults ? (
          <SearchPanel />
        ) : (
          <>
            {activeTab === 'trending'  && <TrendingTab />}
            {activeTab === 'network'   && <NetworkTab />}
            {activeTab === 'ideology'  && <IdeologyTab />}
            {activeTab === 'sources'   && <SourcesTab />}
            {activeTab === 'chat'      && <Chatbot />}
          </>
        )}
      </main>
    </div>
  )
}