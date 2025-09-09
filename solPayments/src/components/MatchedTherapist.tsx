// solPayments/src/components/MatchedTherapist.tsx - FIXED
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Play, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { TMatchedTherapistData } from "@/api/types/therapist.types";
import type { SlotsResponse } from "@/api/services";
import { useTherapistsService } from "@/api/services";
import axios from "@/api/axios"; // Import axios for API calls
import { TherapistSearchModal } from "@/components/TherapistSearchModal";
import { TherapistConfirmationModal } from "@/components/TherapistConfirmationModal";
import { journeyTracker } from "@/services/journeyTracker";
import { LoadingScreen } from "@/components/LoadingScreen";
import { createTherapistPreloader } from "@/utils/therapistPreloader";

/** ---- Availability types (from new backend endpoint) ---- */
type AvSlot = { start: string; end: string; free_ratio: number; is_free: boolean };
type AvDay = {
  summary: {
    free_ratio: number;
    free_secs: number;
    busy_secs: number;
    day_start: string;
    day_end: string;
    segments: { start: string; end: string; seconds: number }[];
  };
  slots: AvSlot[];
  sessions?: { start: string; end: string }[];
};
type Availability = {
  meta: {
    calendar_id: string;
    year: number;
    month: number;
    timezone: string;
    work_start: string;
    work_end: string;
    slot_minutes: number;
  };
  days: Record<number, AvDay>;
};

// State to timezone mapping (IANA format for internal use)
// Note: We use IANA timezones (America/New_York) for calculations but display 
// user-friendly abbreviations (EST, CST, etc.) in the UI
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

// Timezone display names for user-friendly display
// Note: These will show standard time abbreviations year-round for consistency
// In production, you might want to detect DST and show EDT/CDT/MDT/PDT accordingly
const TIMEZONE_DISPLAY_MAP: Record<string, string> = {
  "America/New_York": "EST",
  "America/Chicago": "CST",
  "America/Denver": "MST",
  "America/Phoenix": "MST", // Arizona doesn't observe DST
  "America/Los_Angeles": "PST",
  "America/Anchorage": "AK",
  "Pacific/Honolulu": "HI",
};

// Get display timezone abbreviation with DST awareness (optional)
const getTimezoneDisplay = (ianaTimezone: string, includeDST: boolean = false): string => {
  if (!includeDST) {
    return TIMEZONE_DISPLAY_MAP[ianaTimezone] || "EST";
  }
  
  // If you want to show EDT/CDT/MDT/PDT during daylight saving time:
  const now = new Date();
  const isDST = () => {
    const jan = new Date(now.getFullYear(), 0, 1);
    const jul = new Date(now.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset()) !== now.getTimezoneOffset();
  };
  
  const dstMap: Record<string, string> = {
    "America/New_York": isDST() ? "EDT" : "EST",
    "America/Chicago": isDST() ? "CDT" : "CST",
    "America/Denver": isDST() ? "MDT" : "MST",
    "America/Phoenix": "MST", // Arizona doesn't observe DST
    "America/Los_Angeles": isDST() ? "PDT" : "PST",
    "America/Anchorage": isDST() ? "AKDT" : "AKST",
    "Pacific/Honolulu": "HI", // Hawaii doesn't observe DST
  };
  
  return dstMap[ianaTimezone] || "EST";
};

interface MatchedTherapistProps {
  therapistsList: TMatchedTherapistData[];
  clientData?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    response_id?: string;
    state?: string; // Important for timezone
    payment_type?: string; // Important for session duration
    [key: string]: unknown;
  },
  initialIndex?: number;
  onBack?: () => void;
  onBookSession?: (therapist: TMatchedTherapistData, slot: string) => void;
  onFindAnother?: () => void; // New prop for fetching additional therapists
}

