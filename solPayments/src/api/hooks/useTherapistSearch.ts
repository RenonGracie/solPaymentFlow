// solPayments/src/api/hooks/useTherapistSearch.ts
import { useState, useCallback, useEffect } from 'react';
import axiosInstance from '../axios';

interface SearchedTherapist {
  id: string;
  name: string;
  email: string;
  program: string;
  states: string[];
  accepting_new_clients?: boolean;
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
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  const searchTherapists = useCallback(async (query: string, isInitialLoad = false) => {
    // Allow initial load with empty query, but regular search needs 2+ characters
    if (!isInitialLoad && (!query || query.length < 2)) {
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
          q: query || '', // Allow empty query for initial load
          payment_type: paymentType,
          state: clientState, // Pass the client's state
          accepting_new_clients: true,
          limit: isInitialLoad ? 10 : undefined, // Get more results for initial load
        }
      });

      const therapists: SearchedTherapist[] = response.data.therapists || [];

      // Extra safety: enforce accepting filter client-side too if API doesn't apply it
      const filtered = therapists.filter((t) => t.accepting_new_clients !== false);

      setSearchResults(filtered);
      
      if (filtered.length === 0) {
        const message = isInitialLoad 
          ? `No therapists available in ${clientState} for ${paymentType} payment`
          : `No therapists found matching "${query}" in ${clientState}`;
        setSearchError(message);
      } else if (isInitialLoad) {
        console.log(`[Initial Load] Found ${filtered.length} therapists in ${clientState} for ${paymentType}`);
      }
    } catch (error) {
      console.error('Error searching therapists:', error);
      setSearchError('Failed to search therapists. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [paymentType, clientState]);

  // Load initial therapists when component mounts
  useEffect(() => {
    if (clientState && paymentType && !hasInitialLoad) {
      console.log(`[Initial Load] Loading therapists for ${clientState}, ${paymentType}`);
      searchTherapists('', true); // Empty query, initial load
      setHasInitialLoad(true);
    }
  }, [clientState, paymentType, hasInitialLoad, searchTherapists]);

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
    searchError,
    hasInitialLoad
  };
};