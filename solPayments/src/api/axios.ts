import axios, { AxiosInstance } from 'axios';

const axiosInstance: AxiosInstance = axios.create({
  baseURL:
    (process.env.NEXT_PUBLIC_API_URL as string) ||
    `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}//${typeof window !== 'undefined' ? `api.${window.location.hostname}` : 'api.solhealth.co'}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;