export default function MatchedTherapist({ 
  therapistsList,
  clientData,
  initialIndex = 0,
  onBack,
  onBookSession,
  onFindAnother,
}: MatchedTherapistProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [viewedTherapistIds, setViewedTherapistIds] = useState<Set<string>>(new Set());
  const [showVideo, setShowVideo] = useState(false);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const [fetchedSlots, setFetchedSlots] = useState<Record<string, string[]>>({});
  const [fetchingSlots, setFetchingSlots] = useState<Record<string, boolean>>({});
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);
  const [hasRecordedSelection, setHasRecordedSelection] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  /** New: cache monthly availability by therapist + month + tz */
  const [availabilityCache, setAvailabilityCache] = useState<Record<string, Availability>>({});
  const [isFindingAnother, setIsFindingAnother] = useState(false);
  const [showTherapistSearchLoading, setShowTherapistSearchLoading] = useState(false);
  const [therapistSearchPreloader, setTherapistSearchPreloader] = useState<(() => Promise<void>) | null>(null);
  const [isSwitchingTherapists, setIsSwitchingTherapists] = useState(false);
  
  const currentTherapistData = therapistsList[currentIndex];
  const therapist = currentTherapistData?.therapist;
  const matchedSpecialtiesRaw = currentTherapistData?.matched_diagnoses_specialities || [];
  
  const { slots: slotsRequest } = useTherapistsService();

  // Get payment type from client data, localStorage, or query param
  const getSelectedPaymentType = useCallback((): 'insurance' | 'cash_pay' => {
    // First check client data
    if (clientData?.payment_type === 'insurance' || clientData?.payment_type === 'cash_pay') {
      // Payment type found in clientData
      return clientData.payment_type;
    }
    
    // Check for alternative field names in client data
    const altPaymentType = (clientData as { paymentType?: string; payment_method?: string })?.paymentType || 
                          (clientData as { paymentType?: string; payment_method?: string })?.payment_method;
    if (altPaymentType === 'insurance' || altPaymentType === 'cash_pay') {
      // Payment type found in clientData (alt field)
      return altPaymentType;
    }
    
    // Then query param
    if (typeof window !== 'undefined') {
      const qp = new URLSearchParams(window.location.search).get('payment_type');
      // Check URL payment_type param
      if (qp === 'cash_pay' || qp === 'insurance') {
        // Payment type found in URL
        return qp;
      }
    }
    
    // Defaulting to insurance - no payment type found
    return 'insurance';
  }, [clientData]);

  // Get timezone based on client's state (IANA format for calculations)
  const timezone = useMemo(() => {
    // First try to get from client's state
    if (clientData?.state) {
      const stateUpper = String(clientData.state).toUpperCase().trim();
      const tz = STATE_TIMEZONE_MAP[stateUpper];
      if (tz) return tz;
    }
    
    // Fallback to browser timezone
    try { 
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"; 
    } catch { 
      return "America/New_York"; 
    }
  }, [clientData?.state]);

  // Get display-friendly timezone abbreviation
  const timezoneDisplay = useMemo(() => {
    return getTimezoneDisplay(timezone);
  }, [timezone]);

  // Record therapist selection when therapist changes
  useEffect(() => {
    if (!therapist?.id || !clientData?.response_id || hasRecordedSelection) return;
    
    // Record that this therapist was selected/viewed
    const recordSelection = async () => {
      try {
        await axios.post('/therapists/select', {
          response_id: clientData.response_id,
          therapist_email: therapist.email,
          therapist_name: therapist.intern_name,
          therapist_id: therapist.id,
        });
        // Recorded therapist selection
        setHasRecordedSelection(true);
      } catch (error) {
        console.error('Failed to record therapist selection:', error);
      }
    };
    
    recordSelection();
  }, [therapist?.id, therapist?.email, therapist?.intern_name, clientData?.response_id, hasRecordedSelection]);
  
  // Track viewed therapists
  useEffect(() => {
    if (therapist?.id) {
      setViewedTherapistIds(prev => new Set([...prev, therapist.id]));
    }
  }, [therapist?.id]);
  
  // Legacy: Fetch Google Calendar-backed slots (ISO strings) if service is available
  useEffect(() => {
    const email = therapist?.calendar_email || therapist?.email;
    if (!email) return;
    if (fetchedSlots[email] || fetchingSlots[email]) return;
    setFetchingSlots(prev => ({ ...prev, [email]: true }));
    slotsRequest
      .makeRequest({ params: {
        email,
        response_id: (clientData?.response_id as string) || undefined,
        state: clientData?.state || undefined,
      } })
      .then((res: SlotsResponse) => {
        const avail = res?.available_slots || [];
        setFetchedSlots(prev => ({ ...prev, [email]: avail }));
      })
      .catch(() => {
        // Swallow errors; fallback occurs to availability endpoint below
      })
      .finally(() => setFetchingSlots(prev => ({ ...prev, [email]: false })));
  }, [therapist?.calendar_email, therapist?.email, clientData?.response_id, clientData?.state, slotsRequest, fetchedSlots, fetchingSlots]);

  /** New: Fetch monthly availability JSON when therapist or month changes */
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth(); // 0-based
  const avKey = useMemo(() => {
    const email = therapist?.calendar_email || therapist?.email;
    if (!email) return "";
    return `${email}:${currentYear}:${currentMonth + 1}:${timezone}`;
  }, [therapist?.calendar_email, therapist?.email, currentYear, currentMonth, timezone]);

  useEffect(() => {
    const email = therapist?.calendar_email || therapist?.email;
    if (!email || !avKey) return;
    if (availabilityCache[avKey]) return; // cache hit

    const controller = new AbortController();
    const fetchAvailability = async () => {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
      const url = new URL(`/therapists/${encodeURIComponent(email)}/availability`, API_BASE);
      url.searchParams.set("year", String(currentYear));
      url.searchParams.set("month", String(currentMonth + 1));
      url.searchParams.set("timezone", timezone);
      
      // Pass the actual payment type
      const paymentType = getSelectedPaymentType();
      url.searchParams.set("payment_type", paymentType);
      
      // Use reasonable work hours (7 AM to 9 PM)
      url.searchParams.set("work_start", "07:00");
      url.searchParams.set("work_end", "21:00");
      
      try {
        const r = await fetch(url.toString(), { signal: controller.signal });
        if (!r.ok) throw new Error(`Availability fetch failed: ${r.status}`);
        const data: Availability = await r.json();

        // Log available sessions with time analysis
        const byDay: Record<string, string[]> = {};
        const timeAnalysis: Record<string, { before7am: number; after10pm: number; validHours: number; totalSlots: number }> = {};
        
        Object.entries(data.days || {}).forEach(([dayStr, payload]) => {
          const sessions = (payload.sessions ?? payload.slots.filter(s => s.is_free).map(s => ({ start: s.start, end: s.end })));
          byDay[dayStr] = sessions.map(s => s.start);
          
          // Analyze time distribution for backend improvements
          let before7am = 0, after10pm = 0, validHours = 0;
          sessions.forEach(session => {
            const sessionDate = new Date(session.start);
            const hour = sessionDate.getHours();
            if (hour < 7) before7am++;
            else if (hour >= 22) after10pm++;
            else validHours++;
          });
          
          timeAnalysis[dayStr] = {
            before7am,
            after10pm,
            validHours,
            totalSlots: sessions.length
          };
        });
        
        console.log(`[Availability] ${email} ${currentYear}-${String(currentMonth+1).padStart(2,"0")} (${timezoneDisplay}/${timezone}):`, {
          byDay,
          timeAnalysis,
          summary: {
            totalDays: Object.keys(byDay).length,
            daysWithInvalidTimes: Object.values(timeAnalysis).filter(day => day.before7am > 0 || day.after10pm > 0).length,
            totalInvalidSlots: Object.values(timeAnalysis).reduce((sum, day) => sum + day.before7am + day.after10pm, 0)
          }
        });
        
        // Log summary of out-of-hours slots (only if significant)
        const totalOutOfHours = Object.values(timeAnalysis).reduce((sum, analysis) => sum + analysis.before7am + analysis.after10pm, 0);
        if (totalOutOfHours > 10) {
          console.warn(`[Calendar] ${email}: ${totalOutOfHours} out-of-hours slots filtered (backend should filter to 7AM-10PM)`);
        }

        setAvailabilityCache(prev => ({ ...prev, [avKey]: data }));
      } catch (e) {
        console.warn("Availability fetch error", e);
      }
    };
    fetchAvailability();
    return () => controller.abort();
  }, [avKey, timezone, currentYear, currentMonth, therapist?.calendar_email, therapist?.email, getSelectedPaymentType, timezoneDisplay, availabilityCache]);
  
  // Get previously viewed therapists (excluding current)
  const previouslyViewed = therapistsList.filter(t => 
    viewedTherapistIds.has(t.therapist.id) && t.therapist.id !== therapist?.id
  );
  
  const handleFindAnother = async () => {
    console.log(`[Find Another] Current therapist: ${therapist?.intern_name} (index ${currentIndex})`);
    console.log(`[Find Another] Total therapists available: ${therapistsList.length}`);
    
    // If we have multiple therapists already loaded, cycle through them with preloading
    if (therapistsList.length > 1) {
      const nextIndex = (currentIndex + 1) % therapistsList.length;
      const nextTherapist = therapistsList[nextIndex];
      
      console.log(`[Find Another] Moving to: ${nextTherapist?.therapist?.intern_name} (index ${nextIndex})`);
      
      // Create preloader for the next therapist
      const preloader = createTherapistPreloader(
        [nextTherapist], // Preload just the next therapist
        clientData?.state,
        getSelectedPaymentType()
      );
      setTherapistSearchPreloader(() => preloader);
      
      // Show loading screen with preloading
      setShowTherapistSearchLoading(true);
      
      // The loading screen will call onComplete when preloading is done
      return;
    }
    
    // Show the search modal first for new therapist search
    setShowSearchModal(true);
    
    // Wait for 2 seconds (modal duration) before proceeding
    setTimeout(() => {
      setShowSearchModal(false);
      handleFindAnotherFallback();
    }, 2000);
  };
  
  const handleTherapistSearchComplete = useCallback(() => {
    console.log(`[Find Another] ⭐ COMPLETION CALLBACK TRIGGERED - switching to next therapist`);
    
    // Preserve current calendar month when switching therapists
    const currentCalendarMonth = calendarDate;
    console.log(`[Find Another] Preserving calendar month: ${currentCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
    
    // Prevent calendar auto-navigation during therapist switch
    setIsSwitchingTherapists(true);
    
    // Switch to the next therapist
    const nextIndex = (currentIndex + 1) % therapistsList.length;
    console.log(`[Find Another] ⭐ Switching from index ${currentIndex} to ${nextIndex}`);
    setCurrentIndex(nextIndex);
    setSelectedTimeSlot(null);
    setSelectedDateObj(null);
    setImageError({});
    setHasRecordedSelection(false);
    
    // Hide loading screen
    setShowTherapistSearchLoading(false);
    setTherapistSearchPreloader(null);
    console.log(`[Find Another] ⭐ Loading screen hidden, therapist switch complete`);
    
    // Re-enable auto-selection after a brief delay and ensure calendar month is preserved
    setTimeout(() => {
      console.log(`[Find Another] Re-enabling auto-selection and ensuring calendar month is preserved`);
      // Explicitly preserve the calendar month in case it got changed
      setCalendarDate(currentCalendarMonth);
      setIsSwitchingTherapists(false);
    }, 100);
  }, [currentIndex, therapistsList.length, calendarDate]);
  
  const handleFindAnotherFallback = async () => {
    
    // If we only have 1 therapist or want fresh matches, fetch new ones
    if (onFindAnother) {
      console.log(`[Find Another] Fetching new therapists from backend...`);
      setIsFindingAnother(true);
      
      try {
        await onFindAnother();
        // Reset selection state for new therapist
        setSelectedTimeSlot(null);
        setSelectedDateObj(null);
        setImageError({});
        setHasRecordedSelection(false);
      } catch (error) {
        console.error('[Find Another] Failed to fetch new therapists:', error);
      } finally {
        setIsFindingAnother(false);
      }
    } else {
      // Fallback: cycle through existing list (original behavior)
      // Preserve current calendar month when switching therapists
      const currentCalendarMonth = calendarDate;
      console.log(`[Find Another] Fallback - Preserving calendar month: ${currentCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
      
      // Prevent calendar auto-navigation during therapist switch
      setIsSwitchingTherapists(true);
      
      const nextIndex = (currentIndex + 1) % therapistsList.length;
      const nextTherapist = therapistsList[nextIndex]?.therapist;
      
      console.log(`[Find Another] Fallback - Moving to: ${nextTherapist?.intern_name} (index ${nextIndex})`);
      
      setCurrentIndex(nextIndex);
      setSelectedTimeSlot(null);
      setSelectedDateObj(null);
      setImageError({});
      setHasRecordedSelection(false);
      
      // Re-enable auto-selection after a brief delay and preserve calendar month
      setTimeout(() => {
        console.log(`[Find Another] Fallback - Re-enabling auto-selection and ensuring calendar month is preserved`);
        // Explicitly preserve the calendar month in case it got changed
        setCalendarDate(currentCalendarMonth);
        setIsSwitchingTherapists(false);
      }, 100);
    }
  };
  
  const handleSelectPreviousTherapist = (therapistId: string) => {
    const therapistIndex = therapistsList.findIndex(t => t.therapist.id === therapistId);
    if (therapistIndex !== -1) {
      const selectedTherapist = therapistsList[therapistIndex];
      
      // Preserve current calendar month when switching therapists
      const currentCalendarMonth = calendarDate;
      console.log(`[Previous Therapist] Preserving calendar month: ${currentCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
      
      // Prevent calendar auto-navigation during therapist switch
      setIsSwitchingTherapists(true);
      
      setCurrentIndex(therapistIndex);
      setSelectedTimeSlot(null);
      setSelectedDateObj(null);
      setImageError({});
      setHasRecordedSelection(false); // Reset for new therapist
      
      // Track previous therapist selection
      if (clientData?.response_id) {
        journeyTracker.trackInteraction(clientData.response_id, 'previous_therapist_selection', {
          selected_therapist_id: therapistId,
          selected_therapist_name: selectedTherapist.therapist.intern_name,
          previous_therapist_index: currentIndex,
          new_therapist_index: therapistIndex,
          total_therapists_viewed: previouslyViewed.length + 1
        }).catch(console.error);
      }
      
      // Re-enable auto-selection after a brief delay and preserve calendar month
      setTimeout(() => {
        console.log(`[Previous Therapist] Re-enabling auto-selection and ensuring calendar month is preserved`);
        // Explicitly preserve the calendar month in case it got changed
        setCalendarDate(currentCalendarMonth);
        setIsSwitchingTherapists(false);
      }, 100);
    }
  };
  
  const handleBookSession = async () => {
    // DEBUG: Log the current state of all booking requirements
    console.log('🔍 BOOKING DEBUG - Checking requirements:');
    console.log('selectedTimeSlot:', selectedTimeSlot);
    console.log('selectedDateObj:', selectedDateObj);
    console.log('clientData?.response_id:', clientData?.response_id);
    console.log('Button should be disabled?', !selectedTimeSlot || !selectedDateObj);
    
    if (!selectedTimeSlot || !selectedDateObj || !clientData?.response_id) {
      console.warn('❌ BOOKING BLOCKED - Missing required data:', {
        hasTimeSlot: !!selectedTimeSlot,
        hasDateObj: !!selectedDateObj,
        hasResponseId: !!clientData?.response_id,
        selectedTimeSlot,
        selectedDateObj: selectedDateObj?.toISOString(),
        responseId: clientData?.response_id
      });
      return;
    }
    
    // Show confirmation modal instead of booking immediately
    setShowConfirmationModal(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedTimeSlot || !selectedDateObj || !clientData?.response_id) {
      return;
    }
    
    // ========================================
    // COMPREHENSIVE BOOKING DATA LOGGING
    // ========================================
    
    console.log('🚀 BOOKING SESSION - COMPREHENSIVE DATA DUMP');
    console.log('==========================================');
    
    // ALL CLIENT DATA
    console.log('📋 ALL CLIENT DATA:');
    console.log(JSON.stringify(clientData, null, 2));
    
    // ALL ASSOCIATED THERAPIST DATA (the selected therapist)
    console.log('👩‍⚕️ ALL ASSOCIATED THERAPIST DATA:');
    console.log(JSON.stringify(currentTherapistData, null, 2));
    
    // RESPONSE_ID
    console.log('🆔 RESPONSE_ID:');
    console.log(JSON.stringify({ response_id: clientData?.response_id }, null, 2));
    
    // ADDITIONAL BOOKING CONTEXT
    console.log('📅 BOOKING CONTEXT:');
    const bookingContext = {
      selectedTimeSlot: selectedTimeSlot,
      selectedDate: selectedDateObj?.toISOString(),
      selectedDateLocal: selectedDateObj?.toDateString(),
      paymentType: getSelectedPaymentType(),
      timezone: timezone,
      timezoneDisplay: timezoneDisplay,
      sessionDuration: getSessionDuration(),
      therapistCategory: getTherapistCategory(therapist)
    };
    console.log(JSON.stringify(bookingContext, null, 2));
    
    // ========================================
    // JOURNEY TRACKING - SEND TO GOOGLE SHEETS
    // ========================================
    
    try {
      // Track comprehensive booking context
      await journeyTracker.trackBookingStarted(
        clientData,
        currentTherapistData,
        bookingContext
      );
      console.log('✅ Journey tracking: Booking context sent to Google Sheets');
    } catch (error) {
      console.error('❌ Journey tracking failed:', error);
      // Don't block the booking flow if tracking fails
    }
    
    console.log('==========================================');
    
    const yyyy = selectedDateObj.getFullYear();
    const mm = String(selectedDateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDateObj.getDate()).padStart(2, '0');
    const normalizedTime = selectedTimeSlot.replace(/\s/g, '');
    
    console.log('🕐 BOOKING TIME DEBUG - SIMPLIFIED APPROACH:');
    console.log(`  Selected date object: ${selectedDateObj.toDateString()}`);
    console.log(`  Selected time slot: "${selectedTimeSlot}"`);
    console.log(`  Normalized time: "${normalizedTime}"`);
    console.log(`  Client state timezone: ${timezone} (${timezoneDisplay})`);
    
    // Convert time to 24-hour format
    const timeIn24Hour = convertTo24Hour(normalizedTime);
    console.log(`  Converted to 24-hour: "${timeIn24Hour}"`);
    
    const [hour, minute] = timeIn24Hour.split(':').map(Number);
    console.log(`  Parsed hour: ${hour}, minute: ${minute}`);
    
    // Create the appointment datetime string in the client's timezone
    const appointmentDateTimeString = `${yyyy}-${mm}-${dd}T${timeIn24Hour}:00`;
    console.log(`  Appointment datetime string: ${appointmentDateTimeString}`);
    
    // Create a Date object representing the appointment time in the client's timezone
    // We'll create it as if it's in the client's timezone, then convert to proper ISO format
    let datetime: string;
    
    try {
      // Use the client's timezone to create the correct datetime
      const clientTimezone = timezone;
      
      // Simplified approach: Create date in client timezone and format properly
      const appointmentDate = new Date();
      appointmentDate.setFullYear(yyyy, selectedDateObj.getMonth(), selectedDateObj.getDate());
      appointmentDate.setHours(hour, minute, 0, 0);
      
      // Get the proper timezone offset for this specific date/time in the client's timezone
      const timezoneOffset = getTherapistTimezoneOffset(clientTimezone);
      
      // Create a new Date object that represents the appointment time
      // We need to account for the difference between the browser's timezone and the client's timezone
      const browserOffset = appointmentDate.getTimezoneOffset(); // Browser offset from UTC in minutes
      const clientOffsetMinutes = getTherapistOffsetMinutes(clientTimezone); // Client timezone offset from UTC in minutes
      
      // Adjust for timezone differences
      const adjustedTime = appointmentDate.getTime() - (browserOffset * 60000) - (clientOffsetMinutes * 60000);
      const finalDateTime = new Date(adjustedTime);
      
      // Format as ISO string with timezone offset
      datetime = finalDateTime.toISOString().slice(0, -1) + timezoneOffset;
      
      console.log('🕐 IMPROVED TIMEZONE CONVERSION:');
      console.log(`  Client timezone: ${clientTimezone} (${timezoneDisplay})`);
      console.log(`  Appointment date: ${appointmentDate.toLocaleString()}`);
      console.log(`  Browser offset: ${browserOffset} minutes`);
      console.log(`  Client offset: ${clientOffsetMinutes} minutes`);
      console.log(`  Adjusted time: ${new Date(adjustedTime).toISOString()}`);
      console.log(`  Timezone offset string: ${timezoneOffset}`);
      console.log(`  Final datetime with timezone: ${datetime}`);
      
      // Verification: Convert back to client timezone to verify
      const verificationDate = new Date(datetime);
      const verificationInClientTz = verificationDate.toLocaleString("en-US", { 
        timeZone: clientTimezone,
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      console.log('✅ VERIFICATION:');
      console.log(`  Original selection: ${selectedDateObj.toDateString()} at ${selectedTimeSlot}`);
      console.log(`  Parsed back in ${timezoneDisplay}: ${verificationInClientTz}`);
      console.log(`  Should match selected time: ${selectedTimeSlot}`);
      
    } catch (error) {
      console.error('❌ Error in improved timezone conversion:', error);
      
      // Fallback to original method if new one fails
      const therapistTimezoneOffset = getTherapistTimezoneOffset(timezone);
      const utcDateTime = new Date(yyyy, selectedDateObj.getMonth(), selectedDateObj.getDate(), hour, minute, 0);
      const browserOffset = new Date().getTimezoneOffset();
      const therapistOffsetMinutes = getTherapistOffsetMinutes(timezone);
      const offsetDifference = browserOffset - therapistOffsetMinutes;
      utcDateTime.setMinutes(utcDateTime.getMinutes() + offsetDifference);
      datetime = utcDateTime.toISOString().slice(0, -1) + therapistTimezoneOffset;
      
      console.log('⚠️ Using fallback method - Final datetime:', datetime);
    }
    
    // Close the confirmation modal
    setShowConfirmationModal(false);
    
    // Only call the parent callback - let the main component handle the booking
    // This eliminates the duplicate API call that was causing double emails
    if (onBookSession) {
      onBookSession(currentTherapistData, datetime);
    }
  };
  
  const getTherapistTimezoneOffset = (timezone: string) => {
    // Get timezone offset using proper Intl.DateTimeFormat method
    try {
      const now = new Date();
      console.log(`[Timezone Debug] Getting offset for timezone: ${timezone}`);
      
      // Use Intl.DateTimeFormat to get accurate timezone offset
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'longOffset'
      });
      
      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find(part => part.type === 'timeZoneName');
      
      if (offsetPart && offsetPart.value !== timezone) {
        // Extract offset from format like "GMT-05:00"
        const offsetMatch = offsetPart.value.match(/GMT([+-]\d{2}:\d{2})/);
        if (offsetMatch) {
          const offset = offsetMatch[1];
          console.log(`[Timezone Debug] Extracted offset from Intl: ${offset}`);
          return offset;
        }
      }
      
      // Fallback method using Date constructor
      const utcDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const targetDate = new Date(utcDate.toLocaleString("en-US", { timeZone: timezone }));
      const offsetMinutes = Math.round((targetDate.getTime() - utcDate.getTime()) / (1000 * 60));
      
      const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
      const offsetMins = Math.abs(offsetMinutes) % 60;
      const sign = offsetMinutes >= 0 ? '+' : '-';
      const offset = `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
      
      console.log(`[Timezone Debug] Calculated offset via fallback: ${offset}`);
      return offset;
    } catch (error) {
      console.error('[Timezone Debug] Error calculating therapist timezone offset:', error);
      return '-05:00'; // Default to EST
    }
  };

  const getTherapistOffsetMinutes = (timezone: string): number => {
    // Get the therapist's timezone offset in minutes from UTC using proper method
    try {
      const now = new Date();
      console.log(`[Timezone Debug] Getting offset minutes for: ${timezone}`);
      
      // Create two dates: one in UTC and one in the target timezone
      const utcDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const targetDate = new Date(utcDate.toLocaleString("en-US", { timeZone: timezone }));
      const offsetMinutes = Math.round((targetDate.getTime() - utcDate.getTime()) / (1000 * 60));
      
      console.log(`[Timezone Debug] Offset minutes calculated: ${offsetMinutes}`);
      return offsetMinutes;
    } catch (error) {
      console.error('[Timezone Debug] Error calculating therapist offset minutes:', error);
      return -300; // Default to EST (-5 hours = -300 minutes)
    }
  };

  const convertTo24Hour = (time: string) => {
    console.log(`[Time Conversion] Converting: "${time}"`);
    
    // Handle different time formats: "3:45pm", "3:45 pm", "15:45", etc.
    const cleanTime = time.toLowerCase().trim();
    
    // If already in 24-hour format, return as-is
    if (/^\d{1,2}:\d{2}$/.test(cleanTime) && !cleanTime.includes('am') && !cleanTime.includes('pm')) {
      console.log(`[Time Conversion] Already 24-hour format: "${cleanTime}"`);
      return cleanTime;
    }
    
    // Extract hour, minute, and period (am/pm)
    const match = cleanTime.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)$/i);
    if (!match) {
      console.error(`[Time Conversion] Invalid time format: "${time}"`);
      return '12:00'; // Default fallback
    }
    
    let h = parseInt(match[1], 10);
    const m = match[2] || '00';
    const period = match[3].toLowerCase();
    
    console.log(`[Time Conversion] Parsed - Hour: ${h}, Minute: ${m}, Period: ${period}`);
    
    // Convert to 24-hour format
    if (period === 'pm' && h !== 12) {
      h = h + 12;
    } else if (period === 'am' && h === 12) {
      h = 0;
    }
    
    const result = `${h.toString().padStart(2, '0')}:${m}`;
    console.log(`[Time Conversion] Result: "${result}"`);
    return result;
  };

  // Function to handle image URL - S3 presigned URLs should be used directly
  const getImageUrl = (imageLink: string | null | undefined): string => {
    if (!imageLink || typeof imageLink !== 'string') {
      return '';
    }
    
    const cleanLink = imageLink.trim();
    if (!cleanLink) {
      return '';
    }
    
    // Check if it's already a valid URL
    if (cleanLink.startsWith('http://') || cleanLink.startsWith('https://')) {
      return cleanLink;
    }
    
    // Handle relative URLs or paths that might need a base URL
    if (cleanLink.startsWith('/')) {
      // If it starts with /, it might be a relative path from a CDN
      console.warn(`[Image] Relative path detected: ${cleanLink} - might need base URL`);
      return cleanLink; // Return as-is, let the browser handle it
    }
    
    console.warn(`[Image] Invalid image URL format: "${cleanLink}"`);
    return '';
  };

  // Map program to display category based on database program field
  const getTherapistCategory = useCallback((t: { program?: string; cohort?: string } | undefined): string => {
    const program = (t?.program ?? '').trim();
    const paymentType = getSelectedPaymentType();
    
    let category: string;
    
    // Graduate Therapist programs
    if (program === 'MHC' || program === 'MSW' || program === 'MFT') {
      category = 'Graduate Therapist';
    }
    // Associate Therapist programs  
    else if (program === 'Limited Permit') {
      category = 'Associate Therapist';
    }
    // Fallback - default to Graduate for empty/unknown programs
    else {
      if (program) {
        console.warn(`[Therapist Category] Unknown program type: "${program}" for therapist. Please update category mapping.`);
      }
      category = 'Graduate Therapist';
    }
    
    // Verification: Check if therapist category matches expected payment type
    const expectedCategory = paymentType === 'cash_pay' ? 'Graduate Therapist' : 'Associate Therapist';
    if (category !== expectedCategory) {
      console.error(`[Data Mismatch] Therapist program "${program}" resulted in "${category}" but payment type "${paymentType}" expects "${expectedCategory}"`, {
        therapistName: therapist?.intern_name,
        therapistId: therapist?.id,
        program: program,
        paymentType: paymentType,
        actualCategory: category,
        expectedCategory: expectedCategory,
        recommendation: 'Check therapist data or payment type assignment'
      });
    } else {
      // Category verified: therapist matches payment type
    }
    
    return category;
  }, [getSelectedPaymentType, therapist?.intern_name, therapist?.id]);

  // Function to extract YouTube video ID from URL (including YouTube Shorts)
  const extractYouTubeId = (url: string): string => {
    const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : '';
  };

  // Function to generate video thumbnail URL
  const getVideoThumbnail = (videoAnalysis: any): string | null => {
    switch (videoAnalysis.videoType) {
      case 'youtube-regular':
      case 'youtube-short':
        if (videoAnalysis.videoId) {
          return `https://img.youtube.com/vi/${videoAnalysis.videoId}/maxresdefault.jpg`;
        }
        break;
      case 'vimeo':
        // For Vimeo, we'd need to make an API call to get thumbnail, so return null for now
        return null;
      case 'direct':
        // For direct video files, no thumbnail available
        return null;
      default:
        return null;
    }
    return null;
  };

  // Handle image loading error
  const handleImageError = (therapistId: string) => {
    const therapistData = therapistsList.find(t => t.therapist.id === therapistId);
    const imageUrl = therapistData?.therapist?.image_link;
    console.error(`[Image Error] Failed to load image for therapist ${therapistId} (${therapistData?.therapist?.intern_name})`);
    console.error(`[Image Error] Image URL was: ${imageUrl}`);
    setImageError(prev => ({ ...prev, [therapistId]: true }));
  };

  // Sanitize labels to remove JSON artifacts
  const sanitizeLabel = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value
      .replace(/[{}\[\]"']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
 
  // Normalize arbitrary inputs to a clean string[]
  const toStringArray = (input: unknown): string[] => {
    if (!input) return [];
    if (Array.isArray(input)) return input.map((v) => sanitizeLabel(typeof v === 'string' ? v : String(v))).filter(Boolean);
    if (typeof input === 'string') {
      const raw = input.trim();
      if (!raw) return [];
      // Try parse JSON array first
      if ((raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('"[') && raw.endsWith(']"'))) {
        try {
          const parsed = JSON.parse(raw.replace(/^"|"$/g, ''));
          if (Array.isArray(parsed)) {
            return parsed.map((v) => sanitizeLabel(typeof v === 'string' ? v : String(v))).filter(Boolean);
          }
        } catch {}
      }
      const noBraces = raw.replace(/^[{\[]|[}\]]$/g, '');
      const parts = noBraces.split(/[,;\|]/g).map((s) => sanitizeLabel(s));
      return parts.filter(Boolean);
    }
    try {
      return [sanitizeLabel(String(input))].filter(Boolean);
    } catch {
      return [];
    }
  };

  const cleanList = (list?: unknown[]): string[] => {
    if (!Array.isArray(list)) return [];
    return list
      .map(sanitizeLabel)
      .filter((label) => /[A-Za-z0-9]/.test(label));
  };
 
  const matchedSpecialties = cleanList(matchedSpecialtiesRaw);
 
  // Combine all specialties and diagnoses
  const allSpecialtiesRaw = [
    ...toStringArray(therapist?.specialities),
    ...toStringArray(therapist?.diagnoses),
    ...toStringArray(therapist?.diagnoses_specialities),
    ...toStringArray(therapist?.diagnoses_specialties_array),
  ];
  const allSpecialties = cleanList(allSpecialtiesRaw);
  
  // Remove duplicates and sort by match
  const uniqueSpecialties = Array.from(new Set(allSpecialties));
  const sortedSpecialties = [
    ...uniqueSpecialties.filter(s => matchedSpecialties.includes(s)),
    ...uniqueSpecialties.filter(s => !matchedSpecialties.includes(s))
  ];
 
  // Combine therapeutic orientation fields
  const therapeuticOrientationCombined = [
    ...toStringArray(therapist?.therapeutic_orientation),
    ...toStringArray(therapist?.internal_therapeutic_orientation),
  ];
  const therapeuticOrientation = Array.from(new Set(cleanList(therapeuticOrientationCombined)));
  const religions = toStringArray(therapist?.religion);

  // Check if video URL is valid with comprehensive logging
  // Use the correct database field name: "welcome_video"
  const welcomeVideoLink = therapist?.welcome_video ?? therapist?.welcome_video_link ?? therapist?.greetings_video_link ?? '';
  
    const videoAnalysis = useMemo(() => {

    if (!welcomeVideoLink || welcomeVideoLink.trim() === '') {
      return { hasVideo: false, videoType: 'none', embedUrl: '', reason: 'No video URL provided' };
    }

    const cleanUrl = welcomeVideoLink.trim();
    
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      console.warn(`[Video] Invalid URL format for ${therapist?.intern_name}: ${cleanUrl}`);
      return { hasVideo: false, videoType: 'invalid', embedUrl: '', reason: 'URL does not start with http/https' };
    }

    // Analyze YouTube URLs
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      const videoId = extractYouTubeId(cleanUrl);
      if (!videoId) {
        console.error(`[Video] Could not extract YouTube ID from: ${cleanUrl}`);
        return { hasVideo: false, videoType: 'youtube-invalid', embedUrl: '', reason: 'Invalid YouTube URL format' };
      }

      // Detect YouTube Shorts
      const isShort = cleanUrl.includes('/shorts/') || cleanUrl.includes('youtube.com/shorts');
      const videoType = isShort ? 'youtube-short' : 'youtube-regular';
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;



      return { hasVideo: true, videoType, embedUrl, videoId, isShort, reason: 'Valid YouTube video' };
    }

    // Analyze Vimeo URLs
    if (cleanUrl.includes('vimeo.com')) {
      const vimeoMatch = cleanUrl.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        const videoId = vimeoMatch[1];
        const embedUrl = `https://player.vimeo.com/video/${videoId}`;
        


        return { hasVideo: true, videoType: 'vimeo', embedUrl, videoId, reason: 'Valid Vimeo video' };
      } else {
        console.error(`[Video] Could not extract Vimeo ID from: ${cleanUrl}`);
        return { hasVideo: false, videoType: 'vimeo-invalid', embedUrl: '', reason: 'Invalid Vimeo URL format' };
      }
    }

    // Check for direct video files
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.m4v'];
    const hasVideoExtension = videoExtensions.some(ext => cleanUrl.toLowerCase().includes(ext));
    
    if (hasVideoExtension) {
      return { hasVideo: true, videoType: 'direct', embedUrl: cleanUrl, reason: 'Direct video file' };
    }

    // Check for other known video platforms
    const supportedPlatforms = ['wistia.com', 'loom.com', 'drive.google.com'];
    const platform = supportedPlatforms.find(p => cleanUrl.includes(p));
    
    if (platform) {
      return { hasVideo: true, videoType: 'other-platform', embedUrl: cleanUrl, platform, reason: `Video from ${platform}` };
    }

    // Unknown video source
    console.warn(`[Video] Unknown video source for ${therapist?.intern_name}: ${cleanUrl}`);
    return { hasVideo: false, videoType: 'unknown', embedUrl: '', reason: 'Unknown video platform or format' };

  }, [welcomeVideoLink, therapist?.intern_name]);

  const hasValidVideo = videoAnalysis.hasVideo && welcomeVideoLink && welcomeVideoLink.trim() !== '';

  // Calendar computations (Monday-start week)
  const monthLabel = calendarDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const jsFirstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 Sun .. 6 Sat
  const firstWeekdayIndex = (jsFirstDay + 6) % 7; // 0 Mon .. 6 Sun
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
  const calendarCells = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - firstWeekdayIndex + 1;
    if (dayNum < 1) {
      const d = daysInPrevMonth + dayNum;
      return { key: `p-${i}`, day: d, inMonth: false as const, date: new Date(currentYear, currentMonth - 1, d) };
    }
    if (dayNum > daysInCurrentMonth) {
      const d = dayNum - daysInCurrentMonth;
      return { key: `n-${i}`, day: d, inMonth: false as const, date: new Date(currentYear, currentMonth + 1, d) };
    }
    return { key: `c-${i}`, day: dayNum, inMonth: true as const, date: new Date(currentYear, currentMonth, dayNum) };
  });

  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  
  
  const goPrevMonth = () => {
    const next = new Date(currentYear, currentMonth - 1, 1);
    setCalendarDate(next);
    
    // Track calendar navigation
    if (clientData?.response_id) {
      journeyTracker.trackInteraction(clientData.response_id, 'calendar_navigation', {
        direction: 'previous',
        from_month: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
        to_month: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`,
        therapist_id: therapist?.id,
        has_availability: !!availability?.days && Object.keys(availability.days).length > 0
      }).catch(console.error);
    }
    
    // Clear date selection when navigating to previous month - let auto-selection handle it
    setSelectedDateObj(null);
    console.log(`[Calendar Navigation] Navigated to previous month, cleared date selection for auto-selection`);
  };
  
  const goNextMonth = () => {
    const next = new Date(currentYear, currentMonth + 1, 1);
    const now = new Date();
    // Normalize 14-day limit to end of 14th day
    const maximumBookingDate = new Date(now);
    maximumBookingDate.setDate(maximumBookingDate.getDate() + 14);
    maximumBookingDate.setHours(23, 59, 59, 999); // End of 14th day
    
    // Don't navigate to a month that's entirely beyond the 14-day window
    if (next.getTime() > maximumBookingDate.getTime()) {
      console.log(`[Calendar Navigation] Cannot navigate beyond 14-day booking window`);
      return;
    }
    
    setCalendarDate(next);
    
    // Track calendar navigation
    if (clientData?.response_id) {
      journeyTracker.trackInteraction(clientData.response_id, 'calendar_navigation', {
        direction: 'next',
        from_month: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
        to_month: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`,
        therapist_id: therapist?.id,
        has_availability: !!availability?.days && Object.keys(availability.days).length > 0
      }).catch(console.error);
    }
    
    // Clear date selection when navigating to next month - let auto-selection handle it
    setSelectedDateObj(null);
    console.log(`[Calendar Navigation] Navigated to next month, cleared date selection for auto-selection`);
  };

  // Pull availability for this therapist + month (if fetched)
  const availability = availabilityCache[avKey];
  const emailForSlots = therapist?.calendar_email || therapist?.email || '';

  // Fallback: derive per-day available slot counts from legacy ISO slots with logging
  const legacyDayCount = useMemo(() => {
    const map: Record<number, number> = {};
    const isoList = (fetchedSlots[emailForSlots] || therapist?.available_slots || []) as string[];
    let invalidTimeSlots = 0;
    let validTimeSlots = 0;
    
    for (const iso of isoList) {
      const dt = new Date(iso);
      if (dt.getFullYear() === currentYear && dt.getMonth() === currentMonth) {
        const day = dt.getDate();
        const hour = dt.getHours();
        
        // Count valid vs invalid time slots for logging
        if (hour >= 7 && hour < 22) {
          validTimeSlots++;
          map[day] = (map[day] ?? 0) + 1;
        } else {
          invalidTimeSlots++;
          console.warn(`[Legacy Slots] Invalid time slot from legacy API:`, {
            therapist: therapist?.intern_name,
            isoString: iso,
            parsedTime: dt.toLocaleString(),
            hour: hour,
            reason: hour < 7 ? 'before-7am' : 'after-10pm',
            timezone: timezoneDisplay
          });
        }
      }
    }
    
    if (isoList.length > 0) {
      console.log(`[Legacy Slots] ${therapist?.intern_name} - ${currentYear}-${String(currentMonth+1).padStart(2,"0")}:`, {
        totalLegacySlots: isoList.length,
        validTimeSlots,
        invalidTimeSlots,
        filteredDayCount: Object.keys(map).length,
        timezone: timezoneDisplay
      });
    }
    
    return map;
  }, [fetchedSlots, therapist?.available_slots, emailForSlots, currentYear, currentMonth, therapist?.intern_name, timezoneDisplay]);

  // Count available slots for a particular day
  const getDayAvailableCount = useCallback((date: Date): number => {
    const dayNum = date.getDate();
    
    // Check if the date is in the currently cached month
    const dateYear = date.getFullYear();
    const dateMonth = date.getMonth();
    const isSameMonth = (dateYear === currentYear && dateMonth === currentMonth);
    
    // 24-hour minimum lead time check - normalized to day after tomorrow at start of day
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Start of tomorrow
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    dayAfterTomorrow.setHours(0, 0, 0, 0); // Start of day after tomorrow
    
    const minimumBookingTime = dayAfterTomorrow; // Always start of day after tomorrow
    const dateEndOfDay = new Date(date);
    dateEndOfDay.setHours(23, 59, 59, 999); // End of the selected day
    
    // 14-day advance limit - normalized to 14 days from today at end of day
    const maximumBookingTime = new Date(now);
    maximumBookingTime.setDate(maximumBookingTime.getDate() + 14);
    maximumBookingTime.setHours(23, 59, 59, 999); // End of 14th day
    const dateStartOfDay = new Date(date);
    dateStartOfDay.setHours(0, 0, 0, 0); // Start of the selected day
    
    // If the entire day is within the 24-hour lead time or beyond 14 days, return 0
    if (dateEndOfDay.getTime() < minimumBookingTime.getTime() || dateStartOfDay.getTime() > maximumBookingTime.getTime()) {
      return 0;
    }
    
    if (isSameMonth && availability?.days && availability.days[dayNum]) {
      const payload = availability.days[dayNum];
      const sessions = payload.sessions ?? [];
      
      // Filter sessions to respect 24-hour lead time
      let availableSessions = sessions.length > 0 ? sessions : (payload.slots || []).filter(s => s.is_free).map(s => ({ start: s.start, end: s.end }));
      
      // Apply 24-hour lead time and 14-day advance limit filter  
      // Use the normalized maximumBookingTime already calculated above
      const normalizedMaxBookingTime = new Date(now);
      normalizedMaxBookingTime.setDate(normalizedMaxBookingTime.getDate() + 14);
      normalizedMaxBookingTime.setHours(23, 59, 59, 999);
      availableSessions = availableSessions.filter(session => {
        const sessionTime = new Date(session.start);
        return sessionTime.getTime() >= minimumBookingTime.getTime() && sessionTime.getTime() <= normalizedMaxBookingTime.getTime();
      });
      
      // Apply hourly restriction for Associate Therapists
      const therapistCategory = getTherapistCategory(therapist);
      if (therapistCategory === 'Associate Therapist') {
        availableSessions = availableSessions.filter(session => {
          const sessionTime = new Date(session.start);
          return sessionTime.getMinutes() === 0; // Only hourly slots
        });
      }
      
      return availableSessions.length;
    }
    
    // For legacy fallback, only use if it's the same month
    if (isSameMonth) {
      const legacyCount = legacyDayCount[dayNum] ?? 0;
      
      // For legacy slots, we need to check each slot individually for lead time
      if (legacyCount > 0) {
        const calendarAvailableSlotsLegacy = (fetchedSlots[emailForSlots] || therapist?.available_slots || []) as string[];
        const daySlots = calendarAvailableSlotsLegacy
          .map((iso: string) => new Date(iso))
          .filter((dt: Date) => dt.toDateString() === date.toDateString());
        
        // Apply filters - use normalized maximumBookingTime
        const normalizedMaxBookingTimeLegacy = new Date(now);
        normalizedMaxBookingTimeLegacy.setDate(normalizedMaxBookingTimeLegacy.getDate() + 14);
        normalizedMaxBookingTimeLegacy.setHours(23, 59, 59, 999);
        let filteredSlots = daySlots.filter(dt => 
          dt.getTime() >= minimumBookingTime.getTime() && dt.getTime() <= normalizedMaxBookingTimeLegacy.getTime()
        );
        
        const therapistCategory = getTherapistCategory(therapist);
        if (therapistCategory === 'Associate Therapist') {
          filteredSlots = filteredSlots.filter(dt => dt.getMinutes() === 0);
        }
        
        return filteredSlots.length;
      }
      
      return legacyCount;
    }
    
    // For dates in different months, return 0 (will need to fetch availability when calendar changes)
    return 0;
  }, [availability?.days, currentYear, currentMonth, legacyDayCount, therapist, fetchedSlots, emailForSlots, getTherapistCategory]);

  // Auto-select first available date in current month only (never navigate calendar)
  useEffect(() => {
    if (!selectedDateObj && (availability?.days || Object.keys(fetchedSlots).length > 0) && !isSwitchingTherapists) {
      const now = new Date();
      // Normalize to day after tomorrow at start of day
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const minimumBookingDate = new Date(tomorrow);
      minimumBookingDate.setDate(minimumBookingDate.getDate() + 1);
      minimumBookingDate.setHours(0, 0, 0, 0); // Start of day after tomorrow
      
      // Normalize to 14 days from today at end of day  
      const maximumBookingDate = new Date(now);
      maximumBookingDate.setDate(maximumBookingDate.getDate() + 14);
      maximumBookingDate.setHours(23, 59, 59, 999); // End of 14th day
      
      console.log(`[Calendar] Simple auto-selection: Looking for available dates in current month only`);
      
      // Only search within the current calendar month - NEVER navigate calendar
      const currentMonthStart = new Date(currentYear, currentMonth, 1);
      const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);
      
      let searchDate = new Date(Math.max(minimumBookingDate.getTime(), currentMonthStart.getTime()));
      let foundDate: Date | null = null;
      
      // Simple day-by-day search within current month only
      while (searchDate.getTime() <= Math.min(maximumBookingDate.getTime(), currentMonthEnd.getTime()) && !foundDate) {
        const availableCount = getDayAvailableCount(searchDate);
        if (availableCount > 0) {
          foundDate = new Date(searchDate);
          console.log(`[Calendar] Found available date in current month: ${foundDate.toDateString()} (${availableCount} slots)`);
          break;
        }
        searchDate = new Date(searchDate.getTime() + (24 * 60 * 60 * 1000));
      }
      
      if (foundDate) {
        setSelectedDateObj(foundDate);
        console.log(`[Calendar] Auto-selected: ${foundDate.toDateString()}`);
      } else {
        console.log(`[Calendar] No availability found in current month - user must manually navigate`);
      }
    }
  }, [availability?.days, fetchedSlots, selectedDateObj, currentYear, currentMonth, getDayAvailableCount, isSwitchingTherapists]);

  // Validate selected date when month changes or availability updates
  useEffect(() => {
    if (selectedDateObj) {
      const selectedMonth = selectedDateObj.getMonth();
      const selectedYear = selectedDateObj.getFullYear();
      
      // Check if selected date is in a different month than current calendar view
      if (selectedMonth !== currentMonth || selectedYear !== currentYear) {
        console.log(`[Calendar Validation] Selected date ${selectedDateObj.toDateString()} is not in current month (${currentYear}-${currentMonth + 1}), clearing selection`);
        setSelectedDateObj(null);
        return;
      }
      
      // Check if selected date is actually available
      const availableCount = getDayAvailableCount(selectedDateObj);
      const today = new Date();
      const isNotFuture = selectedDateObj <= today;
      
      if (isNotFuture || availableCount === 0) {
        console.log(`[Calendar Validation] Selected date ${selectedDateObj.toDateString()} is not available (future: ${!isNotFuture}, slots: ${availableCount}), clearing selection`);
        setSelectedDateObj(null);
      }
    }
  }, [selectedDateObj, currentMonth, currentYear, getDayAvailableCount]);

  // Build time slots for the selected day with time restrictions and extensive logging
  const slotsForDay = useMemo(() => {
    if (!selectedDateObj) return [];

    let rawSlots: Date[] = [];
    let dataSource = 'none';

    // Get raw slots from API - prefer new availability JSON
    if (availability?.days) {
      const dayNum = selectedDateObj.getDate();
      const payload = availability.days[dayNum];
      if (payload) {
        dataSource = 'new-availability-api';
        const sessions = (payload.sessions && payload.sessions.length > 0)
          ? payload.sessions.map(s => new Date(s.start))
          : payload.slots.filter(s => s.is_free).map(s => new Date(s.start));
        rawSlots = sessions.filter(dt => isSameDay(dt, selectedDateObj));
      }
    }

    // Fallback to legacy ISO list
    if (rawSlots.length === 0) {
      dataSource = 'legacy-iso-slots';
      const calendarAvailableSlotsLegacy = (fetchedSlots[emailForSlots] || therapist?.available_slots || []) as string[];
      rawSlots = (calendarAvailableSlotsLegacy || [])
        .map((iso: string) => new Date(iso))
        .filter((dt: Date) => isSameDay(dt, selectedDateObj));
    }

    // Extensive logging for debugging
    console.log(`[Calendar Debug] ${therapist?.intern_name} - ${selectedDateObj.toDateString()}:`, {
      dataSource,
      rawSlotsCount: rawSlots.length,
      rawSlots: rawSlots.map(s => ({
        time: s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
        hour24: s.getHours(),
        isoString: s.toISOString()
      })),
      timezone: `${timezoneDisplay} (${timezone})`,
      therapistEmail: emailForSlots
    });

    // Filter for 7 AM - 10 PM (7:00 - 21:59)
    let filteredSlots = rawSlots.filter(dt => {
      const hour = dt.getHours();
      return hour >= 7 && hour < 22; // Filter to 7AM-10PM range silently
    });

    // 24-HOUR MINIMUM LEAD TIME & 14-DAY ADVANCE LIMIT: Only show slots within booking window
    const now = new Date();
    // Normalize to day after tomorrow at start of day for minimum
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const minimumBookingTime = new Date(tomorrow);
    minimumBookingTime.setDate(minimumBookingTime.getDate() + 1);
    minimumBookingTime.setHours(0, 0, 0, 0); // Start of day after tomorrow
    
    // Normalize to 14 days from today at end of day for maximum
    const maximumBookingTime = new Date(now);
    maximumBookingTime.setDate(maximumBookingTime.getDate() + 14);
    maximumBookingTime.setHours(23, 59, 59, 999); // End of 14th day
    
    const beforeTimeWindowFilter = filteredSlots.length;
    filteredSlots = filteredSlots.filter(dt => {
      return dt.getTime() >= minimumBookingTime.getTime() && dt.getTime() <= maximumBookingTime.getTime();
    });
    
    const removedByTimeWindowFilter = beforeTimeWindowFilter - filteredSlots.length;
    if (removedByTimeWindowFilter > 0) {
      console.log(`[Booking Time Window Filter] ${therapist?.intern_name}: Filtered out ${removedByTimeWindowFilter} slots outside 24hr-14day window (${minimumBookingTime.toLocaleString()} to ${maximumBookingTime.toLocaleString()})`);
    }

    // ASSOCIATE THERAPIST RESTRICTION: Only allow on-the-hour slots (12pm, 1pm, 2pm, NO in-betweens)
    const therapistCategory = getTherapistCategory(therapist);
    if (therapistCategory === 'Associate Therapist') {
      const beforeHourlyFilter = filteredSlots.length;
      filteredSlots = filteredSlots.filter(dt => {
        const minutes = dt.getMinutes();
        return minutes === 0; // Only allow slots at exact hour (no :15, :30, :45)
      });
      
      const removedByHourlyFilter = beforeHourlyFilter - filteredSlots.length;
      if (removedByHourlyFilter > 0) {
        console.log(`[Associate Therapist Filter] ${therapist?.intern_name}: Filtered out ${removedByHourlyFilter} non-hourly slots (only on-the-hour allowed for Associate Therapists)`);
      }
      
      console.log(`[Associate Therapist Filter] Available hourly slots:`, filteredSlots.map(s => ({
        time: s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
        hour: s.getHours(),
        minute: s.getMinutes()
      })));
    }

    // Only log if there are issues or no slots available
    const removedCount = rawSlots.length - filteredSlots.length;
    if (filteredSlots.length === 0 && rawSlots.length > 0) {
      console.log(`[Calendar] ${therapist?.intern_name} on ${selectedDateObj.toDateString()}: All ${rawSlots.length} slots filtered out (outside 7AM-10PM or non-hourly for Associate Therapists)`);
    } else if (removedCount > 0) {
      console.log(`[Calendar] ${therapist?.intern_name}: ${removedCount} slots filtered (time restrictions + hourly filter for Associates), ${filteredSlots.length} available`);
    }

    return filteredSlots.sort((a, b) => a.getTime() - b.getTime());
  }, [availability?.days, selectedDateObj, emailForSlots, fetchedSlots, timezoneDisplay, timezone, therapist, getTherapistCategory]);

  const formatTimeLabel = (date: Date) => {
    const timeString = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    console.log(`[Format Time] ${date.toISOString()} -> "${timeString}"`);
    return timeString;
  };

  // Get session duration based on payment type
  const getSessionDuration = () => {
    const paymentType = getSelectedPaymentType();
    return paymentType === 'insurance' ? 55 : 45;
  };

  // Handle therapist search loading with useEffect at top level
  useEffect(() => {
    if (!showTherapistSearchLoading) return;
    
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    
    console.log(`[Find Another] 🔄 Starting simple preload + timeout approach`);
    
    const handleCompletion = () => {
      if (mounted) {
        console.log(`[Find Another] ⏰ Timeout reached, calling completion`);
        handleTherapistSearchComplete();
      }
    };
    
    // If we have a preloader, run it
    if (therapistSearchPreloader) {
      therapistSearchPreloader()
        .then(() => {
          console.log(`[Find Another] ✅ Preload complete, waiting for minimum time`);
          // Wait at least 4 seconds total before completing
          timeoutId = setTimeout(handleCompletion, 4000);
        })
        .catch((error) => {
          console.error(`[Find Another] ❌ Preload failed:`, error);
          // Still complete even if preload fails
          timeoutId = setTimeout(handleCompletion, 4000);
        });
    } else {
      // No preloader, just wait minimum time
      timeoutId = setTimeout(handleCompletion, 4000);
    }
    
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [showTherapistSearchLoading, handleTherapistSearchComplete, therapistSearchPreloader]);

  // Debug logging
  console.log('🔍 MatchedTherapist Debug:', {
    therapistsList: therapistsList,
    therapistsListLength: therapistsList?.length,
    currentIndex,
    currentTherapistData,
    therapist,
    hasTherapist: !!therapist
  });

  if (!therapist) {
    console.error('❌ No therapist data found!', {
      therapistsList,
      currentIndex,
      currentTherapistData
    });
    return (
      <div className="flex items-center justify-center" style={{ height: '100%' }}>
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-4 text-red-600">No Therapist Data</h2>
          <p className="text-gray-600 mb-4">
            Unable to load therapist information. 
            {therapistsList?.length === 0 ? ' No therapists in list.' : 
             !therapistsList ? ' Therapists list is undefined.' :
             ` Current index ${currentIndex} out of bounds (${therapistsList.length} items).`}
          </p>
          <Button onClick={onBack} className="bg-yellow-100 hover:bg-yellow-200 text-gray-800 rounded-full border border-[#5C3106]">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Show therapist search loading screen if searching for next therapist
  if (showTherapistSearchLoading) {
    return (
      <LoadingScreen
        variant="therapist-search"
        // Don't pass preloadData or onComplete - we handle it manually
        minDisplayTime={10000} // Long timeout as fallback
      />
    );
  }

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      {/* Header */}
      <div className="relative h-12 sm:h-20 md:h-24 overflow-visible">
        <Image
          src="/onboarding-banner.jpg"
          alt="Onboarding Banner"
          width={1440}
          height={96}
          priority
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-start p-3 sm:p-4">
          {onBack && (
            <button
              onClick={onBack}
              className="mr-2 p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-800" />
            </button>
          )}
        </div>
      </div>

      {/* Heading below banner */}
      <div className="px-4 md:px-6 py-3">
        <h2 className="very-vogue-title text-2xl sm:text-3xl md:text-4xl text-gray-800 text-center">
          A Therapist We Think You'll <em>Click With</em>
        </h2>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 md:px-6 py-4 min-h-0">
        <div className="h-full flex flex-col max-w-7xl mx-auto">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 min-h-0">
            {/* Left Column - Therapist Details */}
            <div className="col-span-1 md:col-span-7 flex flex-col min-h-0">
              <Card className="md:flex-1 overflow-visible bg-white border border-[#5C3106] rounded-3xl shadow-[1px_1px_0_#5C3106] relative">
                <CardContent className="p-4 md:p-6">
                  {/* Therapist Header */}
                  <div className="flex flex-col md:flex-row items-start gap-4 mb-6">
                    <div className="flex w-full gap-4">
                      {/* Profile Image */}
                      <div className="flex-shrink-0">
                        {therapist.image_link && !imageError[therapist.id] ? (
                          <div className="relative w-24 h-24">
                            <img
                              src={getImageUrl(therapist.image_link)}
                              alt={therapist.intern_name}
                              className="w-full h-full rounded-full object-cover shadow-sm border border-gray-200"
                              onError={() => handleImageError(therapist.id)}
                              onLoad={() => console.log(`[Image] Successfully loaded: ${therapist.intern_name}`)}
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-sm border border-gray-200">
                            <span className="text-xl font-medium text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
                              {therapist.intern_name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Video Button - matches profile image height */}
                      {hasValidVideo && (
                        <div className="flex-1">
                          <button
                            onClick={() => {
                              setShowVideo(!showVideo);
                              // Track video interaction
                              if (clientData?.response_id) {
                                journeyTracker.trackInteraction(clientData.response_id, 'video_toggle', {
                                  action: showVideo ? 'close' : 'open',
                                  therapist_id: therapist?.id,
                                  therapist_name: therapist?.intern_name,
                                  has_video: hasValidVideo
                                }).catch(console.error);
                              }
                            }}
                            className="w-full h-24 bg-gray-900 rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors overflow-hidden shadow-[1px_1px_0_#5C3106] relative"
                          >
                            {(() => {
                              const thumbnailUrl = getVideoThumbnail(videoAnalysis);
                              if (thumbnailUrl) {
                                return (
                                  <>
                                    <Image
                                      src={thumbnailUrl}
                                      alt={`Video thumbnail for ${therapist.intern_name}`}
                                      fill
                                      className="object-cover rounded-xl"
                                      onError={(event) => {
                                        // Fallback to dark background if thumbnail fails to load
                                        const target = event.target as HTMLImageElement;
                                        if (target) {
                                          target.style.display = 'none';
                                        }
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-30 rounded-xl" />
                                    <div className="relative z-10 flex items-center gap-3">
                                      <div className="w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                                        <Play className="w-6 h-6 text-white ml-1" />
                                      </div>
                                      <span className="text-white text-sm font-medium drop-shadow-lg" style={{ fontFamily: 'var(--font-inter)' }}>Meet {therapist.intern_name?.split(' ')[0] || 'Therapist'}</span>
                                    </div>
                                  </>
                                );
                              } else {
                                return (
                                  <div className="relative z-10 flex items-center gap-3">
                                    <Play className="w-6 h-6 text-white" />
                                    <span className="text-white text-sm font-medium" style={{ fontFamily: 'var(--font-inter)' }}>Meet {therapist.intern_name?.split(' ')[0] || 'Therapist'}</span>
                                  </div>
                                );
                              }
                            })()}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full mt-4">
                      <h2 className="very-vogue-title text-xl sm:text-2xl text-gray-800">{therapist.intern_name}</h2>
                      {/* Therapist category */}
                      <p className="text-sm text-gray-600 mt-1 mb-3" style={{ fontFamily: 'var(--font-inter)' }}>
                        {getTherapistCategory(therapist)}
                      </p>
                      {/* Matched specialties */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {matchedSpecialties.slice(0, 3).map((specialty, i) => (
                          <span key={i} className="px-3 py-1 bg-yellow-100 text-gray-800 rounded-full text-xs border border-[#5C3106] shadow-[1px_1px_0_#5C3106]" style={{ fontFamily: 'var(--font-inter)' }}>
                            {specialty}
                          </span>
                        ))}
                        {matchedSpecialties.length > 3 && (
                          <span className="px-3 py-1 bg-white text-blue-700 rounded-full text-xs border border-gray-300 shadow-[1px_1px_0_#5C3106]" style={{ fontFamily: 'var(--font-inter)' }}>
                            +{matchedSpecialties.length - 3} more matches
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Demographics */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 text-xs" style={{ fontFamily: 'var(--font-inter)' }}>
                    <div>
                      <p className="text-gray-500">Identifies as</p>
                      <p className="font-medium">{therapist.identities_as || therapist.gender || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Age</p>
                      <p className="font-medium">{therapist.age || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Works in States</p>
                      <p className="font-medium">{Array.isArray(therapist.states) ? therapist.states.join(', ') : (therapist.states || 'Not specified')}</p>
                    </div>
                  </div>

                  {/* Biography */}
                  {therapist.biography && (
                    <div className="mb-6">
                      <p className="text-gray-700 leading-relaxed">
                        {therapist.biography}
                      </p>
                    </div>
                  )}

                  {/* Skills and Experience sections remain the same... */}
                  <div className="space-y-4">
                    <h3 className="very-vogue-title text-lg sm:text-xl text-gray-800">Skills and Experience</h3>
                    
                    {/* Specialties */}
                    <div>
                      <p className="text-xs text-gray-600 mb-2" style={{ fontFamily: 'var(--font-inter)' }}>Specializes in</p>
                      <div className="flex flex-wrap gap-2">
                        {matchedSpecialties.map((specialty, i) => (
                          <span 
                            key={`matched-specialty-${i}`}
                            className="px-3 py-1 rounded-full text-xs border shadow-[1px_1px_0_#5C3106] bg-yellow-100 border-[#5C3106] text-gray-800"
                            style={{ fontFamily: 'var(--font-inter)' }}
                          >
                            {specialty}
                          </span>
                        ))}

                        {(() => {
                          const nonMatched = sortedSpecialties.filter((s) => !matchedSpecialties.includes(s));
                          const visible = showAllSpecialties ? nonMatched : nonMatched.slice(0, 3);
                          const remaining = nonMatched.length - visible.length;
                          return (
                            <>
                              {visible.map((specialty, i) => (
                                <span 
                                  key={`nonmatched-specialty-${i}`}
                                  className="px-3 py-1 rounded-full text-xs border shadow-[1px_1px_0_#5C3106] bg-white border-gray-300 text-gray-700"
                                  style={{ fontFamily: 'var(--font-inter)' }}
                                >
                                  {specialty}
                                </span>
                              ))}
                              {!showAllSpecialties && remaining > 0 && (
                                <button
                                  onClick={() => {
                                    setShowAllSpecialties(true);
                                    // Track specialty expansion
                                    if (clientData?.response_id) {
                                      journeyTracker.trackInteraction(clientData.response_id, 'specialty_expansion', {
                                        action: 'expand',
                                        therapist_id: therapist?.id,
                                        therapist_name: therapist?.intern_name,
                                        total_specialties: nonMatched.length,
                                        matched_specialties: matchedSpecialties.length
                                      }).catch(console.error);
                                    }
                                  }}
                                  className="px-3 py-1 rounded-full text-xs border shadow-[1px_1px_0_#5C3106] bg-white border-gray-300 text-blue-700"
                                  style={{ fontFamily: 'var(--font-inter)' }}
                                >
                                  Show {remaining}+ more
                                </button>
                              )}
                              {showAllSpecialties && nonMatched.length > 3 && (
                                <button
                                  onClick={() => {
                                    setShowAllSpecialties(false);
                                    // Track specialty collapse
                                    if (clientData?.response_id) {
                                      journeyTracker.trackInteraction(clientData.response_id, 'specialty_expansion', {
                                        action: 'collapse',
                                        therapist_id: therapist?.id,
                                        therapist_name: therapist?.intern_name,
                                        total_specialties: nonMatched.length,
                                        matched_specialties: matchedSpecialties.length
                                      }).catch(console.error);
                                    }
                                  }}
                                  className="px-3 py-1 rounded-full text-xs border shadow-[1px_1px_0_#5C3106] bg-white border-gray-300 text-blue-700"
                                  style={{ fontFamily: 'var(--font-inter)' }}
                                >
                                  Show less
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Therapeutic orientation */}
                    {therapeuticOrientation && therapeuticOrientation.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-600 mb-2" style={{ fontFamily: 'var(--font-inter)' }}>Therapeutic orientation</p>
                        <div className="flex flex-wrap gap-2">
                          {therapeuticOrientation.map((orientation, i) => (
                            <span key={`orientation-${i}`} className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs shadow-[1px_1px_0_#5C3106]" style={{ fontFamily: 'var(--font-inter)' }}>
                              {orientation}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Religion experience */}
                    {religions && religions.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-600 mb-2" style={{ fontFamily: 'var(--font-inter)' }}>Has experience working with religions</p>
                        <div className="flex flex-wrap gap-2">
                          {religions.map((r, i) => (
                            <span key={`religion-${i}`} className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs shadow-[1px_1px_0_#5C3106]" style={{ fontFamily: 'var(--font-inter)' }}>
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Booking */}
            <div className="col-span-1 md:col-span-5 flex flex-col min-h-0">
              <Card className="md:flex-1 bg-white border border-[#5C3106] rounded-3xl shadow-[1px_1px_0_#5C3106] md:sticky md:top-4">
                <CardContent className="p-4 md:p-6 flex flex-col">
                  <h3 className="very-vogue-title text-lg sm:text-xl text-gray-800 mb-1">Book Your First Session</h3>
                  <p className="text-xs text-gray-600 mb-4" style={{ fontFamily: 'var(--font-inter)' }}>
                    {clientData?.state ? 
                      `${String(clientData.state).toUpperCase()} Time (${timezoneDisplay})` : 
                      `Local Time (${timezoneDisplay})`
                    }
                  </p>

                  {/* Calendar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium" style={{ fontFamily: 'var(--font-inter)' }}>{monthLabel}</h4>
                      <div className="flex gap-2">
                        <button onClick={goPrevMonth} className="p-1 hover:bg-gray-100 rounded border border-gray-200" aria-label="Previous month">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={goNextMonth} 
                          className="p-1 hover:bg-gray-100 rounded border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                          aria-label="Next month"
                          disabled={(() => {
                            const now = new Date();
                            // Normalize to 14 days from today at end of day
                            const maximumBookingDate = new Date(now);
                            maximumBookingDate.setDate(maximumBookingDate.getDate() + 14);
                            maximumBookingDate.setHours(23, 59, 59, 999);
                            const nextMonth = new Date(currentYear, currentMonth + 1, 1);
                            return nextMonth.getTime() > maximumBookingDate.getTime();
                          })()}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="border border-[#5C3106] rounded-2xl p-2 shadow-[1px_1px_0_#5C3106]" style={{ fontFamily: 'var(--font-inter)' }}>
                      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1" style={{ fontFamily: 'var(--font-inter)' }}>
                        {['m','t','w','t','f','s','s'].map((d, i) => (
                          <div key={`dh-${i}`} className="py-1 uppercase tracking-wide">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center text-xs" style={{ fontFamily: 'var(--font-inter)' }}>
                        {calendarCells.map((cell) => {
                          const selected = selectedDateObj ? isSameDay(cell.date, selectedDateObj) : false;
                          const now = new Date();
                          
                          // Normalize minimum time to day after tomorrow at start of day
                          const tomorrow = new Date(now);
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          tomorrow.setHours(0, 0, 0, 0);
                          
                          const minimumBookingTime = new Date(tomorrow);
                          minimumBookingTime.setDate(minimumBookingTime.getDate() + 1);
                          minimumBookingTime.setHours(0, 0, 0, 0); // Start of day after tomorrow
                          
                          // Normalize maximum time to 14 days from today at end of day
                          const maximumBookingTime = new Date(now);
                          maximumBookingTime.setDate(maximumBookingTime.getDate() + 14);
                          maximumBookingTime.setHours(23, 59, 59, 999); // End of 14th day
                          
                          const isToday = isSameDay(cell.date, now);
                          const isWithinLeadTime = cell.date.getTime() < minimumBookingTime.getTime();
                          const isBeyond14Days = cell.date.getTime() > maximumBookingTime.getTime();
                          const isOutsideBookingWindow = isWithinLeadTime || isBeyond14Days;
                          
                          let bgClass = 'bg-white';
                          let isUnavailable = false;
                          let textClass = '';
                          
                          if (cell.inMonth) {
                            if (isOutsideBookingWindow) {
                              // Dates outside booking window (within 24hrs or beyond 14 days) are greyed out and disabled
                              bgClass = 'bg-gray-100';
                              textClass = 'text-gray-400';
                              isUnavailable = true;
                            } else {
                              // Future dates within booking window use availability color-coding
                              const count = getDayAvailableCount(cell.date);
                              const color = count > 5 ? 'green' : count > 2 ? 'yellow' : 'red';
                              isUnavailable = count === 0; // Only unavailable when no slots exist
                              
                              // Make unavailable red slots grey to be more visually distinct
                              if (isUnavailable && color === 'red') {
                                bgClass = 'bg-gray-200';
                                textClass = 'text-gray-500';
                              } else {
                                bgClass =
                                  color === 'red' ? 'bg-red-100' :
                                  color === 'yellow' ? 'bg-yellow-100' :
                                  'bg-green-100';
                              }
                            }
                          }

                          const getTitle = () => {
                            if (!cell.inMonth) return undefined;
                            if (isOutsideBookingWindow) {
                              if (isToday) {
                                return 'Today - earliest booking is 24 hours from now';
                              } else if (isWithinLeadTime) {
                                return 'Within 24-hour minimum lead time - not available';
                              } else if (isBeyond14Days) {
                                return 'Beyond 14-day advance limit - not available';
                              } else {
                                return 'Past date - not available';
                              }
                            }
                            return `Available slots: ${getDayAvailableCount(cell.date)}`;
                          };

                          return (
                            <button
                              key={cell.key}
                              onClick={() => {
                                if (cell.inMonth && !isUnavailable) {
                                  setSelectedDateObj(cell.date);
                                  // Track date selection
                                  if (clientData?.response_id) {
                                    journeyTracker.trackInteraction(clientData.response_id, 'date_selection', {
                                      selected_date: cell.date.toISOString().split('T')[0],
                                      day_of_week: cell.date.toLocaleDateString('en-US', { weekday: 'long' }),
                                      available_slots: getDayAvailableCount(cell.date),
                                      therapist_id: therapist?.id,
                                      therapist_name: therapist?.intern_name
                                    }).catch(console.error);
                                  }
                                }
                              }}
                              disabled={!cell.inMonth || isUnavailable}
                              title={getTitle()}
                              className={`py-2 rounded-lg transition-colors border relative ${
                                selected
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : cell.inMonth
                                    ? isUnavailable
                                      ? `${bgClass} ${textClass} cursor-not-allowed opacity-75 border-transparent`
                                      : `${bgClass} hover:bg-yellow-50 border-transparent`
                                    : 'bg-white text-gray-300 cursor-not-allowed opacity-60 border-transparent'
                              }`}
                            >
                              <span className={isUnavailable && cell.inMonth && !isOutsideBookingWindow ? 'relative' : ''}>
                                {cell.day}
                                {isUnavailable && cell.inMonth && !isOutsideBookingWindow && (
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="block w-full h-0.5 bg-red-500 transform rotate-45 absolute"></span>
                                  </span>
                                )}
                                {isOutsideBookingWindow && cell.inMonth && (
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="block w-full h-0.5 bg-gray-400 transform rotate-45 absolute"></span>
                                    <span className="block w-full h-0.5 bg-gray-400 transform -rotate-45 absolute"></span>
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Time Slots */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {slotsForDay.length > 0 ? (
                      slotsForDay.map((dt) => {
                        const label = formatTimeLabel(dt);
                        const normalized = label.replace(/\s/g, '').toLowerCase();
                        return (
                          <button
                            key={dt.toISOString()}
                            onClick={() => {
                              setSelectedTimeSlot(normalized);
                              // Track time slot selection
                              if (clientData?.response_id) {
                                journeyTracker.trackInteraction(clientData.response_id, 'time_slot_selection', {
                                  selected_time: label,
                                  selected_date: selectedDateObj?.toISOString().split('T')[0],
                                  therapist_id: therapist?.id,
                                  therapist_name: therapist?.intern_name,
                                  source: 'dynamic_availability',
                                  timezone: timezoneDisplay
                                }).catch(console.error);
                              }
                            }}
                            className={`p-3 rounded-full border transition-all shadow-[1px_1px_0_#5C3106] ${
                              selectedTimeSlot === normalized
                                ? 'border-yellow-400 bg-yellow-50'
                                : 'border-[#5C3106] bg-white hover:bg-yellow-50'
                            }`}
                            style={{ fontFamily: 'var(--font-inter)' }}
                          >
                            {label}
                          </button>
                        );
                      })
                    ) : (
                      // Loading state with graceful shimmer animation
                      Array.from({ length: 6 }, (_, index) => (
                        <div
                          key={`loading-slot-${index}`}
                          className="p-3 rounded-full border border-gray-200 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite] shadow-[1px_1px_0_#E5E7EB]"
                          style={{ 
                            animation: `shimmer 2s ease-in-out infinite ${index * 0.1}s`,
                            fontFamily: 'var(--font-inter)'
                          }}
                        >
                          <div className="h-6 bg-transparent"></div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <style jsx>{`
                    @keyframes shimmer {
                      0% { background-position: -200% 0; }
                      100% { background-position: 200% 0; }
                    }
                  `}</style>

                  <Button
                    className="w-full bg-yellow-100 hover:bg-yellow-200 text-gray-800 rounded-full border border-[#5C3106] shadow-[1px_1px_0_#5C3106] mb-6"
                    onClick={handleBookSession}
                    disabled={!selectedTimeSlot || !selectedDateObj}
                    style={{ fontFamily: 'var(--font-inter)' }}
                  >
                    Book {getSessionDuration()}-Min Session →
                  </Button>

                  {/* Find Another Therapist */}
                  <div className="text-center mt-auto">
                    <p className="very-vogue-title text-base sm:text-lg text-gray-800 mb-2">It's Okay to Keep Looking…</p>
                    <Button
                      variant="outline"
                      className="w-full rounded-full border-2 border-[#5C3106]"
                      onClick={handleFindAnother}
                      disabled={isFindingAnother}
                    >
                      {isFindingAnother ? 'Finding New Therapist...' : 'Find Another Therapist →'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Previously Viewed Therapists section remains the same... */}
          {previouslyViewed.length > 0 && (
            <div className="mt-6">
              <h3 className="very-vogue-title text-lg sm:text-xl text-gray-800 mb-4">Previously Viewed Therapists</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {previouslyViewed.slice(0, 4).map((therapistData) => (
                  <button
                    key={`prev-${therapistData.therapist.id}`}
                    onClick={() => handleSelectPreviousTherapist(therapistData.therapist.id)}
                    className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all text-center"
                  >
                    {therapistData.therapist.image_link && !imageError[therapistData.therapist.id] && getImageUrl(therapistData.therapist.image_link) ? (
                      <img
                        src={getImageUrl(therapistData.therapist.image_link)}
                        alt={therapistData.therapist.intern_name}
                        className="w-20 h-20 rounded-full object-cover mx-auto mb-2 shadow-sm border border-gray-200"
                        onError={() => handleImageError(therapistData.therapist.id)}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-2 shadow-sm border border-gray-200">
                        <span className="text-lg font-medium text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
                          {therapistData.therapist.intern_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <p className="font-medium text-xs" style={{ fontFamily: 'var(--font-inter)' }}>{therapistData.therapist.intern_name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simple Video Modal */}
      {showVideo && hasValidVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => {
          setShowVideo(false);
          // Track video modal close via backdrop
          if (clientData?.response_id) {
            journeyTracker.trackInteraction(clientData.response_id, 'video_close', {
              method: 'backdrop_click',
              therapist_id: therapist?.id,
              therapist_name: therapist?.intern_name
            }).catch(console.error);
          }
        }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                  Welcome from {therapist?.intern_name}
                </h3>
                <button 
                  onClick={() => {
                    setShowVideo(false);
                    // Track video modal close via X button
                    if (clientData?.response_id) {
                      journeyTracker.trackInteraction(clientData.response_id, 'video_close', {
                        method: 'close_button',
                        therapist_id: therapist?.id,
                        therapist_name: therapist?.intern_name
                      }).catch(console.error);
                    }
                  }}
                  className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {(() => {
                switch (videoAnalysis.videoType) {
                  case 'youtube-short':
                    return (
                      <div className="flex justify-center">
                        <div className="w-full max-w-sm" style={{ aspectRatio: '9/16' }}>
                          <iframe
                            src={`${videoAnalysis.embedUrl}?rel=0&modestbranding=1&controls=1`}
                            className="w-full h-full rounded-lg"
                            allowFullScreen
                            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            title={`Welcome video from ${therapist?.intern_name}`}
                          />
                        </div>
                      </div>
                    );
                  
                  case 'youtube-regular':
                    return (
                      <div className="w-full" style={{ aspectRatio: '16/9' }}>
                        <iframe
                          src={`${videoAnalysis.embedUrl}?rel=0&modestbranding=1&controls=1`}
                          className="w-full h-full rounded-lg"
                          allowFullScreen
                          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          title={`Welcome video from ${therapist?.intern_name}`}
                        />
                      </div>
                    );
                  
                  case 'vimeo':
                    return (
                      <div className="w-full" style={{ aspectRatio: '16/9' }}>
                        <iframe
                          src={videoAnalysis.embedUrl}
                          className="w-full h-full rounded-lg"
                          allowFullScreen
                          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          title={`Welcome video from ${therapist?.intern_name}`}
                        />
                      </div>
                    );
                  
                  case 'direct':
                    return (
                      <video
                        src={videoAnalysis.embedUrl}
                        className="w-full max-h-[500px] rounded-lg"
                        controls
                        preload="metadata"
                        title={`Welcome video from ${therapist?.intern_name}`}
                      >
                        Your browser does not support the video tag.
                      </video>
                    );
                  
                  case 'other-platform':
                    return (
                      <div>
                        <iframe
                          src={videoAnalysis.embedUrl}
                          className="w-full h-[400px] rounded-lg"
                          allowFullScreen
                          title={`Welcome video from ${therapist?.intern_name}`}
                        />
                        <p className="mt-3 text-xs text-gray-600 text-center" style={{ fontFamily: 'var(--font-inter)' }}>
                          If the video doesn't load, <a href={videoAnalysis.embedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">click here to view it directly</a>.
                        </p>
                      </div>
                    );
                  
                  default:
                    return (
                      <div className="text-center py-12">
                        <p className="text-gray-600 mb-4 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>Unable to display this video format.</p>
                        <a 
                          href={welcomeVideoLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          style={{ fontFamily: 'var(--font-inter)' }}
                        >
                          View video in new tab
                        </a>
                      </div>
                    );
                }
              })()}
            </div>
          </div>
        </div>
      )}
      
      {/* Therapist Search Modal */}
      <TherapistSearchModal
        isVisible={showSearchModal}
        onComplete={() => setShowSearchModal(false)}
      />
      
      {/* Therapist Confirmation Modal */}
      <TherapistConfirmationModal
        isVisible={showConfirmationModal}
        therapist={currentTherapistData}
        selectedDate={selectedDateObj}
        selectedTimeSlot={selectedTimeSlot}
        onConfirm={handleConfirmBooking}
        onCancel={() => setShowConfirmationModal(false)}
        clientTimezone={timezone}
        timezoneDisplay={timezoneDisplay}
        sessionDuration={getSessionDuration()}
      />
    </div>
  );
}