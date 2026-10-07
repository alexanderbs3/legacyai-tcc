import axios from 'axios';
import { requestEnded, requestStarted } from './requestActivity';

const TOKEN_KEY = 'legacyai.auth.token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    return true;
  } catch {
    return false;
  }
};

export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // A redirect must still happen when browser storage is unavailable.
  }
};

export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  requestStarted();
  return config;
});

api.interceptors.response.use(
  (response) => {
    requestEnded();
    return response;
  },
  (error) => {
    requestEnded();
    const isAuthRoute =
      window.location.pathname === '/login' || window.location.pathname === '/register';
    if (error.response?.status === 401 && !isAuthRoute) {
      clearToken();
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);
