import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/',
  timeout: 10000,
});

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  try {
    const res = await axios.post('http://localhost:8000/api/users/refresh/', {
      refresh: refreshToken,
    });
    const newToken = res.data.access;
    localStorage.setItem('access_token', newToken);
    return newToken;
  } catch (err) {
    console.warn('Sessão expirada ou token inválido:', err);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return null;
  }
}

// Request interceptor para adicionar Token JWT
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: renova automaticamente caso expire (401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        onRefreshed(newToken);

        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } else {
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const fetcher = (url: string) =>
  api.get(url).then((res) => (res.data && Array.isArray(res.data.results) ? res.data.results : res.data));

export { api };
export default api;
