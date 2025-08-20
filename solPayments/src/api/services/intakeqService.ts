// src/api/services/intakeqService.ts
import axios from '../axios';

// Extended interface to include all possible IntakeQ fields
export interface IntakeQClientData {
  // Basic Required Fields
  response_id: string;
  first_name: string;
  last_name: string;
  email: string;
  payment_type: 'cash_pay' | 'insurance';
  
  // Optional Basic Fields
  preferred_name?: string;
  middle_name?: string;
  phone?: string;
  mobile_phone?: string;
  date_of_birth?: string;
  gender?: string;
  
  // Address Information
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  
  // Demographics & Personal Info
  age?: string;
  marital_status?: string;
  race_ethnicity?: string[];
  lived_experiences?: string[];
  university?: string;
  referred_by?: string;
  
  // Mental Health Screening (PHQ-9)
  phq9_scores?: {
    pleasure_doing_things?: string;
    feeling_down?: string;
    trouble_falling?: string;
    feeling_tired?: string;
    poor_appetite?: string;
    feeling_bad_about_yourself?: string;
    trouble_concentrating?: string;
    moving_or_speaking_so_slowly?: string;
    suicidal_thoughts?: string;
  };
  
  // Anxiety Screening (GAD-7)
  gad7_scores?: {
    feeling_nervous?: string;
    not_control_worrying?: string;
    worrying_too_much?: string;
    trouble_relaxing?: string;
    being_so_restless?: string;
    easily_annoyed?: string;
    feeling_afraid?: string;
  };
  
  // Substance Use Screening
  alcohol_frequency?: string;
  recreational_drugs_frequency?: string;
  
  // Therapist Preferences
  therapist_gender_preference?: string;
  therapist_specialization?: string[];
  therapist_lived_experiences?: string[];
  
  // Insurance Information (for insurance clients)
  insurance_provider?: string;
  insurance_member_id?: string;
  insurance_date_of_birth?: string;
  insurance_verification_data?: string; // JSON string of verification response
  
  // Insurance Benefits (if available)
  copay?: string;
  deductible?: string;
  coinsurance?: string;
  out_of_pocket_max?: string;
  remaining_deductible?: string;
  remaining_oop_max?: string;
  member_obligation?: string;
  benefit_structure?: string;
  
  // Additional Context
  safety_screening?: string;
  matching_preference?: string;
  what_brings_you?: string;
  
  // Custom fields for tracking
  sol_health_response_id?: string;
  onboarding_completed_at?: string;
  survey_completed_at?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface IntakeQResponse {
  success: boolean;
  client_id?: string;
  intake_url?: string;
  error?: string;
}

export class IntakeQService {
  /**
   * Create comprehensive IntakeQ client profile via backend API
   */
  static async createClientProfile(clientData: IntakeQClientData | Record<string, unknown>): Promise<IntakeQResponse> {
    try {
      const data = clientData as Record<string, unknown>;
      console.log(`🔄 Creating comprehensive IntakeQ profile via backend for ${data.payment_type} client:`, {
        email: data.email,
        preferred_name: data.preferred_name,
        first_name: data.first_name,
        last_name: data.last_name,
        payment_type: data.payment_type,
        has_insurance_data: !!(data.insurance_provider),
        has_phq9_scores: !!(data.phq9_scores),
        has_gad7_scores: !!(data.gad7_scores),
        has_therapist_preferences: !!(data.therapist_gender_preference || (data.therapist_specialization as unknown[])?.length),
        response_id: data.response_id,
        total_fields: Object.keys(clientData).length
      });

      // Call your backend endpoint with comprehensive data
      const response = await axios.post('/intakeq/create-client', clientData);

      console.log(`✅ Comprehensive IntakeQ profile created successfully via backend:`, {
        client_id: response.data.client_id,
        intake_url: response.data.intake_url,
        payment_type: clientData.payment_type,
        fields_sent: Object.keys(clientData).length
      });

      return {
        success: true,
        client_id: response.data.client_id,
        intake_url: response.data.intake_url
      };

    } catch (error) {
      console.error('❌ Comprehensive IntakeQ profile creation failed via backend:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Backend integration error'
      };
    }
  }

  /**
   * Get client by email via backend API  
   */
  static async getClientByEmail(email: string, paymentType: 'cash_pay' | 'insurance'): Promise<unknown> {
    try {
      console.log(`🔍 Searching for existing IntakeQ client via backend:`, {
        email,
        payment_type: paymentType
      });

      const response = await axios.get('/intakeq/client', {
        params: { email, payment_type: paymentType }
      });

      console.log(`✅ IntakeQ client search completed via backend:`, {
        found: !!response.data,
        email
      });

      return response.data;

    } catch (error) {
      console.error('❌ IntakeQ client search failed via backend:', error);
      return null;
    }
  }
}

export default IntakeQService; 