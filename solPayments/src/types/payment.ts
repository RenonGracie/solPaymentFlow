// src/types/payment.ts - Updated with proper types

export type PaymentType = "insurance" | "cash_pay";

export interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth?: string;
  memberId?: string;
  provider?: string;
  paymentType?: string;
}

export interface ModalContinueData {
  type: string;
  formData: FormData;
}

export interface TypeformHiddenFields {
  payment_type: string;
  first_name: string;
  last_name: string;
  email: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  client_id: string;
  insurance_provider?: string;
}

export interface TypeformSubmitEvent {
  responseId: string;
}