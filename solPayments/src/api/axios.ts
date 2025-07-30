// src/api/axios.ts
import axios, { AxiosInstance } from 'axios';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: 'https://api.stg.solhealth.co', // Fixed to use the correct Sol Health API
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;