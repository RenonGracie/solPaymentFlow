import { ENDPOINTS } from '../endpoints';
import { useRequest } from '../hooks/useRequest';

// Types based on the API structure from solHealthFE
type MatchParams = {
  limit?: number;
  last_index?: number;
  response_id: string;
};

// In src/api/services/therapistsService.ts, update the therapist type to include specialities:

export type MatchResponse = {
  client?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    response_id?: string;
  };
  therapists: Array<{
    therapist: {
      id: string;
      intern_name?: string;
      age?: string;
      email?: string;
      calendar_email?: string;
      biography?: string;
      availability?: string[];
      available_slots?: string[];
      birth_order?: string;
      caretaker_role?: boolean;
      caseload_tracker?: string;
      has_children?: boolean;
      cohort?: string;
      current_caseload?: number;
      diagnoses?: string[];  // Add this
      specialities?: string[];  // Add this
      diagnoses_specialities?: string[];
      diagnoses_specialties_array?: string[];
      ethnicity?: string[];
      gender?: string;
      identities_as?: string;
      gender_interest?: string;
      immigration_background?: string;
      lgbtq_part?: boolean;
      culture?: string;
      places?: string;
      married?: boolean;
      max_caseload?: string | number;
      neurodivergence?: string;
      performing?: boolean;
      program?: string;
      religion?: string[];
      experience_with_risk_clients?: string;
      working_with_lgbtq_clients?: string;
      negative_affect_by_social_media?: boolean;
      states?: string[];
      therapeutic_orientation?: string[];
      internal_therapeutic_orientation?: string[] | string;
      family_household?: string;
      welcome_video_link?: string;
      greetings_video_link?: string;
      image_link?: string | null;  // Update to allow null
      accepting_new_clients?: boolean;
      // Add any other missing properties from the CSV
      risk_experience?: string;
      lgbtq_experience?: string;
      neurodivergence_experience?: string;
    };
    score: number;
    matched_diagnoses_specialities: string[];
  }>;
};

type SlotsParams = {
  email: string;
  state?: string;
  response_id?: string;
};

export type SlotsResponse = {
  available_slots?: string[];
};

export const useTherapistsService = () => {
  return {
    match: useRequest<MatchParams, never, MatchResponse>(
      ENDPOINTS.THERAPISTS.GET_MATCH,
    ),
    slots: useRequest<SlotsParams, never, SlotsResponse>(
      ENDPOINTS.THERAPISTS.GET_SLOTS,
    ),
  };
};