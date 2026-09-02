import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/', // Django backend URL
  timeout: 10000,
});

// Request interceptor para adicionar Token JWT no futuro (se necessário)
api.interceptors.request.use(
  (config) => {
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized (e.g., logout or redirect to login)
      console.warn("Unauthorized access - redirecting to login");
    }
    return Promise.reject(error);
  }
);

export const fetcher = (url: string) =>
  api.get(url).then((res) => (res.data && Array.isArray(res.data.results) ? res.data.results : res.data));

export default api;
