'use client';

import { useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, Play, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import CustomSurvey from "@/components/CustomSurvey";
import OnboardingFlow from "@/components/OnboardingFlow";
import MatchedTherapist from "@/components/MatchedTherapist";
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

  // Handle image URL
  const getImageUrl = (imageLink: string | null | undefined): string => {
    if (!imageLink) return '';
    if (imageLink.startsWith('http://') || imageLink.startsWith('https://')) {
      return imageLink;
    }
    console.warn('Image link is not a full URL:', imageLink);
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

  // Get therapist category from booking data
  const getTherapistCategory = () => {
    if (!currentUserData?.payment_type) return 'Graduate Therapist';
    return currentUserData.payment_type === 'cash_pay' ? 'Graduate Therapist' : 'Associate Therapist';
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFBF3' }}>
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
      {/* Header with Sol Health Logo */}
      <div className="relative h-16 overflow-hidden flex-shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-800" />
          </button>
          
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
          <h1 className="very-vogue-title text-2xl text-gray-800 mb-4">
            A Warm Welcome to Sol, {currentUserData.preferred_name || currentUserData.first_name}! 🌞
          </h1>
        </div>

        {/* Therapist & Appointment Details Card */}
        <Card className="mb-4 bg-white border border-[#5C3106] rounded-2xl shadow-[1px_1px_0_#5C3106]">
          <CardContent className="p-4">
            {/* Therapist Profile */}
            <div className="flex items-center gap-3 mb-4">
              {currentUserData.selected_therapist?.image_link && !imageError ? (
                <img
                  src={getImageUrl(currentUserData.selected_therapist.image_link)}
                  alt={bookingData.PractitionerName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
                  onError={() => {
                    console.error('Failed to load therapist image:', currentUserData.selected_therapist?.image_link);
                    console.error('Processed image URL:', currentUserData.selected_therapist?.image_link ? getImageUrl(currentUserData.selected_therapist.image_link) : 'N/A');
                    setImageError(true);
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-2 border-gray-100">
                  <span className="text-lg font-medium text-gray-600">
                    {bookingData.PractitionerName?.charAt(0) || 'T'}
                  </span>
                </div>
              )}
              
              <div>
                <h2 className="very-vogue-title text-lg text-gray-800">
                  {bookingData.PractitionerName || 'Your Therapist'}
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
                  {getTherapistCategory()}
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
                  {timeStr} - {new Date(new Date(bookingData.StartDateIso).getTime() + 45*60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} {timezone}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Welcome Video Card */}
        <Card className="mb-6 bg-white border border-[#5C3106] rounded-2xl shadow-[1px_1px_0_#5C3106] overflow-hidden">
          <CardContent className="p-0">
            {/* Video thumbnail with play button overlay */}
            <button 
              onClick={() => setShowVideo(true)}
              className="relative w-full h-48 md:h-56 bg-gray-100 hover:bg-gray-200 transition-colors"
              style={{ aspectRatio: '16/9' }}
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
                <div className="w-12 h-12 bg-black bg-opacity-70 rounded-full flex items-center justify-center hover:bg-black hover:bg-opacity-80 transition-all">
                  <Play className="w-6 h-6 text-white ml-1" />
                </div>
              </div>
            </button>
          </CardContent>
        </Card>

        {/* What to Expect Section */}
        <Card className="mb-6 bg-white border border-[#5C3106] rounded-2xl shadow-[1px_1px_0_#5C3106]">
          <CardContent className="p-4">
            <h3 className="very-vogue-title text-lg text-gray-800 mb-4 text-center">
              What To Expect
            </h3>
            
            <div className="space-y-4 text-sm max-w-sm mx-auto" style={{ fontFamily: 'var(--font-inter)' }}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                  <span className="text-lg">📧</span>
                </div>
                <div className="text-left">
                  <p className="text-gray-700 leading-relaxed">Your session confirmation and invite should land in your inbox shortly</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-red-50 rounded-full flex items-center justify-center">
                  <span className="text-lg">📝</span>
                </div>
                <div className="text-left">
                  <p className="text-gray-700 leading-relaxed">Fill out the Mandatory New Client form (also in your inbox)</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                  <span className="text-lg">📱</span>
                </div>
                <div className="text-left">
                  <p className="text-gray-700 leading-relaxed">Register to your client portal below (takes 3 seconds!)</p>
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
              
              {/* Prominent Mute/Unmute Button */}
              <button
                onClick={toggleMute}
                className={`absolute top-4 right-4 bg-black bg-opacity-70 hover:bg-opacity-90 text-white rounded-full p-3 transition-all duration-200 hover:scale-110 shadow-lg z-10 ${isMuted ? 'animate-pulse' : ''}`}
                title={isMuted ? 'Click to unmute video' : 'Click to mute video'}
              >
                {isMuted ? (
                  <div className="flex items-center space-x-2">
                    <VolumeX className="w-5 h-5" />
                    <span className="text-sm font-medium">Tap for Sound</span>
                  </div>
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
            </div>
            
            <Button onClick={() => setShowVideo(false)} className="mt-4 w-full">
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
  
  // Track whether user is changing preferences vs starting fresh
  const [isChangingPreferences, setIsChangingPreferences] = useState(false);

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

      // Calculate assessment scores
      const calculatePHQ9Score = (scores: Record<string, string>): number => {
        const scoreMap = { "Not at all": 0, "Several days": 1, "More than half the days": 2, "Nearly every day": 3 };
        return Object.values(scores).reduce((total, answer) => total + (scoreMap[answer as keyof typeof scoreMap] || 0), 0);
      };

      const calculateGAD7Score = (scores: Record<string, string>): number => {
        const scoreMap = { "Not at all": 0, "Several days": 1, "More than half the days": 2, "Nearly every day": 3 };
        return Object.values(scores).reduce((total, answer) => total + (scoreMap[answer as keyof typeof scoreMap] || 0), 0);
      };

      // Calculate date of birth from age
      const calculateDateOfBirthFromAge = (age: string | number): string => {
        if (!age) return "";
        const ageNum = typeof age === 'string' ? parseInt(age) : age;
        if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) return "";
        
        const currentDate = new Date();
        const birthYear = currentDate.getFullYear() - ageNum;
        // Use January 1st as default since we only have age, not exact birth date
        const birthDate = new Date(birthYear, 0, 1); // January 1st of birth year
        return birthDate.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
      };

      // Build comprehensive user data with ALL collected information
      const comprehensiveUserData: ComprehensiveUserData = {
        // Core identity
        id: `client_${responseId}`,
        response_id: responseId,
        first_name: surveyData.first_name || formData?.firstName || onboardingData?.firstName || "",
        last_name: surveyData.last_name || formData?.lastName || onboardingData?.lastName || "",
        preferred_name: surveyData.preferred_name || formData?.preferredName || onboardingData?.preferredName,
        email: surveyData.email,
        phone: surveyData.phone,
        
        // Assessment scores with detailed breakdown
        phq9_scores: {
          pleasure_doing_things: surveyData.pleasure_doing_things,
          feeling_down: surveyData.feeling_down,
          trouble_falling: surveyData.trouble_falling,
          feeling_tired: surveyData.feeling_tired,
          poor_appetite: surveyData.poor_appetite,
          feeling_bad_about_yourself: surveyData.feeling_bad_about_yourself,
          trouble_concentrating: surveyData.trouble_concentrating,
          moving_or_speaking_so_slowly: surveyData.moving_or_speaking_so_slowly,
          suicidal_thoughts: surveyData.suicidal_thoughts
        },
        gad7_scores: {
          feeling_nervous: surveyData.feeling_nervous,
          not_control_worrying: surveyData.not_control_worrying,
          worrying_too_much: surveyData.worrying_too_much,
          trouble_relaxing: surveyData.trouble_relaxing,
          being_so_restless: surveyData.being_so_restless,
          easily_annoyed: surveyData.easily_annoyed,
          feeling_afraid: surveyData.feeling_afraid
        },
        
        // Calculate assessment totals
        phq9_total: calculatePHQ9Score({
          pleasure_doing_things: surveyData.pleasure_doing_things,
          feeling_down: surveyData.feeling_down,
          trouble_falling: surveyData.trouble_falling,
          feeling_tired: surveyData.feeling_tired,
          poor_appetite: surveyData.poor_appetite,
          feeling_bad_about_yourself: surveyData.feeling_bad_about_yourself,
          trouble_concentrating: surveyData.trouble_concentrating,
          moving_or_speaking_so_slowly: surveyData.moving_or_speaking_so_slowly,
          suicidal_thoughts: surveyData.suicidal_thoughts
        }),
        gad7_total: calculateGAD7Score({
          feeling_nervous: surveyData.feeling_nervous,
          not_control_worrying: surveyData.not_control_worrying,
          worrying_too_much: surveyData.worrying_too_much,
          trouble_relaxing: surveyData.trouble_relaxing,
          being_so_restless: surveyData.being_so_restless,
          easily_annoyed: surveyData.easily_annoyed,
          feeling_afraid: surveyData.feeling_afraid
        }),
        
        // Complete demographics
        age: surveyData.age,
        date_of_birth: (() => {
          // Prefer insurance DOB if available, otherwise calculate from age
          if (selectedPaymentType === 'insurance' && formData?.dateOfBirth) {
            console.log('📅 Using insurance verification DOB:', formData.dateOfBirth);
            return formData.dateOfBirth; // This is from insurance verification
          }
          const calculatedDOB = calculateDateOfBirthFromAge(surveyData.age);
          console.log('📅 Calculated DOB from age:', { age: surveyData.age, calculated_dob: calculatedDOB });
          return calculatedDOB;
        })(),
        gender: surveyData.gender,
        state: surveyData.state,
        race_ethnicity: surveyData.race_ethnicity,
        lived_experiences: surveyData.lived_experiences,
        university: surveyData.university,
        
        // Therapy context
        what_brings_you: onboardingData?.whatBringsYou,
        therapist_gender_preference: surveyData.therapist_gender_preference,
        therapist_specialization: surveyData.therapist_specialization,
        therapist_lived_experiences: surveyData.therapist_lived_experiences,
        
        // Substance screening
        alcohol_frequency: surveyData.alcohol_frequency,
        recreational_drugs_frequency: surveyData.recreational_drugs_frequency,
        
        // Safety and matching
        safety_screening: surveyData.safety_screening,
        matching_preference: surveyData.matching_preference,
        
        // Payment info
        payment_type: selectedPaymentType || undefined,
        
        // Insurance data (if applicable)
        ...(selectedPaymentType === 'insurance' && formData && (() => {
          console.log('💳 Insurance Data Processing:', {
            provider: formData.provider,
            member_id: formData.memberId,
            has_verification_data: !!formData.verificationData,
            has_benefits: !!formData.verificationData?.benefits,
            member_obligation: formData.verificationData?.benefits?.memberObligation,
            verification_data_keys: formData.verificationData ? Object.keys(formData.verificationData) : [],
            benefits_keys: formData.verificationData?.benefits ? Object.keys(formData.verificationData.benefits) : []
          });
          
          return {
            insurance_data: {
              provider: formData.provider,
              member_id: formData.memberId,
              date_of_birth: formData.dateOfBirth,
              verification_response: formData.verificationData,
              benefits: formData.verificationData?.benefits
            }
          };
        })()),
        
        // Tracking
        utm: {
          utm_source: 'sol_payments',
          utm_medium: 'direct',
          utm_campaign: 'onboarding'
        },
        referred_by: Array.isArray(surveyData.referred_by) ? surveyData.referred_by : (surveyData.referred_by ? [surveyData.referred_by] : undefined),
        onboarding_completed_at: new Date().toISOString(),
        survey_completed_at: new Date().toISOString(),
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

      // Add payment type to survey data WITHOUT overwriting state
      const completeClientData = {
        ...surveyData,
        id: `client_${responseId}`,
        response_id: responseId,
        payment_type: selectedPaymentType,
        
        // Ensure onboarding data is preserved (especially preferred_name)
        preferred_name: surveyData.preferred_name || formData?.preferredName || onboardingData?.preferredName,
        first_name: surveyData.first_name || formData?.firstName || onboardingData?.firstName,
        
        // Add insurance information if available
        ...(selectedPaymentType === 'insurance' && formData && {
          insurance_provider: formData.provider,
          insurance_member_id: formData.memberId,
          insurance_date_of_birth: formData.dateOfBirth,
          insurance_verification_data: formData.verificationData ? JSON.stringify(formData.verificationData) : null,
        }),
        
        // REMOVED: state: 'completed' - keep the actual US state from survey
        utm: {
          utm_source: 'sol_payments',
          utm_medium: 'direct',
          utm_campaign: 'onboarding'
        }
      };

      console.log('📦 Complete client data being sent:', completeClientData);
      // Payment type in client data
      console.log('🎯 SPECIFIC THERAPIST DEBUG:', {
        matching_preference: completeClientData.matching_preference,
        selected_therapist: completeClientData.selected_therapist,
        selected_therapist_email: 'selected_therapist_email' in completeClientData ? completeClientData.selected_therapist_email : undefined
      });

      // Store the client response directly in our backend
      const response = await axiosInstance.post('/clients_signup', completeClientData);
      // Client data stored successfully

      // Both insurance and cash_pay flows use the SAME therapist-matching API call
      await pollFormAndRequestMatch(responseId);
      
    } catch (error) {
      console.error('❌ Error processing survey:', error);
      alert('Error processing your survey. Please try again.');
      setCurrentStep(STEPS.TYPEFORM);
    } finally {
      setIsProcessingResponse(false);
    }
  }, [selectedPaymentType, pollFormAndRequestMatch, formData, onboardingData]);

  const handleBackFromSurvey = () => {
    setCurrentStep(null);
    setSelectedPaymentType(null);
    setFormData(null);
    setCurrentUserData(null);
    setIsChangingPreferences(false);
    setShowOnboarding(true);
  };

  const handleChangePreferences = () => {
    setIsChangingPreferences(true);
    setCurrentStep(STEPS.TYPEFORM);
    setClientResponseId(null);
  };

  const handleBookSession = (bookedSession: BookAppointmentResponse) => {
    // Prevent duplicate processing of the same booking
    if (isBookingInProgress) {
      console.warn('⚠️ Booking already in progress, ignoring duplicate call');
      return;
    }
    
    // Session booked successfully
    
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
        has_benefits: !!(clientData.insurance_data?.benefits)
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
        // Flatten insurance data for backward compatibility
        ...(clientData.insurance_data && {
          insurance_provider: clientData.insurance_data.provider,
          insurance_member_id: clientData.insurance_data.member_id,
          insurance_date_of_birth: clientData.insurance_data.date_of_birth,
          insurance_verification_data: clientData.insurance_data.verification_response ? JSON.stringify(clientData.insurance_data.verification_response) : undefined,
          // Extract benefits if available
          ...(clientData.insurance_data.benefits && {
            copay: clientData.insurance_data.benefits.copay,
            deductible: clientData.insurance_data.benefits.deductible,
            coinsurance: clientData.insurance_data.benefits.coinsurance,
            out_of_pocket_max: clientData.insurance_data.benefits.oopMax,
            remaining_deductible: clientData.insurance_data.benefits.remainingDeductible,
            remaining_oop_max: clientData.insurance_data.benefits.remainingOopMax,
            member_obligation: clientData.insurance_data.benefits.memberObligation,
            benefit_structure: clientData.insurance_data.benefits.benefitStructure
          })
        }),
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
        payment_type: intakeQData.payment_type
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
          setCurrentUserData({
            ...currentUserData,
            intakeq_client_id: intakeQResult.client_id,
            intakeq_intake_url: intakeQResult.intake_url,
            last_updated: new Date().toISOString()
          });
        }
        
        // Update the database with IntakeQ client ID
        if (intakeQResult.client_id && clientData.response_id) {
          try {
            await axiosInstance.patch(`/clients_signup/${clientData.response_id}`, {
              intakeq_client_id: intakeQResult.client_id,
              intakeq_intake_url: intakeQResult.intake_url
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
        setCurrentStep(STEPS.MATCHED_THERAPIST);
      } else {
        setCurrentStep(STEPS.NO_MATCH);
      }

      console.log('📦 Match data received:', {
        paymentType: selectedPaymentType,
        therapistsReturned: matchData.therapists.length,
        therapists: matchData.therapists,
      });
    }
  }, [matchData?.therapists, selectedPaymentType]);

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFBF3' }}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full mx-auto mb-4"></div>
          <p className="text-lg font-medium">
            {isBookingInProgress ? 'Booking your session...' : 
             isProcessingResponse ? 'Processing your responses...' : 
             'Finding your perfect therapist match...'}
          </p>
        </div>
      </div>
    );
  }

  // If we have an error, show error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFBF3' }}>
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
          <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFBF3' }}>
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full mx-auto mb-4"></div>
              <p className="text-lg font-medium">Finding another therapist...</p>
            </div>
          </div>
        ) : (
          <div className="min-h-screen" style={{ backgroundColor: '#FFFBF3' }}>
            {currentStep === STEPS.MATCHED_THERAPIST && matchData?.therapists && matchData.therapists.length > 0 && (() => {
              const clientData = {
                ...matchData.client,
                payment_type: selectedPaymentType || (matchData.client as ExtendedClientData)?.payment_type,
                response_id: clientResponseId || (matchData.client as ExtendedClientData)?.response_id,
              };
              
              console.log('🔍 CLIENT DATA DEBUG - Passing to MatchedTherapist:');
              console.log('selectedPaymentType:', selectedPaymentType);
              console.log('matchData.client:', matchData.client);
              console.log('final clientData:', clientData);
              
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
                      
                      // Enrich current user data with selected therapist info BEFORE booking
                      if (currentUserData) {
                        const therapistInfo = {
                          id: therapist.id || therapist.email || 'unknown',
                          name: therapist.name || 'Unknown',
                          email: therapist.email || '',
                          bio: therapist.biography || '',
                          specialties: therapist.specialities || [],
                          image_link: therapist.image_link || undefined,
                          states: therapist.states || [],
                          therapeutic_orientation: therapist.therapeutic_orientation || []
                        };
                        
                        const appointmentInfo = {
                          date: new Date(slot).toLocaleDateString(),
                          time: new Date(slot).toLocaleTimeString(),
                          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                          duration: 45,
                          session_type: 'initial'
                        };
                        
                        const enrichedData = {
                          ...currentUserData,
                          selected_therapist: therapistInfo,
                          appointment: appointmentInfo,
                          last_updated: new Date().toISOString()
                        };
                        
                        console.log('🎯 Enriching user data with therapist selection:', {
                          therapist_name: therapistInfo.name,
                          therapist_specialties: therapistInfo.specialties,
                          appointment_date: appointmentInfo.date,
                          appointment_time: appointmentInfo.time
                        });
                        
                        setCurrentUserData(enrichedData);
                      }
                      
                      const bookedSession = await bookAppointment.makeRequest({
                        data: {
                          client_response_id: clientResponseId as string,
                          therapist_email: therapist.email || '',
                          therapist_name: therapist.name || '',
                          datetime: slot,
                          send_client_email_notification: true,
                          reminder_type: 'email',
                          status: 'scheduled',
                        },
                      });

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
                <Button onClick={handleChangePreferences} className="mb-2">
                  Change Preferences
                </Button>
                <Button onClick={handleBackFromSurvey} variant="outline">
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
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFBF3' }}>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-4">Loading...</h2>
        <p className="text-gray-600">Preparing your experience...</p>
      </div>
    </div>
  );
}