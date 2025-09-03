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
      
      // Check if this is a 404 error (endpoint not deployed yet)
      if (err instanceof Error && err.message.includes('404')) {
        console.warn('Available states endpoint not found (likely not deployed yet). Using fallback states.');
        // Set fallback data that mimics the API response
        setData({
          payment_type: paymentType,
          available_states: ['NY', 'NJ', 'FL', 'TX', 'CA', 'CT', 'GA', 'NV', 'VT', 'MA', 'IL', 'PA', 'RI', 'VA', 'WI', 'NC', 'CO', 'OR', 'WA', 'ME', 'NH'],
          state_counts: {},
          total_states: 21,
          total_therapists: 0
        });
        setError(null); // Clear error since we have fallback data
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch available states');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableStates();
  }, [paymentType]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    availableStates: data?.available_states || [],
    stateCounts: data?.state_counts || {},
    isLoading,
    error,
    refetch: fetchAvailableStates
  };
};

export default useAvailableStates;