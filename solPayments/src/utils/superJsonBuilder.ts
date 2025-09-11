/**
 * Frontend SuperJson Builder
 * 
 * This utility builds a comprehensive "superJson" object from all available frontend data
 * including survey responses, insurance verification, onboarding data, and computed scores.
 * 
 * The superJson serves as the single comprehensive data payload sent to the backend,
 * eliminating the need for complex data reconstruction on the server side.
 */

import { getProviderNameByPayerId } from '../api/eligibilityConfig';

// Import types (fix the import issue)
// We'll define SurveyData locally to avoid import issues
export interface SurveyData {
    // Safety Screening
    safety_screening: string;
    
    // Therapist Matching
    matching_preference: string;
    selected_therapist?: string;
    selected_therapist_email?: string;
    
    // Therapist Preferences
    therapist_gender_preference: string;
    therapist_specialization: string[];
    therapist_lived_experiences: string[];
    
    // Substance Screening
    alcohol_frequency: string;
    recreational_drugs_frequency: string;
    
    // Demographics
    first_name: string;
    last_name: string;
    email: string;
    preferred_name?: string;
    phone?: string;
    age: string;
    date_of_birth: string;
    gender: string;
    state: string;
    race_ethnicity: string[];
    
    // PHQ-9 responses
    pleasure_doing_things: string;
    feeling_down: string;
    trouble_falling: string;
    feeling_tired: string;
    poor_appetite: string;
    feeling_bad_about_yourself: string;
    trouble_concentrating: string;
    moving_or_speaking_so_slowly: string;
    suicidal_thoughts: string;
    
    // GAD-7 responses
    feeling_nervous: string;
    not_control_worrying: string;
    worrying_too_much: string;
    trouble_relaxing: string;
    being_so_restless: string;
    easily_annoyed: string;
    feeling_afraid: string;
    
