import { ENDPOINTS } from '../endpoints';
import { useRequest } from '../hooks/useRequest';

type BookAppointmentData = {
  client_response_id: string;
  therapist_email: string;
  therapist_name: string;
  datetime: string;
  send_client_email_notification: boolean;
  reminder_type?: string;
  status: string;
};

export type BookAppointmentResponse = {
  EndDateLocal?: string;
  DateCreated?: number;
  LocationName?: string;
  StartDate?: number;
  LastModified?: number;
  FullCancellationReason?: string;
  ClientName?: string;
  EndDateIso?: string;
  StartDateLocalFormatted?: string;
  ClientId?: string;
  StartDateIso: string;
  PractitionerName?: string;
  ReminderType?: string;
  Status?: string;
  CreatedBy?: string;
  CancellationDate?: string;
  LocationId?: string;
  Duration?: number;
  PractitionerId?: string;
  ClientEmail?: string;
  EndDate?: number;
  BookedByClient?: boolean;
  AdditionalClients?: Array<{
    ClientId?: string;
    ClientName?: string;
    ClientEmail?: string;
    ClientPhone?: string;
    IntakeId?: string;
  }>;
  CustomFields?: Array<{
    FieldId?: string;
    Value?: string;
    Text?: string;
  }>;
  Price?: number;
  AttendanceConfirmationResponse?: string;
  Id?: string;
  PractitionerEmail?: string;
  StartDateLocal?: string;
};

export const useAppointmentsService = () => {
  return {
    bookAppointment: useRequest<
      never,
      BookAppointmentData,
      BookAppointmentResponse
    >(ENDPOINTS.APPOINTMENTS.BOOK_APPOINTMENT, 'POST'),
  };
};