// solPayments/src/api/axios.ts
import axios, { AxiosInstance } from 'axios';

// Debug: Log the environment and URL being used
const baseURL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:8080'  // Correct backend port
  : 'https://api.stg.solhealth.co';

console.log('🔧 Axios Configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  baseURL: baseURL,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL
});

const axiosInstance: AxiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor for debugging
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    if (config.data && Object.keys(config.data).length > 0) {
      console.log('📤 Request data:', config.data);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    if (response.data && Object.keys(response.data).length > 0) {
      console.log('📥 Response data:', response.data);
    }
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`);
    console.error('🔧 Failed URL:', error.config?.baseURL + error.config?.url);
    if (error.response?.data) {
      console.error('📥 Error data:', error.response.data);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;