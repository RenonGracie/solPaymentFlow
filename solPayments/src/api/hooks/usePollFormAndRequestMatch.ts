import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';

import {
  useClientsSignupFormsService,
  useTherapistsService,
} from '@/api/services';
import { TApiError } from '@/api/types/errors';
import { TMatchedTherapistData } from '@/api/types/therapist.types';
import { formatApiError } from '@/lib/errorUtils';

const I_DO_NOT_SEE_MY_STATE = "I don't see my state";
const LANDING_PAGE_URL = 'https://solhealth.co/';

// Helper function to check if a therapist has availability in the current month
const checkTherapistAvailability = async (therapist: TMatchedTherapistData['therapist']): Promise<boolean> => {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
    const email = therapist.calendar_email || therapist.email;
    
    if (!email) return false;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // Convert to 1-based month
    const timezone = 'America/New_York'; // Default timezone
    
    const url = new URL(`/therapists/${encodeURIComponent(email)}/availability`, API_BASE);
    url.searchParams.set("year", String(currentYear));
    url.searchParams.set("month", String(currentMonth));
    url.searchParams.set("timezone", timezone);
    
    const response = await fetch(url.toString());
    if (!response.ok) return false;
    
    const availability = await response.json();
    
    // Check if there are any available days in the current month
    if (!availability?.days) return false;
    
    // Check if any day has available slots
    for (const dayNum in availability.days) {
      const dayData = availability.days[dayNum];
      if (dayData?.sessions && dayData.sessions.length > 0) {
        return true;
      }
      if (dayData?.slots && dayData.slots.some((slot: any) => slot.is_free)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.warn(`Failed to check availability for therapist ${therapist.email}:`, error);
    // If availability check fails, include the therapist (fail open)
    return true;
  }
};

export const usePollFormAndRequestMatch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [utmUserId, setUtmUserId] = useState<number | undefined>();

  const {
    form: { makeRequest: getForm },
  } = useClientsSignupFormsService();

  const {
    match: { data: matchData, makeRequest: getMatch },
  } = useTherapistsService();

  const handleError = (error: AxiosError<TApiError>) => {
    const errorMessage = error.response?.data
      ? formatApiError(error.response.data)
      : error.message;

    setError(errorMessage);
  };

  const pollFormAndRequestMatch = useCallback(
    async (
      responseId: string,
      delay = 3000,
      maxAttempts = 20,
    ): Promise<void> => {
      setLoading(true);

      let attempts = 0;

      const pollStatus = async (): Promise<void> => {
        attempts++;

        let formResponse;

        try {
          formResponse = await getForm({
            params: {
              response_id: responseId,
            },
          });
        } catch (error) {
          if (attempts >= maxAttempts) {
            handleError(error as AxiosError<TApiError>);
            throw error;
          }

          await new Promise((resolve) => setTimeout(resolve, delay));

          return pollStatus();
        }

        if (formResponse) {
          if (formResponse.state === I_DO_NOT_SEE_MY_STATE) {
            window.location.href = LANDING_PAGE_URL;
            return;
          }

          const userId: number | undefined = formResponse.utm?.user_id as number | undefined;

          if (userId) {
            setUtmUserId(userId);
          }

          try {
            const matchResponse = await getMatch({
              params: { limit: 10, response_id: responseId },
            });
            
            console.log('Match API Response:', matchResponse);
            console.log('Therapists data (before availability filtering):', matchData?.therapists);
            
            // Filter therapists by availability
            if (matchData?.therapists && matchData.therapists.length > 0) {
              console.log('🔍 Filtering therapists by availability...');
              
              const availabilityChecks = matchData.therapists.map(async (therapistData) => {
                const hasAvailability = await checkTherapistAvailability(therapistData.therapist);
                console.log(`✅ ${therapistData.therapist.intern_name} (${therapistData.therapist.email}) has availability: ${hasAvailability}`);
                return hasAvailability ? therapistData : null;
              });
              
              const availableTherapists = (await Promise.all(availabilityChecks))
                .filter((therapist): therapist is TMatchedTherapistData => therapist !== null);
              
              console.log(`📊 Availability filtering results: ${availableTherapists.length}/${matchData.therapists.length} therapists have availability`);
              
              if (availableTherapists.length === 0) {
                console.warn('⚠️ No therapists with availability found - all matched therapists are unavailable');
              }
              
              // Update the match data with filtered therapists
              // Note: This is a bit hacky since we're modifying the response after the fact
              // but it's the cleanest way to filter without major refactoring
              (matchData as any).therapists = availableTherapists;
            }
          } catch (error) {
            handleError(error as AxiosError<TApiError>);
            throw error;
          }
        }

        setLoading(false);
        return;
      };

      return pollStatus();
    },
    [getForm, getMatch, matchData?.therapists],
  );

  return {
    matchData,
    error,
    loading,
    utmUserId,
    pollFormAndRequestMatch,
  };
};