import axios from 'axios'

const TOKEN_KEY = 'legacyai.auth.token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute = window.location.pathname === '/login' || window.location.pathname === '/register'
    if (error.response?.status === 401 && !isAuthRoute) {
      clearToken()
      window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)
