import { createContext } from 'react';
import { BookAppointmentResponse, SlotsResponse } from '@/api/services';
import { TMatchedTherapistData, IBookingState } from '../api/types/therapist.types';

interface ITherapistContext {
  currentTherapist?: TMatchedTherapistData;
  bookingState: IBookingState;
  bookingData: BookAppointmentResponse | null;
  clientResponseId: string | null;
  previousTherapistsList: TMatchedTherapistData[] | null;
  utmUserId: number | undefined;
  therapistsList?: TMatchedTherapistData[];
  onFindAnotherTherapist: () => void;
  onShowBooking: () => void;
  onHideBooking: () => void;
  onBookSession: (data: BookAppointmentResponse) => void;
  onSlotSelect: (slot: string) => void;
  onDaySelect: (day: Date | undefined) => void;
  onViewPreviousTherapist: (therapistId: string) => void;
  setIsSearchingAnotherTherapist: (isFinding: boolean) => void;
  onUpdateTherapistTimeSlots: (
    therapistEmail: string,
    availableSlots: SlotsResponse['available_slots'],
  ) => void;
}

export const TherapistContext = createContext<
  ITherapistContext | undefined
>(undefined);