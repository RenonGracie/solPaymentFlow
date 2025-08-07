// solPayments/src/api/hooks/useTherapistSearch.ts
import { useState, useCallback, useEffect } from 'react';
import axiosInstance from '../axios';

interface SearchedTherapist {
  id: string;
  name: string;
  email: string;
  program: string;
  states: string[];
}

interface UseTherapistSearchProps {
  paymentType: 'insurance' | 'cash_pay';
  clientState: string; // Add client state as required prop
}

export const useTherapistSearch = ({ paymentType, clientState }: UseTherapistSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedTherapist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchTherapists = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    if (!clientState) {
      setSearchError('State is required for therapist search');
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await axiosInstance.get('/therapists/search', {
        params: {
          q: query,
          payment_type: paymentType,
          state: clientState // Pass the client's state
        }
      });

      setSearchResults(response.data.therapists || []);
      
      if (response.data.therapists?.length === 0) {
        setSearchError(`No therapists found matching "${query}" in ${clientState}`);
      }
    } catch (error) {
      console.error('Error searching therapists:', error);
      setSearchError('Failed to search therapists. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [paymentType, clientState]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchTherapists(searchQuery);
      } else {
        setSearchResults([]);
        setSearchError(null);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, searchTherapists]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchError
  };
};