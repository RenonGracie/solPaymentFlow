import axiosInstance from '../axios';

export interface StateAvailabilityResponse {
  payment_type: string;
  available_states: string[];
  state_counts: Record<string, number>;
  total_states: number;
  total_therapists: number;
}

export class StateAvailabilityService {
  /**
   * Get available states based on payment type and accepting therapists
   */
  static async getAvailableStates(paymentType: 'cash_pay' | 'insurance' = 'cash_pay'): Promise<StateAvailabilityResponse> {
    try {
      const response = await axiosInstance.get('/therapists/available-states', {
        params: {
          payment_type: paymentType
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching available states:', error);
      throw error;
    }
  }
}

export default StateAvailabilityService;