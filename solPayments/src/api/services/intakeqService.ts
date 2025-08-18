// src/api/services/intakeqService.ts
import axios from '@/api/axios';

// IntakeQ API configuration
const INTAKEQ_CONFIG = {
  cash_pay: {
    api_key: process.env.NEXT_PUBLIC_CASH_PAY_INTAKEQ_API_KEY || '',
    base_url: 'https://intakeq.com/api/v1'
  },
  insurance: {
    api_key: process.env.NEXT_PUBLIC_INSURANCE_INTAKEQ_API_KEY || '',
    base_url: 'https://intakeq.com/api/v1'
  }
};

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
   * Create IntakeQ client profile based on payment type
   */
  static async createClientProfile(clientData: IntakeQClientData): Promise<IntakeQResponse> {
    try {
      const config = INTAKEQ_CONFIG[clientData.payment_type];
      
      if (!config.api_key) {
        throw new Error(`Missing IntakeQ API key for payment type: ${clientData.payment_type}`);
      }

      // Prepare client payload for IntakeQ
      const intakeQPayload = {
        first_name: clientData.preferred_name || clientData.first_name,
        last_name: clientData.last_name,
        email: clientData.email,
        phone: clientData.phone || '',
        date_of_birth: clientData.date_of_birth || clientData.insurance_date_of_birth,
        
        // Custom fields based on payment type
        custom_fields: {
          payment_type: clientData.payment_type,
          response_id: clientData.response_id,
          preferred_name: clientData.preferred_name,
          state: clientData.state,
          gender: clientData.gender,
          
          // Insurance-specific fields
          ...(clientData.payment_type === 'insurance' && {
            insurance_provider: clientData.insurance_provider,
            insurance_member_id: clientData.insurance_member_id,
            insurance_verification_data: clientData.insurance_verification_data,
          }),
          
          // Mental health screening
          ...(clientData.phq9_scores && { phq9_data: JSON.stringify(clientData.phq9_scores) }),
          ...(clientData.gad7_scores && { gad7_data: JSON.stringify(clientData.gad7_scores) }),
          
          // Therapy preferences
          ...(clientData.therapist_specializes_in && { 
            specialization_preferences: clientData.therapist_specializes_in.join(', ') 
          }),
          therapist_gender_preference: clientData.therapist_identifies_as,
        }
      };

      console.log(`🔄 Creating IntakeQ profile for ${clientData.payment_type} client:`, {
        email: clientData.email,
        preferred_name: clientData.preferred_name,
        payment_type: clientData.payment_type,
        has_insurance_data: !!(clientData.insurance_provider),
        response_id: clientData.response_id
      });

      // Call IntakeQ API directly
      const response = await fetch(`${config.base_url}/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(intakeQPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IntakeQ API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      console.log(`✅ IntakeQ profile created successfully:`, {
        client_id: result.id,
        intake_url: result.intake_url,
        payment_type: clientData.payment_type
      });

      return {
        success: true,
        client_id: result.id,
        intake_url: result.intake_url
      };

    } catch (error) {
      console.error('❌ IntakeQ profile creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get IntakeQ client by email (for checking existing profiles)
   */
  static async getClientByEmail(email: string, paymentType: 'insurance' | 'cash_pay'): Promise<unknown> {
    try {
      const config = INTAKEQ_CONFIG[paymentType];
      
      const response = await fetch(`${config.base_url}/clients?email=${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`IntakeQ API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching IntakeQ client:', error);
      return null;
    }
  }
}

export default IntakeQService; 