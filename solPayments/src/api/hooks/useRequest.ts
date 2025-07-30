import { useState, useCallback } from 'react';
import type { AxiosError, AxiosRequestConfig, Method } from 'axios';

import { formatApiError } from '@/lib/errorUtils';
import axiosInstance from '../axios';
import { TApiError } from '../types/errors';

type RequestConfig<TParams, TData> = Omit<
  AxiosRequestConfig,
  'params' | 'data'
> & {
  params?: TParams;
  data?: TData;
};

interface RequestStateBase<R> {
  data: R | null;
  loading: boolean;
  error: string | null;
  rawError: string | Error | null;
  reset: () => void;
}

interface RequestState<TParams, TData, R> extends RequestStateBase<R> {
  makeRequest: (config: RequestConfig<TParams, TData>) => Promise<R>;
}

export const useRequest = <TParams, TData, R>(
  endpoint: string,
  method?: Method,
) => {
  const [data, setData] = useState<R | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawError, setRawError] = useState<string | Error | null>(null);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
    setRawError(null);
  }, []);

  const makeRequest = useCallback(
    async (config: RequestConfig<TParams, TData>) => {
      try {
        setLoading(true);
        setError(null);
        const response = await axiosInstance<R>({
          method,
          url: endpoint,
          ...config,
        });
        setData(response.data);
        return response.data;
      } catch (err) {
        const error = err as AxiosError<TApiError>;

        const errorMessage = error.response?.data
          ? formatApiError(error.response.data)
          : error.message;

        setRawError(error);
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, method],
  );

  return {
    data,
    loading,
    error,
    rawError,
    makeRequest,
    reset,
  } as RequestState<TParams, TData, R>;
};