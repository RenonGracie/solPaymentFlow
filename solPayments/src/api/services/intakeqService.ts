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
  
  // Address Information (IntakeQ Standard Fields)
  Address?: string; // Full formatted address
  StreetAddress?: string;
  UnitNumber?: string;
  City?: string;
  State?: string;
  StateShort?: string;
  PostalCode?: string;
  Country?: string;
  
  // Legacy address fields
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
  
  // Insurance Information (for insurance clients) - IntakeQ Standard Fields
  PrimaryInsuranceCompany?: string;
  PrimaryInsurancePayerId?: string;
  PrimaryInsurancePolicyNumber?: string;
  PrimaryInsuranceGroupNumber?: string;
  PrimaryInsuranceHolderName?: string;
  PrimaryInsuranceRelationship?: string;
  PrimaryInsuranceHolderDateOfBirth?: number; // timestamp
  PrimaryRelationshipToInsured?: string;
  PrimaryInsurancePlan?: string;
  PrimaryInsuredGender?: string;
  PrimaryInsuredCity?: string;
  PrimaryInsuredZipCode?: string;
  PrimaryInsuredState?: string;
  PrimaryInsuredStreetAddress?: string;
  BillingType?: number; // 2 = insurance
  
  // Secondary Insurance (if available)
  SecondaryInsuranceCompany?: string;
  SecondaryInsurancePayerId?: string;
  SecondaryInsurancePolicyNumber?: string;
  SecondaryInsuranceGroupNumber?: string;
  SecondaryInsuranceHolderName?: string;
  SecondaryInsuranceRelationship?: string;
  SecondaryInsuranceHolderDateOfBirth?: number;
  SecondaryRelationshipToInsured?: string;
  
  // Legacy fields for backward compatibility
  insurance_provider?: string;
  insurance_member_id?: string;
  insurance_date_of_birth?: string;
  insurance_verification_data?: string; // JSON string of verification response
  
  // Insurance Benefits (custom fields in IntakeQ)
  copay?: string;
  deductible?: string;
  coinsurance?: string;
  out_of_pocket_max?: string;
  remaining_deductible?: string;
  remaining_oop_max?: string;
  member_obligation?: string;
  benefit_structure?: string;
  
  // Extended Insurance Information from Nirvana (custom fields)
  insurance_type?: string;
  plan_status?: string;
  coverage_status?: string;
  mental_health_coverage_status?: string;
  sessions_before_deductible_met?: number;
  sessions_before_oop_max_met?: number;
  telehealth_coinsurance?: string;
  telehealth_benefit_structure?: string;
  pre_deductible_member_obligation?: string;
  post_deductible_member_obligation?: string;
  
  // Extended Financial Information (raw cents values for backend processing)
  insurance_copayment_cents?: number;
  insurance_coinsurance_percent?: number;
  insurance_deductible_cents?: number;
  insurance_remaining_deductible_cents?: number;
  insurance_oop_max_cents?: number;
  insurance_remaining_oop_max_cents?: number;
  insurance_member_obligation_cents?: number;
  insurance_payer_obligation_cents?: number;
  insurance_pre_deductible_member_obligation_cents?: number;
  insurance_pre_deductible_payer_obligation_cents?: number;
  insurance_post_deductible_member_obligation_cents?: number;
  insurance_post_deductible_payer_obligation_cents?: number;
  insurance_post_oop_max_member_obligation_cents?: number;
  insurance_post_oop_max_payer_obligation_cents?: number;
  
  // Session Tracking
  insurance_remaining_sessions_before_deductible?: number;
  insurance_remaining_sessions_before_oop_max?: number;
  
  // Plan Benefits
  insurance_additional_policy?: string;
  insurance_fee_schedule?: string;
  insurance_qmb_status?: string;
  insurance_third_party_payer?: string;
  insurance_plan_reset_soon?: boolean;
  insurance_reset_benefits_status?: string;
  insurance_reset_benefits?: string;
  
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