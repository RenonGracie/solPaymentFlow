// solPayments/src/api/axios.ts
import axios, { AxiosInstance } from 'axios';

// Correct backend URL configuration
const getBaseURL = () => {
  // Use environment variable if available
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  
  // Default to your Railway backend URL
  // IMPORTANT: Use https:// protocol and no port number for Railway production
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
    // Make sure we're not double-concatenating URLs
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
    
    console.error(`❌ API Error: ${error.response?.status} ${error.config?.method?.toUpperCase()} ${fullUrl}`);
    
    if (error.response?.data) {
      console.error('📥 Error data:', error.response.data);
    }
    
    // Provide helpful error messages
    if (error.response?.status === 404) {
      console.error('🔍 404 Error - Check that:');
      console.error('   1. Backend is deployed and running');
      console.error('   2. The endpoint exists in your backend');
      console.error('   3. The URL is correct:', fullUrl);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;