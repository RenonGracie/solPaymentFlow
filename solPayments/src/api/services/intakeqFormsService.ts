import { ENDPOINTS } from '../endpoints';
import { useRequest } from '../hooks/useRequest';

type SendMandatoryFormData = {
  client_email: string;
  client_name: string;
  therapist_email: string;
};

export type SendMandatoryFormResponse = {
  success: boolean;
  message: string;
  form_id?: string;
};

export const useIntakeqFormsService = () => {
  return {
    sendMandatoryForm: useRequest<
      never,
      SendMandatoryFormData,
      SendMandatoryFormResponse
    >(ENDPOINTS.INTAKEQ_FORMS.SEND_MANDATORY_FORM, 'POST'),
  };
};