import { useState, useEffect } from 'react';
import StateAvailabilityService, { StateAvailabilityResponse } from '../services/stateAvailabilityService';

interface UseAvailableStatesResult {
  availableStates: string[];
  stateCounts: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAvailableStates = (paymentType: 'cash_pay' | 'insurance' = 'cash_pay'): UseAvailableStatesResult => {
  const [data, setData] = useState<StateAvailabilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableStates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await StateAvailabilityService.getAvailableStates(paymentType);
      setData(response);
    } catch (err) {
      console.error('Error fetching available states:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch available states');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableStates();
  }, [paymentType]);

  return {
    availableStates: data?.available_states || [],
    stateCounts: data?.state_counts || {},
    isLoading,
    error,
    refetch: fetchAvailableStates
  };
};

export default useAvailableStates;