import { ENDPOINTS } from '../endpoints';
import { useRequest } from '../hooks/useRequest';

type GetFormParams = {
  response_id: string;
};

export type GetFormResponse = {
  id: string;
  response_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  age?: string;
  state?: string;
  therapist_specializes_in?: string[];
  therapist_identifies_as?: string;
  alcohol?: string;
  drugs?: string;
  pleasure_doing_things?: string;
  feeling_down?: string;
  trouble_falling?: string;
  feeling_tired?: string;
  poor_appetite?: string;
  feeling_bad_about_yourself?: string;
  trouble_concentrating?: string;
  moving_or_speaking_so_slowly?: string;
  suicidal_thoughts?: string;
  feeling_nervous?: string;
  not_control_worrying?: string;
  worrying_too_much?: string;
  trouble_relaxing?: string;
  being_so_restless?: string;
  easily_annoyed?: string;
  feeling_afraid?: string;
  university?: string;
  what_brings_you?: string;
  lived_experiences?: string[];
  promo_code?: string;
  referred_by?: string;
  therapist_name?: string;
  utm?: Record<string, unknown>;
};

export const useClientsSignupFormsService = () => {
  return {
    form: useRequest<GetFormParams, never, GetFormResponse>(
      ENDPOINTS.CLIENTS_SIGNUP_FORMS.GET_FORM,
    ),
  };
};