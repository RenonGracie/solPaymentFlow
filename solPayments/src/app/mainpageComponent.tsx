'use client';

import { useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, Play } from "lucide-react";
import Image from "next/image";
import CustomSurvey from "@/components/CustomSurvey";
import OnboardingFlow from "@/components/OnboardingFlow";
import MatchedTherapist from "@/components/MatchedTherapist";
import { LoadingScreen } from "@/components/LoadingScreen";
import { TherapistProvider } from "@/providers/TherapistProvider";
import { 
  useAppointmentsService,
  type BookAppointmentResponse 
} from "@/api/services";
import { usePollFormAndRequestMatch } from "@/api/hooks/usePollFormAndRequestMatch";
import axiosInstance from "@/api/axios";
import IntakeQService from "@/api/services/intakeqService";
import { sendMandatoryForm } from "@/app/api/intakeq";
import { STEPS } from "@/constants";
import { createTherapistPreloader } from "@/utils/therapistPreloader";
import { 
  buildSuperJson, 
  updateSuperJsonWithTherapistMatch, 
  updateSuperJsonWithSelectedTherapist, 
  updateSuperJsonWithAppointmentConfirmation, 
  type SuperJsonData 
} from "@/utils/superJsonBuilder";

// Meta pixel type declaration
declare global {
  interface Window {
    fbq: (action: string, event: string, params?: any) => void;
  }
}

type PaymentType = "insurance" | "cash_pay";

// Interface for mandatory form API response
interface MandatoryFormResponse {
  success: boolean;
  intake_id?: string;
  intake_url?: string;
  client_id?: string;
  questionnaire_id?: string;
  intakeq_response?: Record<string, unknown>;
  error?: string;
}

// Comprehensive user data interface that includes ALL possible fields
interface ComprehensiveUserData {
  // Core Identity
  id?: string;
  response_id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  email: string;
  phone?: string;
  
  // Assessment Scores (calculated)
  phq9_total?: number;
  gad7_total?: number;
  phq9_scores?: Record<string, string>;
  gad7_scores?: Record<string, string>;
  
  // Complete demographics
  age?: string;
  gender?: string;
  date_of_birth?: string;
  state?: string;
  race_ethnicity?: string[];
  lived_experiences?: string[];
  university?: string;
  
  // Address information
  street_address?: string;
  city?: string;
  postal_code?: string;
  
  // Therapy context
  what_brings_you?: string;
  therapist_gender_preference?: string;
  therapist_specialization?: string[];
  therapist_lived_experiences?: string[];
  
  // Substance screening
  alcohol_frequency?: string;
  recreational_drugs_frequency?: string;
  
  // Safety and matching
  safety_screening?: string;
  matching_preference?: string;
  
  // Selected therapist & appointment info
  selected_therapist?: {
    id: string;
    name: string;
    email: string;
    bio: string;
    specialties: string[];
    image_link?: string;
    states: string[];
    therapeutic_orientation?: string[];
    program?: string;
  };
  
  // Appointment details
  appointment?: {
    date: string;
    time: string;
    timezone: string;
    duration: number;
    session_type: string;
  };
  
  // Insurance (if applicable)
  insurance_data?: {
    provider?: string;
    member_id?: string;
    date_of_birth?: string;
    verification_response?: Record<string, unknown>;
    benefits?: {
      copay?: string;
      deductible?: string;
      coinsurance?: string;
      oopMax?: string;
      remainingDeductible?: string;
      remainingOopMax?: string;
      memberObligation?: string;
      benefitStructure?: string;
    };
  };
  
  // Payment info
  payment_type?: string;
  
  // Tracking
  utm?: Record<string, string>;
  referred_by?: string | string[];
  onboarding_completed_at?: string;
  survey_completed_at?: string;
  last_updated?: string;
  
  // IntakeQ integration
  intakeq_client_id?: string;
  intakeq_intake_url?: string;
  
  // Mandatory form tracking
  mandatory_form_sent?: boolean;
  mandatory_form_intake_id?: string;
  mandatory_form_intake_url?: string;
}

// Extended client data interface (for backward compatibility)
interface ExtendedClientData extends ComprehensiveUserData {
  // Legacy fields for backward compatibility
  therapist_specializes_in?: string[];
  therapist_identifies_as?: string;
}

// BookingConfirmation Component
interface BookingConfirmationProps {
  bookingData: BookAppointmentResponse | null;
  currentUserData: ComprehensiveUserData | null;
  onBack: () => void;
}