    // Additional fields
    lived_experiences: string[];
    university?: string;
    referred_by?: string | string[];
    street_address?: string;
    city?: string;
    postal_code?: string;
    terms_accepted: boolean;
    what_brings_you?: string;
  }
  
  // Define the comprehensive SuperJson structure
  export interface SuperJsonData {
    // === CORE IDENTITY ===
    response_id: string;
    session_id: string;
    journey_started_at: string;
    survey_completed_at: string;
    current_stage: 'survey_completed' | 'therapist_matched' | 'therapist_selected' | 'appointment_booked';
    
    // === DEMOGRAPHICS ===
    first_name: string;
    last_name: string;
    preferred_name?: string;
    email: string;
    phone?: string;
    age?: string;
    gender?: string;
    date_of_birth?: string;
    
    // === ADDRESS INFORMATION ===
    street_address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    university?: string;
    
    // === PAYMENT & INSURANCE ===
    payment_type: 'insurance' | 'cash_pay';
    insurance_provider?: string;
    insurance_member_id?: string;
    insurance_date_of_birth?: string;
    insurance_verified: boolean;
    
    // === NIRVANA INSURANCE DATA ===
    nirvana_raw_response?: any;
    insurance_verification_data?: string; // JSON stringified
    nirvana_demographics?: any;
    nirvana_address?: any;
    nirvana_plan_details?: any;
    nirvana_benefits?: any;
    
    // === MENTAL HEALTH ASSESSMENTS ===
    phq9_responses: Record<string, string>;
    phq9_total: number;
    phq9_risk_level: string;
    
    gad7_responses: Record<string, string>;
    gad7_total: number;
    gad7_risk_level: string;
    
    // === THERAPY PREFERENCES ===
    what_brings_you?: string;
    therapist_specializes_in: string[];
    therapist_identifies_as?: string;
    lived_experiences: string[];
    matching_preference?: string;
    selected_therapist?: string;
    selected_therapist_email?: string;
    
    // === SUBSTANCE SCREENING ===
    alcohol_frequency?: string;
    recreational_drugs_frequency?: string;
    safety_screening?: string;
    
    // === DEMOGRAPHICS EXTENDED ===
    race_ethnicity?: string[];
    
    // === MARKETING & ATTRIBUTION ===
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    referred_by?: string;
    promo_code?: string;
    
    // === THERAPIST MATCHING RESULTS ===
    matched_therapists?: Array<{
      therapist: {
        id: string;
        name?: string;
        intern_name?: string;
        email?: string;
        calendar_email?: string;
        biography?: string;
        age?: string;
        birth_order?: string;
        caretaker_role?: boolean;
        lived_experiences?: string[];
        specialties?: string[];
        therapeutic_orientation?: string[];
        program?: string;
        states_array?: string[];
        image_link?: string;
        accepting_new_clients?: string;
        max_caseload?: number;
        current_caseload?: number;
        cohort?: string;
        [key: string]: any;
      };
      score?: number;
      matched_diagnoses_specialities?: string[];
    }>;
    
    selected_therapist_data?: {
      id: string;
      name?: string;
      intern_name?: string;
      email?: string;
      biography?: string;
      specialties?: string[];
      image_link?: string;
      states_array?: string[];
      therapeutic_orientation?: string[];
      program?: string;
      score?: number;
      matched_specializations?: string[];
    };
    
    // === APPOINTMENT BOOKING DATA ===
    appointment_booking?: {
      selected_date?: string;
      selected_time_slot?: string;
      selected_date_local?: string;
      timezone?: string;
      timezone_display?: string;
      session_duration?: number;
      therapist_category?: string;
      booking_timestamp?: string;
    };
    
    // === APPOINTMENT CONFIRMATION DATA ===
    appointment_details?: {
      appointment_id?: string;
      start_date_iso?: string;
      start_date_local_formatted?: string;
      end_date_iso?: string;
      end_date_local?: string;
      duration?: number;
      status?: string;
      client_id?: string;
      client_name?: string;
      client_email?: string;
      practitioner_id?: string;
      practitioner_name?: string;
      location_id?: string;
      location_name?: string;
      created_by?: string;
      date_created?: number;
      last_modified?: number;
      reminder_type?: string;
    };
    
    // === INTAKEQ INTEGRATION DATA ===
    intakeq_client_profile?: {
      client_id?: string;
      intake_url?: string;
      practitioner_assigned?: boolean;
      practitioner_assignment_result?: any;
      mandatory_form_sent?: boolean;
      mandatory_form_intake_id?: string;
      mandatory_form_intake_url?: string;
      mandatory_form_questionnaire_id?: string;
      created_at?: string;
      updated_at?: string;
    };
    
    // === TECHNICAL METADATA ===
    user_agent: string;
    screen_resolution: string;
    timezone: string;
    data_completeness_score: number;
    
    // === SESSION TRACKING ===
    session_events?: Array<{
      event_type: string;
      timestamp: string;
      data?: any;
    }>;
    
    // === JOURNEY PROGRESSION ===
    journey_milestones?: {
      onboarding_completed_at?: string;
      survey_started_at?: string;
      survey_completed_at?: string;
      therapist_matching_requested_at?: string;
      therapist_matched_at?: string;
      therapist_selected_at?: string;
      appointment_booking_started_at?: string;
      appointment_booked_at?: string;
      intakeq_profile_created_at?: string;
      mandatory_form_sent_at?: string;
      journey_completed_at?: string;
    };
    
    // === LEGACY COMPATIBILITY ===
    [key: string]: any; // Include all individual survey fields for backward compatibility
  }
  
  // Onboarding data interface
  export interface OnboardingData {
    firstName?: string;
    lastName?: string;
    preferredName?: string;
    email?: string;
    phone?: string;
    age?: string;
    gender?: string;
    state?: string;
    city?: string;
    zipCode?: string;
    university?: string;
    provider?: string;
    memberId?: string;
    dateOfBirth?: string;
    paymentType?: string;
    verificationData?: any;
  }
  
  // Form data interface (insurance verification)
  export interface FormData {
    firstName?: string;
    lastName?: string;
    preferredName?: string;
    email?: string;
    provider?: string;
    memberId?: string;
    dateOfBirth?: string;
    verificationData?: {
      benefits?: {
        copay: string;
        coinsurance: string;
        memberObligation: string;
        deductible: string;
        remainingDeductible: string;
        oopMax: string;
        remainingOopMax: string;
      };
      subscriber?: any;
      coverage?: any;
      rawNirvanaResponse?: any;
      rawFinancials?: any;
      telehealth?: any;
    };
  }
  
  /**
   * Calculate PHQ-9 total score from survey responses
   */
  export function calculatePHQ9Score(surveyData: SurveyData): number {
    const scoreMap = {
      "Not at all": 0,
      "Several days": 1,
      "More than half the days": 2,
      "Nearly every day": 3,
    };
    
    const phq9Fields = [
      'pleasure_doing_things',
      'feeling_down', 
      'trouble_falling',
      'feeling_tired',
      'poor_appetite',
      'feeling_bad_about_yourself',
      'trouble_concentrating',
      'moving_or_speaking_so_slowly',
      'suicidal_thoughts'
    ];
    
    let total = 0;
    for (const field of phq9Fields) {
      const value = surveyData[field as keyof SurveyData] as string;
      if (value && typeof value === 'string') {
        total += scoreMap[value as keyof typeof scoreMap] || 0;
      }
    }
    
    return total;
  }
  
  /**
   * Calculate GAD-7 total score from survey responses
   */
  export function calculateGAD7Score(surveyData: SurveyData): number {
    const scoreMap = {
      "Not at all": 0,
      "Several days": 1,
      "More than half the days": 2,
      "Nearly every day": 3,
    };
    
    const gad7Fields = [
      'feeling_nervous',
      'not_control_worrying',
      'worrying_too_much', 
      'trouble_relaxing',
      'being_so_restless',
      'easily_annoyed',
      'feeling_afraid'
    ];
    
    let total = 0;
    for (const field of gad7Fields) {
      const value = surveyData[field as keyof SurveyData] as string;
      if (value && typeof value === 'string') {
        total += scoreMap[value as keyof typeof scoreMap] || 0;
      }
    }
    
    return total;
  }
  
  /**
   * Determine risk level based on assessment scores
   */
  export function calculateRiskLevel(primaryScore: number, secondaryScore?: number): string {
    const maxScore = Math.max(primaryScore || 0, secondaryScore || 0);
    
    if (maxScore >= 20) return 'severe';
    if (maxScore >= 15) return 'moderately_severe';
    if (maxScore >= 10) return 'moderate';
    if (maxScore >= 5) return 'mild';
    return 'minimal';
  }
  
  /**
   * Calculate data completeness score (0-1)
   */
  export function calculateCompletenessScore(superJson: Partial<SuperJsonData>): number {
    const criticalFields = [
      'first_name', 'last_name', 'email', 'phone', 'age', 'gender',
      'street_address', 'city', 'state', 'postal_code',
      'what_brings_you', 'therapist_specializes_in', 'therapist_identifies_as',
      'phq9_total_score', 'gad7_total_score'
    ];
    
    const filledCritical = criticalFields.filter(field => {
      const value = superJson[field as keyof SuperJsonData];
      return value !== null && value !== undefined && value !== '' && 
             (Array.isArray(value) ? value.length > 0 : true);
    }).length;
    
    return Math.round((filledCritical / criticalFields.length) * 100) / 100;
  }
  
  /**
   * Extract and structure Nirvana insurance verification data
   */
  export function processNirvanaData(verificationData: any): {
    nirvana_raw_response: any;
    nirvana_demographics?: any;
    nirvana_address?: any;
    nirvana_plan_details?: any;
    nirvana_benefits?: any;
  } {
    if (!verificationData) {
      return { nirvana_raw_response: null };
    }
    
    const result: any = {
      nirvana_raw_response: verificationData
    };
    
    // Extract demographics (subscriber info)
    if (verificationData.subscriber) {
      result.nirvana_demographics = verificationData.subscriber;
      
      // Extract address specifically
      if (verificationData.subscriber.address) {
        result.nirvana_address = verificationData.subscriber.address;
      }
    }
    
    // Extract plan details (coverage info)
    if (verificationData.coverage) {
      const payerId = verificationData.coverage.payerId;
      result.nirvana_plan_details = {
        plan_name: verificationData.coverage.planName,
        group_id: verificationData.coverage.groupId,
        payer_id: payerId,
        provider_name: getProviderNameByPayerId(payerId),
        plan_status: verificationData.coverage.planStatus,
        coverage_status: verificationData.coverage.coverageStatus,
        insurance_type: verificationData.coverage.insuranceType,
        mental_health_coverage_status: verificationData.coverage.mentalHealthCoverage
      };
    }
    
    // Extract benefits (financial info)
    if (verificationData.rawFinancials) {
      result.nirvana_benefits = {
        copay_cents: verificationData.rawFinancials.copayment,
        coinsurance_percent: verificationData.rawFinancials.coinsurance,
        deductible_cents: verificationData.rawFinancials.deductible,
        remaining_deductible_cents: verificationData.rawFinancials.remainingDeductible,
        oop_max_cents: verificationData.rawFinancials.oopMax,
        remaining_oop_max_cents: verificationData.rawFinancials.remainingOopMax,
        member_obligation_cents: verificationData.rawFinancials.memberObligation,
        pre_deductible_obligation: verificationData.rawFinancials.preDeductibleMemberObligation,
        post_deductible_obligation: verificationData.rawFinancials.postDeductibleMemberObligation
      };
    }
    
    return result;
  }
  
  /**
   * Get UTM parameters from URL
   */
  export function getUTMParameters(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
    if (typeof window === 'undefined') return {};
    
    const urlParams = new URLSearchParams(window.location.search);
    return {
      utm_source: urlParams.get('utm_source') || 'hello_sol',
      utm_medium: urlParams.get('utm_medium') || 'direct',
      utm_campaign: urlParams.get('utm_campaign') || 'onboarding'
    };
  }
  
  /**
   * Format name for backend processing
   */
  export function formatNameForBackend(name: string): string {
    return name?.trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') || '';
  }
  
  /**
   * Calculate date of birth from age
   */
  export function calculateDateOfBirthFromAge(age: string): string {
    if (!age || isNaN(Number(age))) return '';
    
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - Number(age);
    return `${birthYear}-01-01`; // Default to January 1st
  }
  
  /**
   * Main SuperJson Builder Function
   * 
   * This is the core function that combines all available frontend data
   * into a comprehensive superJson object ready for backend processing.
   */
  export function buildSuperJson(
    responseId: string,
    surveyData: SurveyData,
    selectedPaymentType: 'insurance' | 'cash_pay',
    onboardingData?: OnboardingData,
    formData?: FormData,
    surveyStartTime?: string
  ): SuperJsonData {
    
    console.log('🏗️ ==========================================');
    console.log('🏗️ SUPERJSON BUILDER - DATA TRANSFORMATION');
    console.log('🏗️ ==========================================');
    
    console.log('📥 INPUT DATA ANALYSIS:', {
      responseId,
      hasOnboardingData: !!onboardingData,
      hasFormData: !!formData,
      hasInsuranceVerification: !!(formData?.verificationData),
      paymentType: selectedPaymentType
    });
    
    console.log('🧮 SURVEY DATA STRUCTURE:', {
      totalFields: Object.keys(surveyData).length,
      hasPhq9Fields: !!(surveyData.pleasure_doing_things && surveyData.feeling_down),
      hasGad7Fields: !!(surveyData.feeling_nervous && surveyData.not_control_worrying),
      hasDemographics: !!(surveyData.first_name && surveyData.email && surveyData.age),
      hasTherapistPreferences: !!(surveyData.therapist_gender_preference || surveyData.therapist_specialization),
      surveyDataKeys: Object.keys(surveyData).sort()
    });
    
    if (onboardingData) {
      console.log('🎯 ONBOARDING DATA:', {
        fields: Object.keys(onboardingData).filter(key => onboardingData[key as keyof OnboardingData]),
        firstName: onboardingData.firstName,
        lastName: onboardingData.lastName,
        email: onboardingData.email,
        state: onboardingData.state,
        paymentType: onboardingData.paymentType,
        provider: onboardingData.provider,
        memberId: onboardingData.memberId
      });
    }
    
    if (formData) {
      console.log('📋 FORM DATA (Insurance):', {
        fields: Object.keys(formData).filter(key => formData[key as keyof FormData]),
        provider: formData.provider,
        memberId: formData.memberId,
        dateOfBirth: formData.dateOfBirth,
        hasVerificationData: !!formData.verificationData,
        verificationDataKeys: formData.verificationData ? Object.keys(formData.verificationData) : []
      });
      
      if (formData.verificationData) {
        console.log('🏥 INSURANCE VERIFICATION DATA:', {
          hasBenefits: !!formData.verificationData.benefits,
          hasSubscriber: !!formData.verificationData.subscriber,
          hasCoverage: !!formData.verificationData.coverage,
          hasRawNirvanaResponse: !!formData.verificationData.rawNirvanaResponse,
          hasRawFinancials: !!formData.verificationData.rawFinancials,
          hasTelehealth: !!formData.verificationData.telehealth
        });
      }
    }
    
    const now = new Date().toISOString();
    const utmParams = getUTMParameters();
    
    // Calculate assessment scores
    const phq9Score = calculatePHQ9Score(surveyData);
    const gad7Score = calculateGAD7Score(surveyData);
    
    // Extract PHQ-9 responses
    const phq9_responses = {
      pleasure_doing_things: surveyData.pleasure_doing_things,
      feeling_down: surveyData.feeling_down,
      trouble_falling: surveyData.trouble_falling,
      feeling_tired: surveyData.feeling_tired,
      poor_appetite: surveyData.poor_appetite,
      feeling_bad_about_yourself: surveyData.feeling_bad_about_yourself,
      trouble_concentrating: surveyData.trouble_concentrating,
      moving_or_speaking_so_slowly: surveyData.moving_or_speaking_so_slowly,
      suicidal_thoughts: surveyData.suicidal_thoughts
    };
    
    // Extract GAD-7 responses
    const gad7_responses = {
      feeling_nervous: surveyData.feeling_nervous,
      not_control_worrying: surveyData.not_control_worrying,
      worrying_too_much: surveyData.worrying_too_much,
      trouble_relaxing: surveyData.trouble_relaxing,
      being_so_restless: surveyData.being_so_restless,
      easily_annoyed: surveyData.easily_annoyed,
      feeling_afraid: surveyData.feeling_afraid
    };
    
    // Process Nirvana insurance data if available
    let nirvanaData: any = {};
    if (selectedPaymentType === 'insurance' && formData?.verificationData) {
      const rawNirvanaResponse = formData.verificationData.rawNirvanaResponse || formData.verificationData;
      nirvanaData = processNirvanaData(rawNirvanaResponse);
      
      console.log('🏥 Processed Nirvana data:', {
        hasRawResponse: !!nirvanaData.nirvana_raw_response,
        hasDemographics: !!nirvanaData.nirvana_demographics,
        hasAddress: !!nirvanaData.nirvana_address,
        hasPlanDetails: !!nirvanaData.nirvana_plan_details,
        hasBenefits: !!nirvanaData.nirvana_benefits
      });
    }
    
    // Build the comprehensive superJson
    const superJson: SuperJsonData = {
      // === CORE IDENTITY ===
      response_id: responseId,
      session_id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      journey_started_at: surveyStartTime || now,
      survey_completed_at: now,
      current_stage: 'survey_completed',
      
      // === DEMOGRAPHICS (prioritize survey data, fallback to onboarding/form data) ===
      first_name: formatNameForBackend(
        surveyData.first_name || formData?.firstName || onboardingData?.firstName || ''
      ),
      last_name: formatNameForBackend(
        surveyData.last_name || formData?.lastName || onboardingData?.lastName || ''
      ),
      preferred_name: formatNameForBackend(
        surveyData.preferred_name || formData?.preferredName || onboardingData?.preferredName || ''
      ),
      email: surveyData.email || formData?.email || onboardingData?.email || '',
      phone: surveyData.phone || onboardingData?.phone,
      age: surveyData.age || onboardingData?.age,
      gender: surveyData.gender || onboardingData?.gender,
      
      // Use insurance DOB if available, otherwise calculate from age
      date_of_birth: (() => {
        if (selectedPaymentType === 'insurance' && formData?.dateOfBirth) {
          return formData.dateOfBirth;
        }
        return calculateDateOfBirthFromAge(surveyData.age || onboardingData?.age || '');
      })(),
      
      // === ADDRESS INFORMATION ===
      street_address: surveyData.street_address,
      city: surveyData.city || onboardingData?.city,
      state: surveyData.state || onboardingData?.state,
      postal_code: surveyData.postal_code || onboardingData?.zipCode,
      university: surveyData.university || onboardingData?.university,
      
      // === PAYMENT & INSURANCE ===
      payment_type: selectedPaymentType,
      insurance_provider: formData?.provider || onboardingData?.provider,
      insurance_member_id: formData?.memberId || onboardingData?.memberId,
      insurance_date_of_birth: formData?.dateOfBirth || onboardingData?.dateOfBirth,
      insurance_verified: !!(selectedPaymentType === 'insurance' && formData?.verificationData),
      
      // === NIRVANA INSURANCE DATA ===
      ...nirvanaData,
      insurance_verification_data: formData?.verificationData ? 
        JSON.stringify(formData.verificationData) : undefined,
      
      // === MENTAL HEALTH ASSESSMENTS ===
      phq9_responses,
      phq9_total_score: phq9Score,
      phq9_risk_level: calculateRiskLevel(phq9Score, gad7Score),
      
      gad7_responses,
      gad7_total_score: gad7Score,
      gad7_risk_level: calculateRiskLevel(gad7Score, phq9Score),
      
      // === THERAPY PREFERENCES ===
      what_brings_you: surveyData.what_brings_you,
      therapist_specializes_in: surveyData.therapist_specialization || [],
      therapist_identifies_as: surveyData.therapist_gender_preference,
      lived_experiences: surveyData.therapist_lived_experiences || [],
      matching_preference: surveyData.matching_preference,
      selected_therapist: surveyData.selected_therapist,
      selected_therapist_email: surveyData.selected_therapist_email,
      
      // === EXTENDED DEMOGRAPHICS ===
      race_ethnicity: surveyData.race_ethnicity || [],
      
      // === SUBSTANCE SCREENING ===
      alcohol_frequency: surveyData.alcohol_frequency,
      recreational_drugs_frequency: surveyData.recreational_drugs_frequency,
      safety_screening: surveyData.safety_screening,
      
      // === MARKETING & ATTRIBUTION ===
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      referred_by: Array.isArray(surveyData.referred_by) ? surveyData.referred_by[0] : surveyData.referred_by,
      
      // === TECHNICAL METADATA ===
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      screen_resolution: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '',
      timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '',
      data_completeness_score: 0 // Will be calculated below
    };
    
    // Calculate completeness score
    superJson.data_completeness_score = calculateCompletenessScore(superJson);
    
    console.log('🔍 FINAL SUPERJSON DATA PRIORITY CHECK:');
    console.log('📋 Name Resolution (priority: survey > form > onboarding):', {
      firstName: {
        survey: surveyData.first_name,
        form: formData?.firstName,
        onboarding: onboardingData?.firstName,
        final: superJson.first_name
      },
      lastName: {
        survey: surveyData.last_name,
        form: formData?.lastName,
        onboarding: onboardingData?.lastName,
        final: superJson.last_name
      },
      email: {
        survey: surveyData.email,
        form: formData?.email,
        onboarding: onboardingData?.email,
        final: superJson.email
      }
    });
    
    console.log('📋 Insurance Data Flow:', {
      paymentType: selectedPaymentType,
      hasInsuranceData: !!superJson.insurance_verification_data,
      insuranceProvider: superJson.insurance_provider,
      insuranceMemberId: superJson.insurance_member_id,
      insuranceDateOfBirth: superJson.insurance_date_of_birth,
      insuranceVerified: superJson.insurance_verified,
      hasNirvanaRawResponse: !!superJson.nirvana_raw_response,
      hasNirvanabenefits: !!superJson.nirvana_benefits
    });
    
    console.log('📊 Assessment Scores:', {
      phq9Total: superJson.phq9_total_score,
      gad7Total: superJson.gad7_total_score,
      phq9RiskLevel: superJson.phq9_risk_level,
      gad7RiskLevel: superJson.gad7_risk_level,
      hasPhq9Responses: !!superJson.phq9_responses && Object.keys(superJson.phq9_responses).length > 0,
      hasGad7Responses: !!superJson.gad7_responses && Object.keys(superJson.gad7_responses).length > 0
    });
    
    console.log('✅ SUPERJSON BUILD COMPLETE:', {
      totalFields: Object.keys(superJson).length,
      coreFieldsPresent: !!(superJson.first_name && superJson.last_name && superJson.email),
      completenessScore: superJson.data_completeness_score,
      currentStage: superJson.current_stage,
      sessionId: superJson.session_id
    });
    
    console.log('🏗️ ==========================================');
    
    return superJson;
  }
  
  /**
   * Update SuperJson with therapist matching results
   */
  export function updateSuperJsonWithTherapistMatch(
    existingSuperJson: SuperJsonData,
    matchResults: {
      therapists: Array<{
        therapist: any;
        score?: number;
        matched_diagnoses_specialities?: string[];
      }>;
      client?: any;
    }
  ): SuperJsonData {
    
    console.log('🔄 Updating SuperJson with therapist matching results');
    
    return {
      ...existingSuperJson,
      
      // Update journey stage
      current_stage: 'therapist_matched' as any,
      
      // Add therapist matching results
      matched_therapists: matchResults.therapists,
      
      // Update journey milestones
      journey_milestones: {
        ...existingSuperJson.journey_milestones,
        therapist_matched_at: new Date().toISOString()
      },
      
      // Add session event
      session_events: [
        ...(existingSuperJson.session_events || []),
        {
          event_type: 'therapist_match_completed',
          timestamp: new Date().toISOString(),
          data: {
            matched_count: matchResults.therapists.length,
            top_score: matchResults.therapists[0]?.score || 0
          }
        }
      ],
      
      last_updated_at: new Date().toISOString()
    };
  }
  
  /**
   * Update SuperJson with selected therapist data
   */
  export function updateSuperJsonWithSelectedTherapist(
    existingSuperJson: SuperJsonData,
    selectedTherapist: {
      id: string;
      name?: string;
      intern_name?: string;
      email?: string;
      biography?: string;
      specialties?: string[];
      image_link?: string;
      states_array?: string[];
      therapeutic_orientation?: string[];
      program?: string;
      score?: number;
      matched_specializations?: string[];
      [key: string]: any;
    }
  ): SuperJsonData {
    
    console.log('👩‍⚕️ Updating SuperJson with selected therapist:', selectedTherapist.name);
    
    return {
      ...existingSuperJson,
      
      // Update selected therapist info
      selected_therapist: selectedTherapist.name || selectedTherapist.intern_name,
      selected_therapist_id: selectedTherapist.id,
      selected_therapist_email: selectedTherapist.email,
      selected_therapist_data: selectedTherapist,
      
      // Update journey milestones
      journey_milestones: {
        ...existingSuperJson.journey_milestones,
        therapist_selected_at: new Date().toISOString()
      },
      
      // Add session event
      session_events: [
        ...(existingSuperJson.session_events || []),
        {
          event_type: 'therapist_selected',
          timestamp: new Date().toISOString(),
          data: {
            therapist_id: selectedTherapist.id,
            therapist_name: selectedTherapist.name || selectedTherapist.intern_name,
            therapist_email: selectedTherapist.email,
            matching_score: selectedTherapist.score
          }
        }
      ],
      
      last_updated_at: new Date().toISOString()
    };
  }
  
  /**
   * Update SuperJson with appointment booking data
   */
  export function updateSuperJsonWithAppointmentBooking(
    existingSuperJson: SuperJsonData,
    bookingData: {
      selected_date?: string;
      selected_time_slot?: string;
      selected_date_local?: string;
      timezone?: string;
      timezone_display?: string;
      session_duration?: number;
      therapist_category?: string;
    }
  ): SuperJsonData {
    
    console.log('📅 Updating SuperJson with appointment booking data');
    
    return {
      ...existingSuperJson,
      
      // Update appointment booking info
      appointment_booking: {
        ...bookingData,
        booking_timestamp: new Date().toISOString()
      },
      
      // Update journey milestones
      journey_milestones: {
        ...existingSuperJson.journey_milestones,
        appointment_booking_started_at: new Date().toISOString()
      },
      
      // Add session event
      session_events: [
        ...(existingSuperJson.session_events || []),
        {
          event_type: 'appointment_booking_started',
          timestamp: new Date().toISOString(),
          data: bookingData
        }
      ],
      
      last_updated_at: new Date().toISOString()
    };
  }
  
  /**
   * Update SuperJson with confirmed appointment details
   */
  export function updateSuperJsonWithAppointmentConfirmation(
    existingSuperJson: SuperJsonData,
    appointmentData: {
      appointment_id?: string;
      start_date_iso?: string;
      start_date_local_formatted?: string;
      end_date_iso?: string;
      end_date_local?: string;
      duration?: number;
      status?: string;
      client_id?: string;
      client_name?: string;
      client_email?: string;
      practitioner_id?: string;
      practitioner_name?: string;
      location_id?: string;
      location_name?: string;
      [key: string]: any;
    }
  ): SuperJsonData {
    
    console.log('✅ Updating SuperJson with confirmed appointment details');
    
    return {
      ...existingSuperJson,
      
      // Update journey stage
      current_stage: 'appointment_booked' as any,
      
      // Add appointment details
      appointment_details: appointmentData,
      
      // Update journey milestones
      journey_milestones: {
        ...existingSuperJson.journey_milestones,
        appointment_booked_at: new Date().toISOString()
      },
      
      // Add session event
      session_events: [
        ...(existingSuperJson.session_events || []),
        {
          event_type: 'appointment_confirmed',
          timestamp: new Date().toISOString(),
          data: {
            appointment_id: appointmentData.appointment_id,
            start_date: appointmentData.start_date_iso,
            practitioner_name: appointmentData.practitioner_name,
            duration: appointmentData.duration
          }
        }
      ],
      
      last_updated_at: new Date().toISOString()
    };
  }
  
  /**
   * Update SuperJson with IntakeQ profile creation data
   */
  export function updateSuperJsonWithIntakeQProfile(
    existingSuperJson: SuperJsonData,
    intakeqData: {
      client_id?: string;
      intake_url?: string;
      practitioner_assigned?: boolean;
      practitioner_assignment_result?: any;
      mandatory_form_sent?: boolean;
      mandatory_form_intake_id?: string;
      mandatory_form_intake_url?: string;
      mandatory_form_questionnaire_id?: string;
    }
  ): SuperJsonData {
    
    console.log('📋 Updating SuperJson with IntakeQ profile data');
    
    return {
      ...existingSuperJson,
      
      // Add IntakeQ profile data
      intakeq_client_profile: {
        ...intakeqData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      
      // Update journey milestones
      journey_milestones: {
        ...existingSuperJson.journey_milestones,
        intakeq_profile_created_at: new Date().toISOString(),
        ...(intakeqData.mandatory_form_sent && {
          mandatory_form_sent_at: new Date().toISOString()
        }),
        ...(intakeqData.client_id && intakeqData.intake_url && {
          journey_completed_at: new Date().toISOString()
        })
      },
      
      // Add session event
      session_events: [
        ...(existingSuperJson.session_events || []),
        {
          event_type: 'intakeq_profile_created',
          timestamp: new Date().toISOString(),
          data: {
            client_id: intakeqData.client_id,
            intake_url: intakeqData.intake_url,
            practitioner_assigned: intakeqData.practitioner_assigned,
            mandatory_form_sent: intakeqData.mandatory_form_sent
          }
        }
      ],
      
      last_updated_at: new Date().toISOString()
    };
  }
  
  /**
   * Get a comprehensive summary of the SuperJson for logging/debugging
   */
  export function getSuperJsonSummary(superJson: SuperJsonData): {
    journey_stage: string;
    data_completeness: number;
    key_milestones: string[];
    critical_data_present: {
      personal_info: boolean;
      insurance_data: boolean;
      assessment_scores: boolean;
      therapist_selected: boolean;
      appointment_booked: boolean;
      intakeq_created: boolean;
    };
    total_fields: number;
  } {
    
    const milestones = [];
    if (superJson.journey_milestones?.survey_completed_at) milestones.push('Survey Completed');
    if (superJson.journey_milestones?.therapist_matched_at) milestones.push('Therapist Matched');
    if (superJson.journey_milestones?.therapist_selected_at) milestones.push('Therapist Selected');
    if (superJson.journey_milestones?.appointment_booked_at) milestones.push('Appointment Booked');
    if (superJson.journey_milestones?.intakeq_profile_created_at) milestones.push('IntakeQ Profile Created');
    
    return {
      journey_stage: superJson.current_stage || 'unknown',
      data_completeness: superJson.data_completeness_score || 0,
      key_milestones: milestones,
      critical_data_present: {
        personal_info: !!(superJson.first_name && superJson.last_name && superJson.email),
        insurance_data: !!superJson.insurance_verification_data,
        assessment_scores: !!(superJson.phq9_total_score >= 0 && superJson.gad7_total_score >= 0),
        therapist_selected: !!superJson.selected_therapist_id,
        appointment_booked: !!superJson.appointment_details?.appointment_id,
        intakeq_created: !!superJson.intakeq_client_profile?.client_id
      },
      total_fields: Object.keys(superJson).length
    };
  }