// Survey type definitions
export interface SurveyFormData {
    // Basic Info
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth: string;
    memberId?: string;
    provider?: string;
    paymentType: 'insurance' | 'cash_pay';
    
    // Demographics
    phone: string;
    gender: string;
    age: string;
    state: string;
    
    // Therapy preferences
    therapist_specializes_in: string[];
    therapist_identifies_as: string;
    lived_experiences: string[];
    
    // Mental health screening
    alcohol: string;
    drugs: string;
    pleasure_doing_things: string;
    feeling_down: string;
    trouble_falling: string;
    feeling_tired: string;
    poor_appetite: string;
    feeling_bad_about_yourself: string;
    trouble_concentrating: string;
    moving_or_speaking_so_slowly: string;
    suicidal_thoughts: string;
    
    // Anxiety screening
    feeling_nervous: string;
    not_control_worrying: string;
    worrying_too_much: string;
    trouble_relaxing: string;
    being_so_restless: string;
    easily_annoyed: string;
    feeling_afraid: string;
    
    // Additional info
    university?: string;
    what_brings_you: string;
    promo_code?: string;
    referred_by?: string;
    therapist_name?: string;
    
    // UTM tracking
    utm?: Record<string, unknown>;
  }