function BookingConfirmation({ bookingData, currentUserData, onBack }: BookingConfirmationProps) {
  const [imageError, setImageError] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay compliance

  // Welcome video configuration (YouTube with clean embed)
  const WELCOME_VIDEO_URL = 'https://youtu.be/q2dgtDe83uA';
  
  // Extract YouTube video ID for clean embedding
  const extractYouTubeId = (url: string): string => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : '';
  };
  
  const videoId = extractYouTubeId(WELCOME_VIDEO_URL);
  
  // Toggle mute function
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  // Clean embed URL with minimal YouTube interface (dynamic mute based on state)
  const cleanEmbedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&rel=0&modestbranding=1&showinfo=0&controls=1&iv_load_policy=3&disablekb=1&fs=1&cc_load_policy=0` : '';
  // High quality thumbnail
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';

  // Enhanced image URL handling (consistent with MatchedTherapist.tsx)
  const getImageUrl = (imageLink: string | null | undefined): string => {
    console.log(`[Booking Confirmation getImageUrl] Input: "${imageLink}", type: ${typeof imageLink}`);
    
    if (!imageLink || typeof imageLink !== 'string') {
      console.log(`[Booking Confirmation getImageUrl] Empty or invalid input, returning empty string`);
      return '';
    }
    
    const cleanLink = imageLink.trim();
    console.log(`[Booking Confirmation getImageUrl] Cleaned link: "${cleanLink}"`);
    
    if (!cleanLink) {
      console.log(`[Booking Confirmation getImageUrl] Empty after trim, returning empty string`);
      return '';
    }
    
    // Check if it's already a valid URL
    if (cleanLink.startsWith('http://') || cleanLink.startsWith('https://')) {
      console.log(`[Booking Confirmation getImageUrl] Valid HTTP/HTTPS URL detected: "${cleanLink}"`);
      return cleanLink;
    }
    
    // Handle relative URLs or paths that might need a base URL
    if (cleanLink.startsWith('/')) {
      // If it starts with /, it might be a relative path from a CDN
      console.warn(`[Booking Confirmation getImageUrl] Relative path detected: "${cleanLink}" - might need base URL`);
      return cleanLink; // Return as-is, let the browser handle it
    }
    
    console.warn(`[Booking Confirmation getImageUrl] Invalid image URL format: "${cleanLink}", returning empty string`);
    return '';
  };

  // State to timezone mapping for consistency with MatchedTherapist
  const STATE_TIMEZONE_MAP: Record<string, string> = {
    // Eastern
    CT: "America/New_York", DE: "America/New_York", DC: "America/New_York", FL: "America/New_York",
    GA: "America/New_York", ME: "America/New_York", MD: "America/New_York", MA: "America/New_York",
    NH: "America/New_York", NJ: "America/New_York", NY: "America/New_York", NC: "America/New_York",
    OH: "America/New_York", PA: "America/New_York", RI: "America/New_York", SC: "America/New_York",
    VT: "America/New_York", VA: "America/New_York", WV: "America/New_York", MI: "America/New_York",
    IN: "America/New_York", KY: "America/New_York",
    // Central
    AL: "America/Chicago", AR: "America/Chicago", IL: "America/Chicago", IA: "America/Chicago",
    LA: "America/Chicago", MN: "America/Chicago", MS: "America/Chicago", MO: "America/Chicago",
    OK: "America/Chicago", WI: "America/Chicago", TX: "America/Chicago", TN: "America/Chicago",
    KS: "America/Chicago", NE: "America/Chicago", SD: "America/Chicago", ND: "America/Chicago",
    // Mountain
    AZ: "America/Phoenix", CO: "America/Denver", ID: "America/Denver", MT: "America/Denver",
    NM: "America/Denver", UT: "America/Denver", WY: "America/Denver",
    // Pacific
    CA: "America/Los_Angeles", NV: "America/Los_Angeles", OR: "America/Los_Angeles", WA: "America/Los_Angeles",
    // Alaska/Hawaii
    AK: "America/Anchorage", HI: "Pacific/Honolulu",
  };

  // Timezone display names for consistency
  const TIMEZONE_DISPLAY_MAP: Record<string, string> = {
    "America/New_York": "EST",
    "America/Chicago": "CST", 
    "America/Denver": "MST",
    "America/Phoenix": "MST",
    "America/Los_Angeles": "PST",
    "America/Anchorage": "AK",
    "Pacific/Honolulu": "HI",
  };

  // Format appointment date and time with consistent timezone handling
  const formatAppointmentDateTime = () => {
    if (!bookingData?.StartDateIso) {
      return { dateStr: '', timeStr: '', timezone: '' };
    }
    
    // Get user's timezone based on their state for consistency
    let userTimezone = "America/New_York"; // Default to EST
    if (currentUserData?.state) {
      const stateUpper = String(currentUserData.state).toUpperCase().trim();
      userTimezone = STATE_TIMEZONE_MAP[stateUpper] || userTimezone;
    }
    
    const date = new Date(bookingData.StartDateIso);
    
    // Format in user's timezone for consistency with booking page
    const dateStr = date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: '2-digit',
      timeZone: userTimezone
    });
    
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true,
      timeZone: userTimezone
    });
    
    // Use consistent timezone display
    const timezoneDisplay = TIMEZONE_DISPLAY_MAP[userTimezone] || 'EST';
    
    console.log(`[Booking Confirmation Time Consistency] User state: ${currentUserData?.state}, Timezone: ${userTimezone}, Display: ${timezoneDisplay}`);
    console.log(`[Booking Confirmation Time] Original ISO: ${bookingData.StartDateIso}, Formatted: ${dateStr} ${timeStr} ${timezoneDisplay}`);
    
    return { dateStr, timeStr, timezone: timezoneDisplay };
  };

  // Get therapist category from selected therapist data
  const getTherapistCategory = () => {
    const therapist = currentUserData?.selected_therapist;
    const program = therapist?.program?.trim();
    const paymentType = currentUserData?.payment_type;
    
    console.log('🏷️ [Booking Confirmation] Complete therapist debug:', {
      has_selected_therapist: !!therapist,
      therapist_keys: therapist ? Object.keys(therapist) : [],
      program_value: program,
      raw_program: therapist?.program,
      payment_type: paymentType,
      full_therapist: therapist
    });
    
    // Primary: Use program field if available
    if (program === 'Limited Permit') return 'Associate Therapist';
    if (program === 'MHC' || program === 'MSW' || program === 'MFT') return 'Graduate Therapist';
    
    // Fallback: Use payment type logic as a secondary indicator
    // Insurance clients typically get Associate Therapists, Cash pay gets Graduate Therapists
    if (paymentType === 'insurance') {
      console.log('🏷️ [Booking Confirmation] Using payment type fallback: insurance -> Associate Therapist');
      return 'Associate Therapist';
    } else if (paymentType === 'cash_pay') {
      console.log('🏷️ [Booking Confirmation] Using payment type fallback: cash_pay -> Graduate Therapist');
      return 'Graduate Therapist';
    }
    
    // Final fallback
    console.log('🏷️ [Booking Confirmation] Using final fallback: Graduate Therapist');
    return 'Graduate Therapist';
  };

  // Get session duration based on therapist category
  const getSessionDuration = () => {
    const category = getTherapistCategory();
    return category === 'Associate Therapist' ? 55 : 45;
  };

  // Handle portal setup with correct link logic
  const handlePortalSetup = () => {
    const therapistCategory = getTherapistCategory();
    const paymentType = currentUserData?.payment_type || 'cash_pay';
    
    let portalUrl = '';
    
    if (therapistCategory === 'Graduate Therapist' && paymentType === 'cash_pay') {
      portalUrl = 'https://solhealth.intakeq.com/connect';
    } else if (therapistCategory === 'Associate Therapist' && paymentType === 'insurance') {
      portalUrl = 'https://solhealthnj.intakeq.com/connect';
    } else {
      // Default fallback
      portalUrl = 'https://solhealth.intakeq.com/connect';
    }
    
    window.open(portalUrl, '_blank');
  };

  if (!bookingData || !currentUserData) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100%' }}>
        <div className="text-center">
          <p className="text-red-600 mb-4" style={{ fontFamily: 'var(--font-inter)' }}>
            Booking information not available
          </p>
          <Button onClick={onBack} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const { dateStr, timeStr, timezone } = formatAppointmentDateTime();

  // Debug therapist data
  console.log('🎬 BOOKING CONFIRMATION DEBUG:', {
    has_booking_data: !!bookingData,
    practitioner_name: bookingData.PractitionerName,
    has_current_user_data: !!currentUserData,
    has_selected_therapist: !!currentUserData.selected_therapist,
    selected_therapist_data: currentUserData.selected_therapist,
    image_link: currentUserData.selected_therapist?.image_link,
    image_url_processed: currentUserData.selected_therapist?.image_link ? getImageUrl(currentUserData.selected_therapist.image_link) : 'No image link',
    imageError: imageError
  });

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      {/* Header with Sol Health Logo */}
      <div className="relative h-16 overflow-hidden flex-shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <div className="w-9" /> {/* Spacer for centering - no back button on final page */}
          
          {/* Sol Health Logo */}
          <div className="flex items-center">
            <Image
              src="/sol-health-logo.svg"
              alt="Sol Health"
              width={100}
              height={20}
              className="h-5 w-auto"
            />
          </div>
          
          <div className="w-9" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-6 max-w-md mx-auto">
        {/* Welcome Header */}
        <div className="text-center mb-6">
          <h1 className="very-vogue-title text-2xl sm:text-3xl md:text-4xl text-gray-800 mb-4">
            A Warm Welcome to Sol, {currentUserData.preferred_name || currentUserData.first_name}! 🌞
          </h1>
        </div>

        {/* Therapist & Appointment Details Card */}
        <Card className="mb-4 bg-white border border-[#5C3106] rounded-2xl shadow-[1px_1px_0_#5C3106]">
          <CardContent className="p-4">
            {/* Therapist Profile */}
            <div className="flex items-center gap-3 mb-4">
              {currentUserData.selected_therapist?.image_link && !imageError && getImageUrl(currentUserData.selected_therapist.image_link) ? (
                <div className="relative w-12 h-12">
                  <img
                    src={getImageUrl(currentUserData.selected_therapist.image_link)}
                    alt={bookingData.PractitionerName}
                    className="w-full h-full rounded-full object-cover border-2 border-gray-200 shadow-sm"
                    onError={() => {
                      console.error('[Booking Confirmation] Failed to load therapist image:', currentUserData.selected_therapist?.image_link);
                      console.error('[Booking Confirmation] Processed image URL:', currentUserData.selected_therapist?.image_link ? getImageUrl(currentUserData.selected_therapist.image_link) : 'N/A');
                      setImageError(true);
                    }}
                    onLoad={() => console.log(`[Booking Confirmation] Successfully loaded therapist image for ${bookingData.PractitionerName}`)}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-gray-200 shadow-sm">
                  <span className="text-lg font-medium text-gray-600">
                    {(bookingData.PractitionerName?.charAt(0) || currentUserData.selected_therapist?.name?.charAt(0) || currentUserData.preferred_name?.charAt(0) || currentUserData.first_name?.charAt(0) || 'T').toUpperCase()}
                  </span>
                </div>
              )}
              
              <div>
                <h2 className="very-vogue-title text-lg sm:text-xl text-gray-800">
                  {bookingData.PractitionerName || 'Your Therapist'}
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
                  {getTherapistCategory()}
                </p>
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'var(--font-inter)' }}>
                  {getSessionDuration()}-minute sessions
                </p>
              </div>
            </div>

            {/* Session Information */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <p className="font-medium text-gray-800 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                  {dateStr}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <p className="font-medium text-gray-800 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                  {timeStr} - {new Date(new Date(bookingData.StartDateIso).getTime() + getSessionDuration()*60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} {timezone}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Welcome Video Card */}
        <Card className="mb-6 bg-white border border-[#5C3106] rounded-2xl shadow-[1px_1px_0_#5C3106] overflow-hidden">
          <CardContent className="p-0">
            {/* Video thumbnail with play button overlay */}
            <div className="relative w-full bg-gray-100" style={{ aspectRatio: '16/9' }}>
              <button 
                onClick={() => setShowVideo(true)}
                className="absolute inset-0 w-full h-full hover:bg-gray-200 hover:bg-opacity-50 transition-colors group"
              >
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt="Welcome Video Thumbnail"
                    className="w-full h-full object-cover"
                    onError={() => {
                      console.error('Failed to load YouTube video thumbnail:', thumbnailUrl);
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center">
                    <div className="text-gray-400 text-sm text-center">
                      <p>Welcome Video</p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-black bg-opacity-70 rounded-full flex items-center justify-center group-hover:bg-black group-hover:bg-opacity-80 transition-all group-hover:scale-110">
                    <Play className="w-6 h-6 text-white ml-1" />
                  </div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* What to Expect Section */}
        <Card className="mb-6 bg-white border border-[#5C3106] rounded-2xl shadow-[1px_1px_0_#5C3106]">
          <CardContent className="p-4">
            <h3 className="very-vogue-title text-lg sm:text-xl text-gray-800 mb-4 text-center">
              What To Expect
            </h3>
            
            <div className="space-y-4 text-sm max-w-sm mx-auto" style={{ fontFamily: 'var(--font-inter)' }}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                  <span className="text-lg">📧</span>
                </div>
                <div className="text-left">
                  <p className="text-gray-700 leading-relaxed">Your session confirmation and invite<br />should land in your inbox shortly</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-red-50 rounded-full flex items-center justify-center">
                  <span className="text-lg">📝</span>
                </div>
                <div className="text-left">
                  <p className="text-gray-700 leading-relaxed">Fill out the Mandatory New Client form<br />(also in your inbox)</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                  <span className="text-lg">📱</span>
                </div>
                <div className="text-left">
                  <p className="text-gray-700 leading-relaxed">Register to your client portal below<br />(takes 3 seconds!)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portal Setup Button */}
        <Button
          onClick={handlePortalSetup}
          className="w-full bg-yellow-100 hover:bg-yellow-200 text-gray-800 rounded-full border border-[#5C3106] shadow-[1px_1px_0_#5C3106] text-base py-3 mb-6"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          Finish Portal Setup →
        </Button>

        {/* Contact Section */}
        <div className="text-center space-y-4">
          <p className="text-base font-medium text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
            Questions?
          </p>
          
          <div>
            <a 
              href="mailto:contact@solhealth.co"
              className="text-blue-600 hover:text-blue-800 transition-colors underline"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Contact Us
            </a>
          </div>

          {/* Instagram Icon */}
          <div className="pt-4">
            <a 
              href="https://www.instagram.com/solhealth.co/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {showVideo && cleanEmbedUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowVideo(false)}>
          <div className="bg-white rounded-lg p-4 w-full max-w-4xl mx-auto" onClick={e => e.stopPropagation()}>
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                A Warm Welcome to Sol! 🌞
              </h3>
            </div>
            
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
              <iframe
                key={`video-${isMuted}`}
                src={cleanEmbedUrl}
                className="w-full h-full rounded border-0"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                title="Welcome to Sol Video"
              />
              
            </div>
            
            <Button 
              onClick={() => setShowVideo(false)} 
              className="mt-4 w-full bg-yellow-100 hover:bg-yellow-200 text-gray-800 rounded-full border border-[#5C3106] shadow-[1px_1px_0_#5C3106]"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Close Video
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  preferredName?: string;
  state?: string;
  dateOfBirth?: string;
  memberId?: string;
  provider?: string;
  paymentType?: string;
  verificationData?: {
    benefits?: {
      copay: string;
      coinsurance: string;
      memberObligation: string;
      deductible: string;
      remainingDeductible: string;
      oopMax: string;
      remainingOopMax: string;
      benefitStructure: string;
    };
    [key: string]: unknown;
  };}

interface SurveyData {
  // Safety Screening
  safety_screening: string;
  
  // Therapist Matching
  matching_preference: string;
  selected_therapist?: string;
  
  // Therapist Preferences (for matching algorithm)
  therapist_gender_preference: string;
  therapist_specialization: string[];
  therapist_lived_experiences: string[];
  
  // Alcohol and Drugs Screening
  alcohol_frequency: string;
  recreational_drugs_frequency: string;
  
  // Demographics
  first_name: string;
  last_name: string;
  email: string;
  preferred_name?: string;
  phone?: string;
  age: string;
  gender: string;
  state: string;
  race_ethnicity: string[];
  
  // Mental Health Screening (PHQ-9)
  pleasure_doing_things: string;
  feeling_down: string;
  trouble_falling: string;
  feeling_tired: string;
  poor_appetite: string;
  feeling_bad_about_yourself: string;
  trouble_concentrating: string;
  moving_or_speaking_so_slowly: string;
  suicidal_thoughts: string;
  
  // Anxiety Screening (GAD-7)
  feeling_nervous: string;
  not_control_worrying: string;
  worrying_too_much: string;
  trouble_relaxing: string;
  being_so_restless: string;
  easily_annoyed: string;
  feeling_afraid: string;
  
  // Additional
  lived_experiences: string[];
  university?: string;
  referred_by?: string | string[];
}

// No longer needed
// interface ModalContinueData {
//   type: string;
//   formData: FormData;
// }

export default function MainPageComponent() {
  // Add new state for onboarding
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingStep] = useState(0); // Track which step we're on
  const [onboardingData, setOnboardingData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    preferredName?: string;
    state?: string;
    whatBringsYou?: string;
  } | null>(null);
  
  // Modal states - no longer needed
  // const [isInsuranceModalOpen, setIsInsuranceModalOpen] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType | null>(null);
  
  // Flow state
  const [currentStep, setCurrentStep] = useState<STEPS | null>(null);
  const [clientResponseId, setClientResponseId] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<BookAppointmentResponse | null>(null);
  const [isSearchingAnotherTherapist, setIsSearchingAnotherTherapist] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);
  const [isBookingInProgress, setIsBookingInProgress] = useState(false);
  const [isIntakeQProcessing, setIsIntakeQProcessing] = useState(false);
  
  // Comprehensive user data state
  const [currentUserData, setCurrentUserData] = useState<ComprehensiveUserData | null>(null);
  
  // SuperJson state for comprehensive data management
  const [superJsonData, setSuperJsonData] = useState<SuperJsonData | null>(null);
  
  // Track whether user is changing preferences vs starting fresh
  const [isChangingPreferences, setIsChangingPreferences] = useState(false);
  
  // Therapist preloading state
  const [therapistPreloader, setTherapistPreloader] = useState<(() => Promise<void>) | null>(null);

  // Appointments service
  const { bookAppointment } = useAppointmentsService();

  // Use the polling hook from the API
  const { matchData, loading, error, utmUserId, pollFormAndRequestMatch } = usePollFormAndRequestMatch();

  // No payment type persistence - always start fresh

  // Handle onboarding completion
  const handleOnboardingComplete = (
    data: {
      firstName: string;
      lastName: string;
      email: string;
      preferredName?: string;
      state?: string;
      provider?: string;
      memberId?: string;
      dateOfBirth?: string;
      paymentType?: string;
      whatBringsYou?: string;
      verificationData?: FormData['verificationData'];
    }
  ) => {
    console.log('🎯 ONBOARDING COMPLETE - Data received:', data);
    // Payment type from onboarding
    
    setOnboardingData({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      preferredName: data.preferredName,
      state: data.state,
    });
    
    // Set payment type from onboarding data
    const paymentType = data.paymentType as PaymentType;
    // Setting selectedPaymentType
    setSelectedPaymentType(paymentType);
    
    setFormData({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      preferredName: data.preferredName,
      state: data.state,
      provider: data.provider,
      memberId: data.memberId,
      dateOfBirth: data.dateOfBirth,
      paymentType: paymentType,
      verificationData: data.verificationData as FormData['verificationData']
    });
    
    setShowOnboarding(false);
    setCurrentStep(STEPS.TYPEFORM);
  };

  const handleSelectPaymentType = (type: PaymentType) => {
    console.log('🎯 Payment type selected:', type);
    setSelectedPaymentType(type);
  };

  // No longer needed - insurance is handled in onboarding flow
  // const handleModalContinue = (data: ModalContinueData) => {
  //   console.log('Modal continue with data:', data);
  //   // Merge onboarding data with insurance verification data
  //   setFormData({
  //     ...data.formData,
  //     ...(onboardingData || {})
  //   });
  //   setSelectedPaymentType(data.type as PaymentType);
  //   setCurrentStep(STEPS.TYPEFORM);
  // };

  // Function to send SuperJson updates to backend for Google Sheets logging
  const sendSuperJsonToBackend = useCallback(async (superJson: SuperJsonData, stage: string) => {
    try {
      console.log(`🔄 Sending SuperJson to backend for stage: ${stage}`);
      await axiosInstance.post('/clients_signup/update_journey', {
        response_id: superJson.response_id,
        stage,
        super_json_data: superJson
      });
      console.log(`✅ SuperJson sent to backend successfully for stage: ${stage}`);
    } catch (error) {
      console.error(`❌ Failed to send SuperJson to backend for stage ${stage}:`, error);
      // Don't throw - we don't want to break the user flow if logging fails
    }
  }, []);

  // Updated to handle custom survey submission
  const handleSurveySubmit = useCallback(async (surveyData: SurveyData) => {
    console.log('🎯 Survey submitted with data:', surveyData);
    console.log('🎯 Current selectedPaymentType state:', selectedPaymentType);
    
    setCurrentStep(null); // Hide survey, show loading
    setIsProcessingResponse(true);
    setIsChangingPreferences(false); // Reset changing preferences state

    try {
      // Generate a unique response ID
      const responseId = `response_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      setClientResponseId(responseId);

      // ============== MAIN COMPONENT SUPERJSON BUILD ==============
      console.log('🎯 ==========================================');
      console.log('🎯 MAIN COMPONENT - SUPERJSON BUILD CALL');
      console.log('🎯 ==========================================');
      
      console.log('📊 PRE-BUILD DATA ANALYSIS:', {
        responseId,
        hasSelectedPaymentType: !!selectedPaymentType,
        selectedPaymentType: selectedPaymentType,
        hasOnboardingData: !!onboardingData,
        hasFormData: !!formData,
        hasFormDataVerification: !!(formData?.verificationData),
        surveyDataKeys: Object.keys(surveyData).length,
        timestamp: new Date().toISOString()
      });
      
      if (onboardingData) {
        console.log('🎯 ONBOARDING DATA PASSED TO SUPERJSON:', {
          firstName: onboardingData.firstName,
          lastName: onboardingData.lastName,
          email: onboardingData.email,
          state: onboardingData.state,
          provider: (onboardingData as any).provider,
          memberId: (onboardingData as any).memberId,
          dateOfBirth: (onboardingData as any).dateOfBirth,
          paymentType: (onboardingData as any).paymentType
        });
      }
      
      if (formData) {
        console.log('🎯 FORM DATA PASSED TO SUPERJSON:', {
          provider: formData.provider,
          memberId: formData.memberId,
          dateOfBirth: formData.dateOfBirth,
          hasVerificationData: !!formData.verificationData,
          paymentType: formData.paymentType
        });
      }
      
      console.log('🎯 SURVEY DATA SAMPLE:', {
        firstName: surveyData.first_name,
        lastName: surveyData.last_name,
        email: surveyData.email,
        age: surveyData.age,
        state: surveyData.state,
        totalFields: Object.keys(surveyData).length
      });
      
      console.log('🎯 ==========================================');

      // Build comprehensive SuperJson data payload  
      const superJson = buildSuperJson(
        responseId,
        {
          ...surveyData,
          date_of_birth: '',
          terms_accepted: true
        } as any,
        selectedPaymentType || 'cash_pay',
        onboardingData || undefined,
        formData || undefined,
        new Date().toISOString()
      );

      // Store SuperJson in state
      setSuperJsonData(superJson);

      console.log('🏗️ SuperJson built with comprehensive data:', {
        total_fields: Object.keys(superJson).length,
        phq9_score: superJson.phq9_total_score,
        gad7_score: superJson.gad7_total_score,
        has_insurance_data: !!superJson.insurance_verification_data,
        completeness_score: superJson.data_completeness_score
      });

      // Build comprehensive user data from SuperJson for backward compatibility
      const comprehensiveUserData: ComprehensiveUserData = {
        // Core identity from SuperJson
        id: superJson.response_id,
        response_id: superJson.response_id,
        first_name: superJson.first_name,
        last_name: superJson.last_name,
        preferred_name: superJson.preferred_name,
        email: superJson.email,
        phone: superJson.phone,
        
        // Assessment scores from SuperJson
        phq9_scores: superJson.phq9_responses,
        phq9_total: superJson.phq9_total_score,
        gad7_scores: superJson.gad7_responses,
        gad7_total: superJson.gad7_total_score,
        
        // Demographics from SuperJson
        age: superJson.age,
        date_of_birth: superJson.date_of_birth,
        gender: superJson.gender,
        state: superJson.state,
        race_ethnicity: superJson.race_ethnicity,
        lived_experiences: superJson.lived_experiences,
        university: superJson.university,
        
        // Therapy context from SuperJson
        what_brings_you: superJson.what_brings_you,
        therapist_gender_preference: superJson.therapist_identifies_as,
        therapist_specialization: superJson.therapist_specializes_in,
        therapist_lived_experiences: superJson.lived_experiences,
        
        // Substance screening from SuperJson
        alcohol_frequency: superJson.alcohol_frequency,
        recreational_drugs_frequency: superJson.recreational_drugs_frequency,
        
        // Safety and matching from SuperJson
        safety_screening: superJson.safety_screening,
        matching_preference: superJson.matching_preference,
        
        // Payment info from SuperJson
        payment_type: superJson.payment_type,
        
        // Insurance data from SuperJson (if applicable)
        ...(superJson.payment_type === 'insurance' && superJson.nirvana_raw_response && {
          insurance_data: {
            provider: superJson.insurance_provider,
            member_id: superJson.insurance_member_id,
            date_of_birth: superJson.insurance_date_of_birth,
            verification_response: superJson.nirvana_raw_response,
            benefits: superJson.nirvana_benefits
          }
        }),
        
        // Tracking from SuperJson
        utm: {
          utm_source: superJson.utm_source || 'hello_sol',
          utm_medium: superJson.utm_medium || 'direct',
          utm_campaign: superJson.utm_campaign || 'onboarding'
        },
        referred_by: superJson.referred_by ? [superJson.referred_by] : undefined,
        onboarding_completed_at: superJson.journey_milestones?.onboarding_completed_at,
        survey_completed_at: superJson.survey_completed_at,
        last_updated: new Date().toISOString()
      };

      // Store comprehensive user data in state for later use
      setCurrentUserData(comprehensiveUserData);

      console.log('📦 Comprehensive user data created:', {
        response_id: comprehensiveUserData.response_id,
        has_phq9_scores: !!comprehensiveUserData.phq9_scores,
        phq9_total: comprehensiveUserData.phq9_total,
        has_gad7_scores: !!comprehensiveUserData.gad7_scores,
        gad7_total: comprehensiveUserData.gad7_total,
        has_therapist_preferences: !!(comprehensiveUserData.therapist_gender_preference || comprehensiveUserData.therapist_specialization?.length),
        has_substance_data: !!(comprehensiveUserData.alcohol_frequency || comprehensiveUserData.recreational_drugs_frequency),
        has_demographics: !!(comprehensiveUserData.race_ethnicity?.length || comprehensiveUserData.lived_experiences?.length),
        payment_type: comprehensiveUserData.payment_type,
        total_fields: Object.keys(comprehensiveUserData).length
      });

      // Use SuperJson as the complete client data payload
      const completeClientData = {
        ...superJson,
        // Ensure backend compatibility
        id: `client_${responseId}`,
        // SuperJson already contains all the comprehensive data we need
      };

      console.log('📦 Complete client data being sent:', completeClientData);
      // Payment type in client data
      console.log('🎯 SPECIFIC THERAPIST DEBUG:', {
        matching_preference: completeClientData.matching_preference,
        selected_therapist: completeClientData.selected_therapist,
        selected_therapist_email: completeClientData.selected_therapist_email,
        selected_therapist_data: completeClientData.selected_therapist_data
      });

      // Store the client response directly in our backend
      await axiosInstance.post('/clients_signup', completeClientData);
      // Client data stored successfully

      // Send initial SuperJson to backend for Google Sheets logging
      await sendSuperJsonToBackend(superJson, 'survey_completed');

      // Both insurance and cash_pay flows use the SAME therapist-matching API call
      await pollFormAndRequestMatch(responseId);
      
      // Note: therapist preloader will be created in the useEffect that handles match results
      
    } catch (error) {
      console.error('❌ Error processing survey:', error);
      alert('Error processing your survey. Please try again.');
      setCurrentStep(STEPS.TYPEFORM);
    } finally {
      setIsProcessingResponse(false);
    }
  }, [selectedPaymentType, pollFormAndRequestMatch, formData, onboardingData, sendSuperJsonToBackend]);

  const handleBackFromSurvey = () => {
    setCurrentStep(null);
    setSelectedPaymentType(null);
    setFormData(null);
    setCurrentUserData(null);
    setIsChangingPreferences(false);
    setTherapistPreloader(null); // Clear preloader when going back
    setShowOnboarding(true);
  };

  const handleChangePreferences = () => {
    setIsChangingPreferences(true);
    setCurrentStep(STEPS.TYPEFORM);
    setClientResponseId(null);
    setTherapistPreloader(null); // Clear preloader when changing preferences
  };

  const handleBookSession = (bookedSession: BookAppointmentResponse) => {
    // Prevent duplicate processing of the same booking
    if (isBookingInProgress) {
      console.warn('⚠️ Booking already in progress, ignoring duplicate call');
      return;
    }
    
    // Session booked successfully
    
    // Track Meta pixel conversion for successful appointment booking
    if (typeof window !== 'undefined' && window.fbq) {
      const sessionPaymentType = currentUserData?.payment_type || 'cash_pay';
      const sessionValue = sessionPaymentType === 'cash_pay' ? 30 : 0;
      window.fbq('track', 'Purchase', {
        content_name: 'Therapy Session Booked',
        content_category: 'appointment_booking',
        content_type: sessionPaymentType,
        value: sessionValue,
        currency: 'USD',
        therapist_name: bookedSession.PractitionerName,
        therapist_email: bookedSession.PractitionerEmail,
        appointment_id: bookedSession.Id,
        session_duration: bookedSession.Duration
      });
    }
    
    // Log appointment info after successful booking
    console.log('📅 APPOINTMENT INFO (AFTER BOOKING):', {
      has_appointment: true,
      start_date_iso: bookedSession.StartDateIso,
      end_date_iso: bookedSession.EndDateIso,
      start_date_local: bookedSession.StartDateLocal,
      end_date_local: bookedSession.EndDateLocal,
      therapist_name: bookedSession.PractitionerName,
      therapist_email: bookedSession.PractitionerEmail,
      appointment_id: bookedSession.Id,
      client_id: bookedSession.ClientId,
      client_name: bookedSession.ClientName,
      session_duration: bookedSession.Duration,
      booked_by_client: bookedSession.BookedByClient,
      status: bookedSession.Status
    });
    
    setBookingData(bookedSession);
    setCurrentStep(STEPS.CONFIRMATION);
    setIsBookingInProgress(false); // Reset booking state
    
    // Clear therapist preloader since booking is complete
    setTherapistPreloader(null);
    console.log('🧹 Cleared therapist preloader after booking - no longer needed');
    
    // Preload welcome video assets for the confirmation page
    console.log('🎬 Preloading welcome video assets for confirmation page...');
    const preloadWelcomeVideo = () => {
      // Preload YouTube thumbnail
      const videoId = 'q2dgtDe83uA';
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      
      const img = typeof window !== 'undefined' ? new window.Image() : null;
      if (img) {
        img.onload = () => console.log('✅ Welcome video thumbnail preloaded');
        img.onerror = () => console.warn('⚠️ Failed to preload welcome video thumbnail');
        img.src = thumbnailUrl;
      }
      
      // Preload Sol Health logo
      const logo = typeof window !== 'undefined' ? new window.Image() : null;
      if (logo) {
        logo.onload = () => console.log('✅ Sol Health logo preloaded');
        logo.onerror = () => console.warn('⚠️ Failed to preload Sol Health logo');
        logo.src = '/sol-health-logo.svg';
      }
    };
    
    // Run preload in background without blocking
    setTimeout(preloadWelcomeVideo, 100);
    
    // Enrich current user data with booking information
    if (currentUserData) {
      console.log('🔄 Enriching user data with booking information...');
      
      // Extract booking details from the response
      const enrichedUserData: ComprehensiveUserData = {
        ...currentUserData,
        // Note: We'll need to get therapist info from the booking context
        // This will be populated when we have the therapist data available
        last_updated: new Date().toISOString()
      };
      
      console.log('📋 Creating IntakeQ profile with enriched data:', {
        response_id: enrichedUserData.response_id,
        has_booking_data: !!bookedSession,
        total_fields: Object.keys(enrichedUserData).length
      });
      
      // Create comprehensive IntakeQ profile immediately
      createComprehensiveIntakeQProfile(enrichedUserData);
      
      // Update the user data state
      setCurrentUserData(enrichedUserData);
    } else {
      console.warn('⚠️ No currentUserData available for IntakeQ profile creation');
      console.log('Current state:', {
        currentUserData: currentUserData,
        bookedSession: bookedSession,
        clientResponseId: clientResponseId
      });
    }
  };

  const createComprehensiveIntakeQProfile = async (clientData: ComprehensiveUserData) => {
    // Prevent duplicate IntakeQ profile creation
    if (isIntakeQProcessing) {
      console.warn('⚠️ IntakeQ profile creation already in progress, skipping duplicate call');
      return;
    }
    
    // Additional safeguard: Check if we already have an IntakeQ client ID
    if (clientData.intakeq_client_id) {
      console.warn('⚠️ IntakeQ client already exists, skipping duplicate creation:', clientData.intakeq_client_id);
      return;
    }
    
    try {
      setIsIntakeQProcessing(true);
      console.log('🔄 =================================================');
      console.log('🔄 CREATING COMPREHENSIVE INTAKEQ PROFILE');
      console.log('🔄 =================================================');
      
      console.log('📋 Client Overview:', {
        email: clientData.email,
        preferred_name: clientData.preferred_name,
        first_name: clientData.first_name,
        last_name: clientData.last_name,
        payment_type: clientData.payment_type,
        response_id: clientData.response_id
      });

      console.log('📊 Assessment Data:', {
        has_phq9_scores: !!(clientData.phq9_scores && Object.keys(clientData.phq9_scores).length > 0),
        phq9_total: clientData.phq9_total,
        has_gad7_scores: !!(clientData.gad7_scores && Object.keys(clientData.gad7_scores).length > 0),
        gad7_total: clientData.gad7_total,
        phq9_questions_answered: clientData.phq9_scores ? Object.keys(clientData.phq9_scores).length : 0,
        gad7_questions_answered: clientData.gad7_scores ? Object.keys(clientData.gad7_scores).length : 0
      });

      console.log('🎯 Therapy Preferences:', {
        therapist_gender_preference: clientData.therapist_gender_preference,
        specialization_count: clientData.therapist_specialization?.length || 0,
        lived_experience_count: clientData.therapist_lived_experiences?.length || 0,
        therapist_specializations: clientData.therapist_specialization,
        therapist_lived_experiences: clientData.therapist_lived_experiences
      });

      console.log('🔍 Substance Use Screening:', {
        alcohol_frequency: clientData.alcohol_frequency,
        recreational_drugs_frequency: clientData.recreational_drugs_frequency
      });

      console.log('👤 Demographics:', {
        age: clientData.age,
        gender: clientData.gender,
        state: clientData.state,
        race_ethnicity_count: clientData.race_ethnicity?.length || 0,
        lived_experiences_count: clientData.lived_experiences?.length || 0,
        university: clientData.university
      });

      console.log('💳 Insurance Data:', {
        has_insurance_data: !!(clientData.insurance_data?.provider),
        provider: clientData.insurance_data?.provider,
        member_id: clientData.insurance_data?.member_id,
        has_benefits: !!(clientData.insurance_data?.benefits),
        has_verification_response: !!(clientData.insurance_data?.verification_response),
        has_subscriber_info: !!(clientData.insurance_data?.verification_response?.subscriber),
        has_coverage_info: !!(clientData.insurance_data?.verification_response?.coverage),
        subscriber_address: (clientData.insurance_data?.verification_response?.subscriber as any)?.address,
        group_id: (clientData.insurance_data?.verification_response as any)?.coverage?.groupId,
        payer_id: (clientData.insurance_data?.verification_response as any)?.coverage?.payerId,
        plan_name: (clientData.insurance_data?.verification_response as any)?.coverage?.planName
      });

      console.log('👩‍⚕️ Selected Therapist:', {
        has_selected_therapist: !!(clientData.selected_therapist),
        therapist_name: clientData.selected_therapist?.name,
        therapist_email: clientData.selected_therapist?.email,
        therapist_specialties_count: clientData.selected_therapist?.specialties?.length || 0
      });

      console.log('📅 Appointment Info:', {
        has_appointment: !!(clientData.appointment),
        date: clientData.appointment?.date,
        time: clientData.appointment?.time,
        timezone: clientData.appointment?.timezone
      });

      const totalFieldsPopulated = Object.entries(clientData).filter(([, value]) => {
        if (value === undefined || value === null || value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === 'object' && Object.keys(value).length === 0) return false;
        return true;
      }).length;

      console.log('📊 Data Completeness:', {
        total_fields_in_interface: Object.keys(clientData).length,
        total_fields_populated: totalFieldsPopulated,
        completeness_percentage: Math.round((totalFieldsPopulated / Object.keys(clientData).length) * 100)
      });

      // Convert comprehensive data to IntakeQ format
      const intakeQData = {
        ...clientData,
        // Set billing type based on payment type
        BillingType: clientData.payment_type === 'insurance' ? 2 : 1, // 1 = cash pay, 2 = insurance
        
        // Basic client address information (for all clients)
        Address: [clientData.street_address, clientData.city, clientData.state, clientData.postal_code].filter(Boolean).join(", "),
        StreetAddress: clientData.street_address,
        City: clientData.city,
        State: clientData.state,
        StateShort: clientData.state,
        PostalCode: clientData.postal_code,
        Country: "US",
        
        // Map insurance data to IntakeQ standard fields (only for insurance clients)
        ...(clientData.payment_type === 'insurance' && clientData.insurance_data && {
          // Override Basic Information with Nirvana subscriber data (if available)
          ...((clientData.insurance_data.verification_response?.subscriber as any)?.address && 
              typeof (clientData.insurance_data.verification_response?.subscriber as any).address === 'object' && {
            Address: (clientData.insurance_data.verification_response as any).subscriber.address.fullAddress || 
                     [(clientData.insurance_data.verification_response as any).subscriber.address.streetLine1,
                      (clientData.insurance_data.verification_response as any).subscriber.address.city,
                      (clientData.insurance_data.verification_response as any).subscriber.address.state,
                      (clientData.insurance_data.verification_response as any).subscriber.address.zip].filter(Boolean).join(", "),
            StreetAddress: (clientData.insurance_data.verification_response as any).subscriber.address.streetLine1,
            UnitNumber: (clientData.insurance_data.verification_response as any).subscriber.address.streetLine2,
            City: (clientData.insurance_data.verification_response as any).subscriber.address.city,
            State: (clientData.insurance_data.verification_response as any).subscriber.address.state,
            StateShort: (clientData.insurance_data.verification_response as any).subscriber.address.state,
            PostalCode: (clientData.insurance_data.verification_response as any).subscriber.address.zip,
          }),
          
          // Primary Insurance Information
          PrimaryInsuranceCompany: clientData.insurance_data.provider,
          PrimaryInsurancePayerId: (clientData.insurance_data.verification_response as any)?.coverage?.payerId,
          PrimaryInsurancePolicyNumber: clientData.insurance_data.member_id,
          PrimaryInsuranceGroupNumber: (clientData.insurance_data.verification_response as any)?.coverage?.groupId,
          PrimaryInsurancePlan: (clientData.insurance_data.verification_response as any)?.coverage?.planName,
          
          // Policyholder Information (Primary Insurance Holder)
          PrimaryInsuranceHolderName: `${(clientData.insurance_data.verification_response as any)?.subscriber?.firstName || clientData.first_name} ${(clientData.insurance_data.verification_response as any)?.subscriber?.lastName || clientData.last_name}`,
          PrimaryInsuranceHolderDateOfBirth: clientData.date_of_birth ? new Date(clientData.date_of_birth).getTime() : undefined,
          PrimaryRelationshipToInsured: (clientData.insurance_data.verification_response as any)?.subscriber?.relationshipToSubscriber || "Self",
          PrimaryInsuredGender: (clientData.insurance_data.verification_response as any)?.subscriber?.gender || clientData.gender,
          
          // Policyholder Address Information
          PrimaryInsuredStreetAddress: (clientData.insurance_data.verification_response as any)?.subscriber?.address?.streetLine1 || clientData.street_address,
          PrimaryInsuredCity: (clientData.insurance_data.verification_response as any)?.subscriber?.address?.city || clientData.city,
          PrimaryInsuredState: (clientData.insurance_data.verification_response as any)?.subscriber?.address?.state || clientData.state,
          PrimaryInsuredZipCode: (clientData.insurance_data.verification_response as any)?.subscriber?.address?.zip || clientData.postal_code,
          
          // Legacy fields for backward compatibility
          insurance_provider: clientData.insurance_data.provider,
          insurance_member_id: clientData.insurance_data.member_id,
          insurance_date_of_birth: clientData.insurance_data.date_of_birth,
          insurance_verification_data: clientData.insurance_data.verification_response ? JSON.stringify(clientData.insurance_data.verification_response) : undefined,
          
          // Extract benefits if available (custom fields)
          ...(clientData.insurance_data.benefits && {
            copay: clientData.insurance_data.benefits.copay,
            deductible: clientData.insurance_data.benefits.deductible,
            coinsurance: clientData.insurance_data.benefits.coinsurance,
            out_of_pocket_max: clientData.insurance_data.benefits.oopMax,
            remaining_deductible: clientData.insurance_data.benefits.remainingDeductible,
            remaining_oop_max: clientData.insurance_data.benefits.remainingOopMax,
            member_obligation: clientData.insurance_data.benefits.memberObligation,
            benefit_structure: clientData.insurance_data.benefits.benefitStructure
          }),
          
          // Extract extended Nirvana data from verification response (custom fields)
          ...((() => {
            const coverage = clientData.insurance_data.verification_response?.coverage;
            return coverage && typeof coverage === 'object' && coverage !== null ? {
              insurance_type: (coverage as any).insuranceType,
              plan_status: (coverage as any).planStatus,
              coverage_status: (coverage as any).coverageStatus,
              mental_health_coverage_status: (coverage as any).mentalHealthCoverage,
            } : {};
          })()),
          
          // Extract additional financial data (custom fields matching IntakeQ example)  
          ...((() => {
            const rawFinancials = clientData.insurance_data.verification_response?.rawFinancials;
            return rawFinancials && typeof rawFinancials === 'object' && rawFinancials !== null ? {
              pre_deductible_member_obligation: (rawFinancials as any).preDeductibleMemberObligation ? 
                `$${((rawFinancials as any).preDeductibleMemberObligation / 100).toFixed(2)}` : undefined,
              post_deductible_member_obligation: (rawFinancials as any).postDeductibleMemberObligation ? 
                `$${((rawFinancials as any).postDeductibleMemberObligation / 100).toFixed(2)}` : undefined,
            } : {};
          })()),
          
          // Extract session tracking from raw Nirvana response (custom fields)
          ...((() => {
            const rawNirvanaResponse = clientData.insurance_data.verification_response?.rawNirvanaResponse;
            return rawNirvanaResponse && typeof rawNirvanaResponse === 'object' && rawNirvanaResponse !== null ? {
              sessions_before_deductible_met: (rawNirvanaResponse as any).remaining_sessions_before_deductible,
              sessions_before_oop_max_met: (rawNirvanaResponse as any).remaining_sessions_before_oop_max
            } : {};
          })()),
          
          // Extract telehealth information (custom fields)
          ...((() => {
            const telehealth = clientData.insurance_data.verification_response?.telehealth;
            return telehealth && typeof telehealth === 'object' && telehealth !== null ? {
              telehealth_coinsurance: (telehealth as any).coinsurance,
              telehealth_benefit_structure: (telehealth as any).benefitStructure
            } : {};
          })()),
          
          // Keep raw data for backend processing
          ...((() => {
            const rawFinancials = clientData.insurance_data.verification_response?.rawFinancials;
            const rawNirvanaResponse = clientData.insurance_data.verification_response?.rawNirvanaResponse;
            return rawFinancials && typeof rawFinancials === 'object' && rawFinancials !== null ? {
              insurance_copayment_cents: (rawFinancials as any).copayment,
              insurance_coinsurance_percent: (rawFinancials as any).coinsurance,
              insurance_deductible_cents: (rawFinancials as any).deductible,
              insurance_remaining_deductible_cents: (rawFinancials as any).remainingDeductible,
              insurance_oop_max_cents: (rawFinancials as any).oopMax,
              insurance_remaining_oop_max_cents: (rawFinancials as any).remainingOopMax,
              insurance_member_obligation_cents: (rawFinancials as any).memberObligation,
              insurance_payer_obligation_cents: (rawFinancials as any).payerObligation,
              insurance_remaining_sessions_before_deductible: (rawNirvanaResponse as any)?.remaining_sessions_before_deductible,
              insurance_remaining_sessions_before_oop_max: (rawNirvanaResponse as any)?.remaining_sessions_before_oop_max
            } : {};
          })())
        }),
        
        // Pass complete Nirvana data to backend for comprehensive processing
        ...(clientData.payment_type === 'insurance' && clientData.insurance_data?.verification_response?.rawNirvanaResponse ? {
          nirvana_data: clientData.insurance_data.verification_response.rawNirvanaResponse,
          insurance_verification_data: JSON.stringify(clientData.insurance_data.verification_response.rawNirvanaResponse),
          rawNirvanaResponse: clientData.insurance_data.verification_response.rawNirvanaResponse
        } : {}),
        
        // Flatten UTM data
        ...(clientData.utm && {
          utm_source: clientData.utm.utm_source,
          utm_medium: clientData.utm.utm_medium,
          utm_campaign: clientData.utm.utm_campaign
        })
      };

      console.log('🚀 Calling IntakeQ API with payload:', {
        payload_keys: Object.keys(intakeQData),
        payload_size: JSON.stringify(intakeQData).length,
        has_assessment_totals: !!(intakeQData.phq9_total !== undefined && intakeQData.gad7_total !== undefined),
        payment_type: intakeQData.payment_type,
        billing_type: intakeQData.BillingType,
        
        // Address Information
        address: intakeQData.Address,
        street_address: intakeQData.StreetAddress,
        city: intakeQData.City,
        state: intakeQData.State,
        postal_code: intakeQData.PostalCode,
        
        // Primary Insurance Information  
        primary_insurance_company: intakeQData.PrimaryInsuranceCompany,
        primary_insurance_payer_id: intakeQData.PrimaryInsurancePayerId,
        primary_insurance_policy_number: intakeQData.PrimaryInsurancePolicyNumber,
        primary_insurance_group_number: intakeQData.PrimaryInsuranceGroupNumber,
        primary_insurance_plan: intakeQData.PrimaryInsurancePlan,
        
        // Policyholder Information
        primary_insurance_holder_name: intakeQData.PrimaryInsuranceHolderName,
        primary_relationship_to_insured: intakeQData.PrimaryRelationshipToInsured,
        primary_insured_gender: intakeQData.PrimaryInsuredGender,
        primary_insured_address: intakeQData.PrimaryInsuredStreetAddress,
        primary_insured_city: intakeQData.PrimaryInsuredCity,
        primary_insured_state: intakeQData.PrimaryInsuredState,
        primary_insured_zip: intakeQData.PrimaryInsuredZipCode
      });

      const intakeQResult = await IntakeQService.createClientProfile(intakeQData);
      
      console.log('📥 IntakeQ API Response:', {
        success: intakeQResult.success,
        client_id: intakeQResult.client_id,
        intake_url: intakeQResult.intake_url,
        error: intakeQResult.error
      });
      
      if (intakeQResult.success) {
        // IntakeQ profile created successfully
        console.log('IntakeQ Profile Details:', {
          client_id: intakeQResult.client_id,
          intake_url: intakeQResult.intake_url,
          total_fields_sent: Object.keys(intakeQData).length,
          assessment_scores: {
            phq9_total: clientData.phq9_total,
            gad7_total: clientData.gad7_total
          },
          therapist_info: clientData.selected_therapist ? {
            name: clientData.selected_therapist.name,
            email: clientData.selected_therapist.email
          } : 'None selected',
          appointment_info: clientData.appointment ? {
            date: clientData.appointment.date,
            time: clientData.appointment.time
          } : 'None scheduled'
        });
        
        // Send mandatory form after successful client creation
        if (intakeQResult.client_id) {
          await sendMandatoryFormAfterBooking(intakeQResult.client_id, clientData);
        } else {
          console.warn('⚠️ No client_id available to send mandatory form');
        }
        
        // Update the user data state with IntakeQ info
        if (currentUserData) {
          // Check if backend returns client_uuid for proper URL format
          // The UUID (e.g., e5a0a85b-af74-478d-bd77-22dc8072db71) should come from IntakeQ API
          const extendedResult = intakeQResult as any;
          const clientUrl = extendedResult.client_uuid 
            ? `https://intakeq.com/#/client/${extendedResult.client_uuid}?tab=overview`
            : intakeQResult.intake_url; // fallback to form URL if no UUID
            
          console.log('🔗 IntakeQ URL update for state:', {
            has_client_uuid: !!extendedResult.client_uuid,
            client_uuid: extendedResult.client_uuid,
            final_url: clientUrl
          });
            
          setCurrentUserData({
            ...currentUserData,
            intakeq_client_id: intakeQResult.client_id,
            intakeq_intake_url: clientUrl,
            last_updated: new Date().toISOString()
          });
        }
        
        // Update the database with IntakeQ client ID
        if (intakeQResult.client_id && clientData.response_id) {
          try {
            // Check if we have a client_uuid for the proper URL format
            const extendedResult = intakeQResult as any;
            const clientUrl = extendedResult.client_uuid 
              ? `https://intakeq.com/#/client/${extendedResult.client_uuid}?tab=overview`
              : intakeQResult.intake_url; // fallback to form URL if no UUID
              
            console.log('🔗 IntakeQ URL format:', {
              has_client_uuid: !!extendedResult.client_uuid,
              client_uuid: extendedResult.client_uuid,
              original_intake_url: intakeQResult.intake_url,
              final_url: clientUrl
            });
            
            await axiosInstance.patch(`/clients_signup/${clientData.response_id}`, {
              intakeq_client_id: intakeQResult.client_id,
              intakeq_intake_url: clientUrl
            });
            // Database updated with IntakeQ client ID
          } catch (error) {
            console.warn('⚠️ Failed to update database with IntakeQ ID:', error);
          }
        }
      } else {
        console.error('❌ =================================================');
        console.error('❌ INTAKEQ PROFILE CREATION FAILED!');
        console.error('❌ =================================================');
        console.error('❌ Error Details:', {
          error: intakeQResult.error,
          payload_size: Object.keys(intakeQData).length,
          payment_type: intakeQData.payment_type,
          client_email: intakeQData.email
        });
      }
      
    } catch (error) {
      console.error('❌ =================================================');
      console.error('❌ EXCEPTION IN INTAKEQ PROFILE CREATION!');
      console.error('❌ =================================================');
      console.error('❌ Exception Details:', {
        error: error,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : 'No stack trace',
        client_data_available: !!clientData,
        response_id: clientData?.response_id
      });
    } finally {
      setIsIntakeQProcessing(false);
    }
  };

  // Function to send mandatory form after successful booking
  const sendMandatoryFormAfterBooking = async (clientId: string, clientData: ComprehensiveUserData) => {
    try {
      console.log('📋 =================================================');
      console.log('📋 SENDING MANDATORY INTAKEQ FORM');
      console.log('📋 =================================================');
      
      // Determine payment type from client data
      const paymentType = clientData.payment_type || 'cash_pay';
      // Payment type for mandatory form
      
      // Prepare form data
      const formData = {
        payment_type: paymentType,
        client_id: clientId,
        // Add practitioner/therapist ID if available
        practitioner_id: clientData.selected_therapist?.id || undefined,
        // Add therapist email for practitioner identification
        therapist_email: clientData.selected_therapist?.email || undefined,
        // Add external client ID for tracking
        external_client_id: clientData.response_id
      };
      
      console.log('📤 Form data being sent:', formData);
      
      // Send the mandatory form
      const formResult = await sendMandatoryForm(formData) as MandatoryFormResponse;
      
      console.log('📥 Mandatory form response:', {
        success: formResult.success,
        intake_id: formResult.intake_id,
        intake_url: formResult.intake_url,
        questionnaire_id: formResult.questionnaire_id
      });
      
      if (formResult.success) {
        // Mandatory form sent successfully
        console.log('Form Details:', {
          intake_id: formResult.intake_id,
          intake_url: formResult.intake_url,
          client_id: clientId,
          payment_type: paymentType,
          therapist_name: clientData.selected_therapist?.name || 'Not specified',
          client_name: `${clientData.first_name} ${clientData.last_name}`.trim()
        });
        
        // Update user data with form information
        if (currentUserData) {
          setCurrentUserData({
            ...currentUserData,
            mandatory_form_sent: true,
            mandatory_form_intake_id: formResult.intake_id,
            mandatory_form_intake_url: formResult.intake_url,
            last_updated: new Date().toISOString()
          });
        }
        
        // Update database with form information (temporarily disabled until schema is updated)
        if (clientData.response_id) {
          try {
            // Only update with existing fields for now
            await axiosInstance.patch(`/clients_signup/${clientData.response_id}`, {
              // mandatory_form_sent: true,  // TODO: Enable after schema update
              // mandatory_form_intake_id: formResult.intake_id,
              // mandatory_form_intake_url: formResult.intake_url,
              // mandatory_form_sent_at: new Date().toISOString()
            });
            // Database updated (mandatory form tracking temporarily disabled)
          } catch (dbError) {
            console.warn('⚠️ Failed to update database:', dbError);
            // Don't fail the flow if database update fails
          }
        }
        
      } else {
        console.error('❌ Failed to send mandatory form:', formResult);
      }
      
    } catch (error) {
      console.error('❌ =================================================');
      console.error('❌ EXCEPTION IN MANDATORY FORM SENDING!');
      console.error('❌ =================================================');
      console.error('❌ Exception Details:', {
        error: error,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : 'No stack trace',
        client_id: clientId,
        client_data_available: !!clientData,
        response_id: clientData?.response_id
      });
      
      // Don't throw the error - we don't want to break the booking flow
      // if the mandatory form fails to send
      console.warn('⚠️ Mandatory form sending failed, but continuing with booking flow');
    }
  };

  const handleShowBookingSection = useCallback(() => {
    // Additional logic when showing booking section
  }, []);

  const handleHideBookingSection = useCallback(() => {
    // Additional logic when hiding booking section
  }, []);

  // Effect to handle match results
  useEffect(() => {
    if (matchData?.therapists) {
      if (matchData.therapists.length > 0) {
        // Update SuperJson with therapist matching results
        setSuperJsonData(prevSuperJson => {
          if (prevSuperJson && prevSuperJson.current_stage !== 'therapist_matched') {
            const updatedSuperJson = updateSuperJsonWithTherapistMatch(prevSuperJson, matchData);
            console.log('🔄 SuperJson updated with therapist matching results');
            
            // Send update to backend for Google Sheets logging
            sendSuperJsonToBackend(updatedSuperJson, 'therapist_matched');
            
            return updatedSuperJson;
          }
          return prevSuperJson;
        });

        // Create preloader for ONLY the first therapist (not all of them)
        const firstTherapist = matchData.therapists[0];
        if (firstTherapist) {
          // Get user's timezone based on their state for consistency with MatchedTherapist
          const stateTimezoneMap: Record<string, string> = {
            // Eastern
            CT: "America/New_York", DE: "America/New_York", DC: "America/New_York", FL: "America/New_York",
            GA: "America/New_York", ME: "America/New_York", MD: "America/New_York", MA: "America/New_York",
            NH: "America/New_York", NJ: "America/New_York", NY: "America/New_York", NC: "America/New_York",
            OH: "America/New_York", PA: "America/New_York", RI: "America/New_York", SC: "America/New_York",
            VT: "America/New_York", VA: "America/New_York", WV: "America/New_York", MI: "America/New_York",
            IN: "America/New_York", KY: "America/New_York",
            // Central
            AL: "America/Chicago", AR: "America/Chicago", IA: "America/Chicago", IL: "America/Chicago",
            KS: "America/Chicago", LA: "America/Chicago", MN: "America/Chicago", MS: "America/Chicago",
            MO: "America/Chicago", NE: "America/Chicago", ND: "America/Chicago", OK: "America/Chicago",
            SD: "America/Chicago", TN: "America/Chicago", TX: "America/Chicago", WI: "America/Chicago",
            // Mountain
            AZ: "America/Phoenix", CO: "America/Denver", ID: "America/Denver", MT: "America/Denver",
            NM: "America/Denver", UT: "America/Denver", WY: "America/Denver", NV: "America/Denver",
            // Pacific
            CA: "America/Los_Angeles", OR: "America/Los_Angeles", WA: "America/Los_Angeles",
            // Alaska & Hawaii
            AK: "America/Anchorage", HI: "America/Adak"
          };
          
          let userTimezone = "America/New_York"; // Default to EST
          if (currentUserData?.state) {
            const stateUpper = String(currentUserData.state).toUpperCase().trim();
            userTimezone = stateTimezoneMap[stateUpper] || userTimezone;
          }
          
          const preloader = createTherapistPreloader(
            [firstTherapist], // Only preload the first therapist
            currentUserData?.state,
            selectedPaymentType || undefined,
            userTimezone // Pass user's timezone for calendar warmup
          );
          setTherapistPreloader(() => preloader);
        }
        
        setCurrentStep(STEPS.MATCHED_THERAPIST);
      } else {
        setCurrentStep(STEPS.NO_MATCH);
      }

      console.log('📦 Match data received:', {
        paymentType: selectedPaymentType,
        therapistsReturned: matchData.therapists.length,
        therapists: matchData.therapists,
        preloaderCreated: matchData.therapists.length > 0
      });
    }
  }, [matchData, selectedPaymentType, currentUserData?.state, sendSuperJsonToBackend]);

  // If showing onboarding flow
  if (showOnboarding) {
    return (
      <OnboardingFlow 
        onComplete={handleOnboardingComplete}
        onSelectPaymentType={handleSelectPaymentType}
        initialStep={onboardingStep} // Pass the current step
      />
    );
  }

  // If we're in loading state, show loading
  if (loading || isProcessingResponse || isBookingInProgress) {
    return (
      <LoadingScreen 
        variant={isBookingInProgress ? 'booking-confirmation' : 'therapist-matching'}
        preloadData={therapistPreloader || undefined}
        minDisplayTime={isBookingInProgress ? 8000 : 12000}
      />
    );
  }

  // If we have an error, show error
  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100%' }}>
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // If showing Custom Survey, render it
  if (currentStep === STEPS.TYPEFORM) {
    return (
      <CustomSurvey
        paymentType={selectedPaymentType || "insurance"}
        formData={{
          firstName: formData?.firstName || onboardingData?.firstName || "",
          lastName: formData?.lastName || onboardingData?.lastName || "",
          email: formData?.email || onboardingData?.email || "",
          preferredName: formData?.preferredName || onboardingData?.preferredName || "",
          state: formData?.state || onboardingData?.state || "", // Pass the state from onboarding
          provider: formData?.provider || "", // Insurance provider
          paymentType: formData?.paymentType || selectedPaymentType || "",
          dateOfBirth: formData?.dateOfBirth || "", // Insurance date of birth
          memberId: formData?.memberId || "", // Insurance member ID
          verificationData: formData?.verificationData || undefined // Insurance verification response
        }}
        existingUserData={isChangingPreferences && currentUserData ? currentUserData : undefined}
        onSubmit={handleSurveySubmit}
        onBack={isChangingPreferences ? handleBackFromSurvey : handleBackFromSurvey}
      />
    );
  }

  // If we have matched therapists or other steps, show with TherapistProvider
  if (currentStep === STEPS.MATCHED_THERAPIST || currentStep === STEPS.CONFIRMATION || currentStep === STEPS.NO_MATCH) {
    return (
      <TherapistProvider
        initialTherapistsList={matchData?.therapists || []}
        clientResponseId={clientResponseId}
        bookingData={bookingData}
        onBookSession={handleBookSession}
        onShowBooking={handleShowBookingSection}
        onHideBooking={handleHideBookingSection}
        setIsSearchingAnotherTherapist={setIsSearchingAnotherTherapist}
        utmUserId={utmUserId}
      >
        {isSearchingAnotherTherapist ? (
          <LoadingScreen />
        ) : (
          <div style={{ height: '100%' }}>
            {currentStep === STEPS.MATCHED_THERAPIST && matchData?.therapists && matchData.therapists.length > 0 && (() => {
              const clientData = {
                ...matchData.client,
                payment_type: (selectedPaymentType || (matchData.client as ExtendedClientData)?.payment_type) as 'cash_pay' | 'insurance' | undefined,
                response_id: clientResponseId || (matchData.client as ExtendedClientData)?.response_id,
              };
              
              console.log('🔍 CLIENT DATA DEBUG - Passing to MatchedTherapist:');
              console.log('selectedPaymentType:', selectedPaymentType);
              console.log('matchData.client:', matchData.client);
              console.log('final clientData:', clientData);
              console.log('🔍 THERAPIST DATA DEBUG:');
              console.log('matchData.therapists:', matchData.therapists);
              console.log('therapists length:', matchData.therapists?.length);
              console.log('first therapist:', matchData.therapists?.[0]);
              
              return (
                <MatchedTherapist
                  therapistsList={matchData.therapists}
                  clientData={clientData}
                  initialIndex={0}
                  onBack={handleChangePreferences}
                  onBookSession={async (therapistData, slot) => {
                    // Prevent duplicate booking attempts
                    if (isBookingInProgress) {
                      console.warn('⚠️ Booking already in progress, ignoring duplicate attempt');
                      return;
                    }
                    
                    try {
                      setIsBookingInProgress(true);
                      const therapist = therapistData.therapist;
                      
                      // COMPREHENSIVE TIMEZONE LOGGING FOR BOOKING FLOW
                      console.log('🚀 [MAIN COMPONENT] BOOKING INITIATED - TIMEZONE ANALYSIS');
                      console.log('==========================================');
                      console.log(`📅 Raw slot received from MatchedTherapist: ${slot}`);
                      console.log(`🕐 Slot type: ${typeof slot}`);
                      
                      // Parse and analyze the incoming datetime
                      const slotDate = new Date(slot);
                      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                      
                      console.log(`🌍 Browser timezone: ${browserTimezone}`);
                      console.log(`📅 Parsed slot date: ${slotDate.toISOString()}`);
                      console.log(`🕐 Slot in browser timezone: ${slotDate.toLocaleString()}`);
                      console.log(`⏰ Slot timestamp: ${slotDate.getTime()}`);
                      
                      // Test conversion in different timezones
                      const clientState = currentUserData?.state || 'Unknown';
                      console.log(`📍 Client state: ${clientState}`);
                      
                      if (clientState && clientState !== 'Unknown') {
                        const stateTimezoneMap: Record<string, string> = {
                          'CA': 'America/Los_Angeles',
                          'NY': 'America/New_York', 
                          'TX': 'America/Chicago',
                          'FL': 'America/New_York',
                          'IL': 'America/Chicago',
                          'NJ': 'America/New_York'
                        };
                        
                        const clientTimezone = stateTimezoneMap[clientState.toUpperCase()] || browserTimezone;
                        const slotInClientTz = slotDate.toLocaleString("en-US", { 
                          timeZone: clientTimezone,
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit', 
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                          timeZoneName: 'short'
                        });
                        
                        console.log(`🏠 Client timezone (${clientTimezone}): ${slotInClientTz}`);
                      }
                      
                      // Enrich current user data with selected therapist info BEFORE booking
                      if (currentUserData) {
                        // Debug therapist data structure
                        console.log('🖼️ [MAIN COMPONENT] Therapist data structure debug:', {
                          therapist_keys: Object.keys(therapist),
                          therapist_data_keys: Object.keys(therapistData),
                          image_link_in_therapist: therapist.image_link,
                          image_link_in_therapistData: therapistData.therapist?.image_link,
                          program_in_therapist: therapist.program,
                          program_in_therapistData: therapistData.therapist?.program,
                          cohort_in_therapist: therapist.cohort,
                          cohort_in_therapistData: therapistData.therapist?.cohort,
                          full_therapist_object: therapist,
                          full_therapistData_object: therapistData
                        });
                        
                        const therapistInfo = {
                          id: therapist.id || therapist.email || 'unknown',
                          name: therapist.name || therapist.intern_name || 'Unknown',
                          email: therapist.email || '',
                          bio: therapist.biography || '',
                          specialties: therapist.specialities || [],
                          // Try multiple possible image link fields to ensure we get the image
                          image_link: therapist.image_link || therapistData.therapist?.image_link || undefined,
                          states: therapist.states || [],
                          therapeutic_orientation: therapist.therapeutic_orientation || [],
                          // Try multiple sources for the program field
                          program: therapist.program || therapistData.therapist?.program || therapist.cohort || therapistData.therapist?.cohort || undefined
                        };
                        
                        console.log('🖼️ [MAIN COMPONENT] Created therapistInfo with program:', therapistInfo.program);
                        
                        // Calculate correct duration based on therapist program
                        const therapistCategory = therapistInfo.program?.trim() === 'Limited Permit' ? 'Associate Therapist' : 'Graduate Therapist';
                        const sessionDuration = therapistCategory === 'Associate Therapist' ? 55 : 45;
                        
                        console.log('🏷️ [MAIN COMPONENT] Therapist category calculation:', {
                          program: therapistInfo.program,
                          category: therapistCategory,
                          duration: sessionDuration
                        });
                        
                        const appointmentInfo = {
                          date: slotDate.toLocaleDateString(),
                          time: slotDate.toLocaleTimeString(),
                          timezone: browserTimezone,
                          duration: sessionDuration,
                          session_type: 'initial',
                          // Add debugging info
                          slot_raw: slot,
                          slot_iso: slotDate.toISOString(),
                          slot_timestamp: slotDate.getTime()
                        };
                        
                        const enrichedData = {
                          ...currentUserData,
                          selected_therapist: therapistInfo,
                          appointment: appointmentInfo,
                          last_updated: new Date().toISOString()
                        };
                        
                        console.log('🎯 [MAIN COMPONENT] Enriching user data with appointment details:');
                        console.log({
                          therapist_name: therapistInfo.name,
                          appointment_date: appointmentInfo.date,
                          appointment_time: appointmentInfo.time,
                          appointment_timezone: appointmentInfo.timezone,
                          raw_slot: slot,
                          parsed_slot_iso: appointmentInfo.slot_iso
                        });
                        
                        setCurrentUserData(enrichedData);

                        // Update SuperJson with selected therapist
                        if (superJsonData) {
                          const cleanTherapist = {
                            ...therapist,
                            image_link: therapist.image_link || undefined
                          };
                          const updatedSuperJson = updateSuperJsonWithSelectedTherapist(superJsonData, cleanTherapist);
                          setSuperJsonData(updatedSuperJson);
                          console.log('🔄 SuperJson updated with selected therapist');
                          
                          // Send update to backend for Google Sheets logging
                          await sendSuperJsonToBackend(updatedSuperJson, 'therapist_selected');
                        }
                      }
                      
                      // Log the final API request data
                      const apiRequestData = {
                        client_response_id: clientResponseId as string,
                        therapist_email: therapist.email || '',
                        therapist_name: therapist.name || '',
                        datetime: slot,
                        send_client_email_notification: true,
                        reminder_type: 'email',
                        status: 'scheduled',
                        // Add browser timezone for validation
                        browser_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                      };
                      
                      console.log('📡 [MAIN COMPONENT] API REQUEST TO BACKEND:');
                      console.log('==========================================');
                      console.log('API Endpoint: /api/appointments/book');
                      console.log('Request Data:', JSON.stringify(apiRequestData, null, 2));
                      console.log(`🕐 Datetime being sent to backend: ${slot}`);
                      console.log(`🕐 Datetime type: ${typeof slot}`);
                      console.log('==========================================');

                      const bookedSession = await bookAppointment.makeRequest({
                        data: apiRequestData,
                      });
                      
                      console.log('✅ [MAIN COMPONENT] API RESPONSE FROM BACKEND:');
                      console.log('Response:', JSON.stringify(bookedSession, null, 2));

                      // Update SuperJson with appointment confirmation
                      if (superJsonData) {
                        const updatedSuperJson = updateSuperJsonWithAppointmentConfirmation(superJsonData, bookedSession);
                        setSuperJsonData(updatedSuperJson);
                        console.log('🔄 SuperJson updated with appointment confirmation');
                        
                        // Send final update to backend for Google Sheets logging
                        await sendSuperJsonToBackend(updatedSuperJson, 'appointment_confirmed');
                      }

                      handleBookSession(bookedSession);
                    } catch (error) {
                      console.error('Error booking appointment:', error);
                      setIsBookingInProgress(false); // Reset on error
                      alert('Failed to book appointment. Please try again.');
                    }
                  }}
                />
              );
            })()}
                        
            {currentStep === STEPS.CONFIRMATION && (
              <BookingConfirmation 
                bookingData={bookingData}
                currentUserData={currentUserData}
                onBack={() => {
                  setCurrentStep(null);
                  setBookingData(null);
                  setShowOnboarding(true);
                }}
              />
            )}
            
            {currentStep === STEPS.NO_MATCH && (
              <div className="text-center py-20">
                <h2 className="text-2xl font-bold mb-4">No matches found</h2>
                <p className="text-gray-600 mb-4">We couldn't find any therapists matching your preferences for {selectedPaymentType} clients.</p>
                <Button 
                  onClick={handleChangePreferences} 
                  className="mb-2 bg-yellow-100 hover:bg-yellow-200 text-gray-800 rounded-full border border-[#5C3106] shadow-[1px_1px_0_#5C3106]"
                  style={{ fontFamily: 'var(--font-inter)' }}
                >
                  Change Preferences
                </Button>
                <Button 
                  onClick={handleBackFromSurvey} 
                  className="bg-white hover:bg-gray-50 text-gray-800 rounded-full border border-[#5C3106] shadow-[1px_1px_0_#5C3106]"
                  style={{ fontFamily: 'var(--font-inter)' }}
                >
                  Start Over
                </Button>
              </div>
            )}
          </div>
        )}
      </TherapistProvider>
    );
  }

  // Default fallback - should not normally reach here
  return (
    <div className="flex items-center justify-center" style={{ backgroundColor: '#FFFBF3', minHeight: '100%' }}>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-4">Loading...</h2>
        <p className="text-gray-600">Preparing your experience...</p>
      </div>
    </div>
  );
}