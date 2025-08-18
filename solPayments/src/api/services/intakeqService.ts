// src/api/services/intakeqService.ts
import axios from '@/api/axios';

export interface IntakeQClientData {
  // Basic Info
  first_name: string;
  last_name: string;
  preferred_name?: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  
  // Demographics
  gender?: string;
  state?: string;
  age?: string;
  
  // Payment Info
  payment_type: 'insurance' | 'cash_pay';
  
  // Insurance specific (only for insurance clients)
  insurance_provider?: string;
  insurance_member_id?: string;
  insurance_date_of_birth?: string;
  insurance_verification_data?: string;
  
  // Therapy preferences
  therapist_specializes_in?: string[];
  therapist_identifies_as?: string;
  
  // Mental health screening data
  phq9_scores?: Record<string, string>;
  gad7_scores?: Record<string, string>;
  
  // Additional info
  response_id: string;
  client_id?: string;
}

export interface IntakeQResponse {
  success: boolean;
  client_id?: string;
  intake_url?: string;
  error?: string;
}

export class IntakeQService {
  /**
   * Create IntakeQ client profile via backend API (resolves CORS issues)
   */
  static async createClientProfile(clientData: IntakeQClientData): Promise<IntakeQResponse> {
    try {
      console.log(`🔄 Creating IntakeQ profile via backend for ${clientData.payment_type} client:`, {
        email: clientData.email,
        preferred_name: clientData.preferred_name,
        payment_type: clientData.payment_type,
        has_insurance_data: !!(clientData.insurance_provider),
        response_id: clientData.response_id
      });

      // Call your backend endpoint instead of IntakeQ directly
      const response = await axios.post('/intakeq/create-client', clientData);
      
      console.log(`✅ IntakeQ profile created successfully via backend:`, {
        client_id: response.data.client_id,
        intake_url: response.data.intake_url,
        payment_type: clientData.payment_type
      });

      return {
        success: true,
        client_id: response.data.client_id,
        intake_url: response.data.intake_url
      };

    } catch (error) {
      console.error('❌ IntakeQ profile creation failed via backend:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Backend integration error'
      };
    }
  }

  /**
   * Get IntakeQ client by email via backend (for checking existing profiles)
   */
  static async getClientByEmail(email: string, paymentType: 'insurance' | 'cash_pay'): Promise<unknown> {
    try {
      const response = await axios.get(`/intakeq/client?email=${encodeURIComponent(email)}&payment_type=${paymentType}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching IntakeQ client via backend:', error);
      return null;
    }
  }
}

export default IntakeQService; 