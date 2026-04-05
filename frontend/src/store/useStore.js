import { create } from 'zustand'

const useStore = create((set) => ({

  // ── Global Filters ──────────────────────────────────
  filters: {
    subreddit:  null,
    ideology:   null,
    date_from:  null,
    date_to:    null,
  },

  // ── Search ──────────────────────────────────────────
  searchQuery:   '',
  searchResults: null,
  isSearching:   false,

  // ── Active Tab ──────────────────────────────────────
  activeTab: 'trending',

  // ── Stats ───────────────────────────────────────────
  stats: null,

  // ── Actions ─────────────────────────────────────────
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    })),

  setSearchQuery: (query) =>
    set({ searchQuery: query }),

  setSearchResults: (results) =>
    set({ searchResults: results }),

  setIsSearching: (val) =>
    set({ isSearching: val }),

  setActiveTab: (tab) =>
    set({ activeTab: tab }),

  setStats: (stats) =>
    set({ stats }),

  clearSearch: () =>
    set({ searchQuery: '', searchResults: null }),
}))

export default useStore