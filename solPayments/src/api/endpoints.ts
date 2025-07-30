export const ENDPOINTS = {
    THERAPISTS: {
      GET_MATCH: '/therapists/match',
      GET_CALENDAR_EVENTS: '/therapists/calendar_events',
      GET_SLOTS: '/therapists/slots',
    },
    APPOINTMENTS: {
      BOOK_APPOINTMENT: '/appointments',
    },
    CLIENTS_SIGNUP_FORMS: {
      GET_FORM: '/clients_signup',
    },
    INTAKEQ_FORMS: {
      SEND_MANDATORY_FORM: '/intakeq_forms/mandatory_form',
    },
  } as const;