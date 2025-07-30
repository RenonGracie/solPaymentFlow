import { MatchResponse, BookAppointmentResponse, SlotsResponse } from '@/api/services';

export type TMatchedTherapistData = NonNullable<
  MatchResponse['therapists']
>[number];

export interface IBookingState {
  showSection: boolean;
  selectedSlot?: string;
  selectedDay?: Date;
}

export interface ICurrentTherapistState {
  currentIndex: number;
  currentTherapist?: TMatchedTherapistData;
}