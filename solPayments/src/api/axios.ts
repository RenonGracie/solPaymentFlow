// solPayments/src/api/axios.ts
import axios, { AxiosInstance } from 'axios';

// IMPORTANT: Use the PUBLIC Railway URL with HTTPS, not the internal URL
const getBaseURL = () => {
  // Check for environment variable first
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  
  // Use your Railway backend's PUBLIC URL
  // This should be the URL you see in Railway's dashboard for your backend
  return 'https://solhealthbe-production.up.railway.app';
};

const baseURL = getBaseURL();

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
    // Make sure we're using HTTPS
    if (config.baseURL && config.baseURL.includes('railway.internal')) {
      console.error('❌ CRITICAL: Using internal Railway URL - this will not work from browser!');
      console.error('   Change to: https://solhealthbe-production.up.railway.app');
    }
    
    const fullUrl = config.url?.startsWith('http') 
      ? config.url 
      : `${config.baseURL}${config.url}`;
    
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${fullUrl}`);
    
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
    const fullUrl = error.config?.url?.startsWith('http') 
      ? error.config.url 
      : `${error.config?.baseURL}${error.config?.url}`;
    
    console.error(`❌ API Error: ${error.response?.status || error.code} ${error.config?.method?.toUpperCase()} ${fullUrl}`);
    
    if (error.code === 'ERR_NETWORK') {
      console.error('🔒 Network Error - Common causes:');
      console.error('   1. Mixed Content: HTTPS page trying to reach HTTP endpoint');
      console.error('   2. CORS issue: Backend not allowing your frontend origin');
      console.error('   3. Backend is down or URL is incorrect');
      console.error('   Current URL:', fullUrl);
    }
    
    if (error.response?.data) {
      console.error('📥 Error data:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;