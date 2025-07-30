// src/types/payment.ts

export type PaymentType = "insurance" | "cash_pay";

export interface FormData {
  firstName: string;
  lastName: string;
  email: string;
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
}

export interface TypeformSubmitEvent {
  responseId: string;
}