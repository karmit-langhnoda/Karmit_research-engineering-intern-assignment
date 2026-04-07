import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: BASE_URL })

export const getStats    = ()       => api.get('/api/stats')
export const getTrending = (params) => api.get('/api/trending', { params })
export const getSearch   = (params) => api.get('/api/search',   { params })
export const getNetwork  = (params) => api.get('/api/network',  { params })
export const getClusters = (params) => api.get('/api/clusters', { params })
export const getIdeology = (params) => api.get('/api/ideology', { params })
export const getSources  = (params) => api.get('/api/sources',  { params })
export const getPosts    = (params) => api.get('/api/posts',    { params })
export const getGlobalTrending = (params) => api.get('/api/global-trending', { params })
export const getGlobalInsights = (params) => api.get('/api/global-insights', { params })