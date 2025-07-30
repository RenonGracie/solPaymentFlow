import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';

import {
  useClientsSignupFormsService,
  useTherapistsService,
} from '../api/services';
import { TApiError } from '../api/types/errors';
import { formatApiError } from '../lib/errorUtils';

const I_DO_NOT_SEE_MY_STATE = "I don't see my state";
const LANDING_PAGE_URL = 'https://solhealth.co/';

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
            await getMatch({
              params: { limit: 10, response_id: responseId },
            });
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
    [getForm, getMatch],
  );

  return {
    matchData,
    error,
    loading,
    utmUserId,
    pollFormAndRequestMatch,
  };
};