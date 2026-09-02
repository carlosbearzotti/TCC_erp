import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/',
  timeout: 10000,
});

let tokenPromise: Promise<string | null> | null = null;

async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const storedToken = localStorage.getItem('access_token');
  if (storedToken) {
    return storedToken;
  }

  if (!tokenPromise) {
    tokenPromise = axios
      .post('http://localhost:8000/api/users/login/', {
        username: 'admin',
        password: 'admin',
      })
      .then((res) => {
        const token = res.data.access;
        localStorage.setItem('access_token', token);
        if (res.data.refresh) {
          localStorage.setItem('refresh_token', res.data.refresh);
        }
        tokenPromise = null;
        return token;
      })
      .catch((err) => {
        tokenPromise = null;
        console.error('Falha ao autenticar admin:', err);
        return null;
      });
  }

  return tokenPromise;
}

// Request interceptor para adicionar Token JWT automaticamente
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
      }
      const newToken = await getAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export const fetcher = (url: string) =>
  api.get(url).then((res) => (res.data && Array.isArray(res.data.results) ? res.data.results : res.data));

export default api;
