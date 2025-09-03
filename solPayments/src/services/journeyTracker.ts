// src/services/journeyTracker.ts
/**
 * Frontend journey tracking service
 * Integrates with backend Google Sheets tracking
 */

interface JourneyData {
    response_id: string;
    stage: string;
    data?: Record<string, unknown>;
    reason?: string;
  }
  
  interface ClientData {
    response_id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    state?: string;
    payment_type?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    [key: string]: unknown;
  }
  
  interface TherapistData {
    therapist?: {
      id?: string;
      intern_name?: string;
      email?: string;
      program?: string;
      states_array?: string[];
      [key: string]: unknown;
    };
    score?: number;
    matched_diagnoses_specialities?: string[];
    [key: string]: unknown;
  }
  
  interface BookingContext {
    selectedTimeSlot?: string;
    selectedDate?: string;
    selectedDateLocal?: string;
    paymentType?: string;
    timezone?: string;
    timezoneDisplay?: string;
    sessionDuration?: number;
    therapistCategory?: string;
    [key: string]: unknown;
  }
  
  class JourneyTracker {
    private baseUrl: string;
    private enabled: boolean = true;
  
    constructor() {
      // Use the same base URL as your API
      this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
    }
  
    /**
     * Track when user starts the journey
     */
    async trackJourneyStart(clientData: ClientData) {
      if (!this.enabled || !clientData.response_id) return;
  
      try {
        console.log('📊 [Journey Tracker] Journey started:', clientData.response_id);
        
        // The backend will handle this when client data is first submitted
        // This is more for frontend logging/debugging
      } catch (error) {
        console.error('Failed to track journey start:', error);
      }
    }
  
    /**
     * Track detailed client data entry
     */
    async trackDataEntry(clientData: ClientData) {
      if (!this.enabled || !clientData.response_id) return;
  
      try {
        console.log('📊 [Journey Tracker] Data entered for:', clientData.response_id);
        console.log('📊 [Journey Tracker] Client data:', {
          email: clientData.email,
          state: clientData.state,
          payment_type: clientData.payment_type,
          utm_params: {
            utm_source: clientData.utm_source,
            utm_medium: clientData.utm_medium,
            utm_campaign: clientData.utm_campaign
          }
        });
  
        // Backend handles this automatically, but we can add frontend-specific tracking here
      } catch (error) {
        console.error('Failed to track data entry:', error);
      }
    }
  
    /**
     * Track therapist match found with detailed context
     */
    async trackMatchFound(clientData: ClientData, therapistData: TherapistData) {
      if (!this.enabled || !clientData.response_id) return;
  
      try {
        console.log('📊 [Journey Tracker] Match found for:', clientData.response_id);
        console.log('📊 [Journey Tracker] Therapist match:', {
          therapist_id: therapistData.therapist?.id,
          therapist_name: therapistData.therapist?.intern_name,
          match_score: therapistData.score,
          matched_specialties: therapistData.matched_diagnoses_specialities,
          client_state: clientData.state,
          payment_type: clientData.payment_type
        });
  
        // Backend handles this automatically, but we can add frontend-specific tracking here
      } catch (error) {
        console.error('Failed to track match found:', error);
      }
    }
  
    /**
     * Track when user starts booking process with rich context
     */
    async trackBookingStarted(clientData: ClientData, therapistData: TherapistData, bookingContext: BookingContext) {
      if (!this.enabled || !clientData.response_id) return;
  
      try {
        console.log('📊 [Journey Tracker] Booking started for:', clientData.response_id);
        console.log('📊 [Journey Tracker] Booking context:', bookingContext);
  
        // Send detailed booking context to backend for enhanced tracking
        await this.sendToBackend('/track-booking-context', {
          response_id: clientData.response_id,
          stage: 'booking_started',
          data: {
            client_data: {
              email: clientData.email,
              first_name: clientData.first_name,
              last_name: clientData.last_name,
              state: clientData.state,
              payment_type: clientData.payment_type
            },
            therapist_data: {
              therapist_id: therapistData.therapist?.id,
              therapist_name: therapistData.therapist?.intern_name,
              therapist_email: therapistData.therapist?.email,
              match_score: therapistData.score,
              program: therapistData.therapist?.program,
              states_array: therapistData.therapist?.states_array
            },
            booking_context: bookingContext,
            frontend_timestamp: new Date().toISOString()
          }
        });
  
      } catch (error) {
        console.error('Failed to track booking started:', error);
      }
    }
  
    /**
     * Track user dropdown/exit with context
     */
    async trackDropout(response_id: string, stage: string, reason: string = '', additionalData?: Record<string, unknown>) {
      if (!this.enabled || !response_id) return;
  
      try {
        console.log(`📊 [Journey Tracker] Dropout at ${stage}:`, response_id, reason);
  
        await this.sendToBackend('/track-dropout', {
          response_id,
          stage,
          reason,
          data: additionalData,
          frontend_timestamp: new Date().toISOString()
        });
  
      } catch (error) {
        console.error('Failed to track dropout:', error);
      }
    }
  
    /**
     * Track successful appointment booking
     */
    async trackAppointmentBooked(clientData: ClientData, appointmentData: Record<string, unknown>) {
      if (!this.enabled || !clientData.response_id) return;
  
      try {
        console.log('📊 [Journey Tracker] Appointment booked for:', clientData.response_id);
        console.log('📊 [Journey Tracker] Appointment data:', appointmentData);
  
        // Backend handles this automatically, but we log for debugging
      } catch (error) {
        console.error('Failed to track appointment booked:', error);
      }
    }
  
    /**
     * Track user interactions like calendar navigation, therapist video views, etc.
     */
    async trackInteraction(response_id: string, interactionType: string, data: Record<string, unknown>) {
      if (!this.enabled || !response_id) return;
  
      try {
        console.log(`📊 [Journey Tracker] Interaction (${interactionType}):`, response_id);
  
        // Send interaction data for detailed analytics
        await this.sendToBackend('/track-interaction', {
          response_id,
          interaction_type: interactionType,
          data,
          timestamp: new Date().toISOString()
        });
  
      } catch (error) {
        console.error('Failed to track interaction:', error);
      }
    }
  
    /**
     * Track page unload/exit
     */
    trackPageUnload(response_id: string, stage: string) {
      if (!this.enabled || !response_id) return;
  
      // Use sendBeacon for reliable tracking on page unload
      try {
        const data = JSON.stringify({
          response_id,
          stage,
          reason: 'page_unload',
          timestamp: new Date().toISOString()
        });
  
        if (navigator.sendBeacon) {
          navigator.sendBeacon(`${this.baseUrl}/track-dropout`, data);
        } else {
          // Fallback for older browsers
          fetch(`${this.baseUrl}/track-dropout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: data,
            keepalive: true
          }).catch(() => {
            // Ignore errors on page unload
          });
        }
      } catch (error) {
        console.error('Failed to track page unload:', error);
      }
    }
  
    /**
     * Send data to backend tracking endpoint
     */
    private async sendToBackend(endpoint: string, data: unknown) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
  
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
  
        return await response.json();
      } catch (error) {
        console.error(`Failed to send to ${endpoint}:`, error);
        throw error;
      }
    }
  
    /**
     * Enable/disable tracking
     */
    setEnabled(enabled: boolean) {
      this.enabled = enabled;
    }
  }
  
  // Create singleton instance
  export const journeyTracker = new JourneyTracker();
  
  // Set up page unload tracking
  if (typeof window !== 'undefined') {
    let currentResponseId: string | null = null;
    let currentStage: string = 'unknown';
  
    // Method to set current tracking context
    (window as unknown as Record<string, unknown>).setJourneyContext = (responseId: string, stage: string) => {
      currentResponseId = responseId;
      currentStage = stage;
    };
  
    // Track page unload
    window.addEventListener('beforeunload', () => {
      if (currentResponseId) {
        journeyTracker.trackPageUnload(currentResponseId, currentStage);
      }
    });
  
    // Track page visibility changes (tab switching, minimizing)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && currentResponseId) {
        journeyTracker.trackInteraction(currentResponseId, 'page_hidden', {
          stage: currentStage,
          timestamp: new Date().toISOString()
        });
      }
    });
  }