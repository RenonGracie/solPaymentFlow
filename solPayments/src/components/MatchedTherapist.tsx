// solPayments/src/components/MatchedTherapist.tsx - FIXED
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Play, ChevronLeft, ChevronRight, Info } from "lucide-react";
import Image from "next/image";
import { TMatchedTherapistData } from "@/api/types/therapist.types";
import axios from "@/api/axios"; // Import axios for API calls
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
  has_bookable_sessions?: boolean; // NEW: Clear signal for calendar coloring
};
type AvailabilityMonth = {
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

// New unified availability response structure
type Availability = {
  months: AvailabilityMonth[];
  therapist_info: {
    email: string;
    name: string;
    program: string;
    accepting_new_clients: boolean;
  };
  booking_info: {
    session_duration_minutes: number;
    payment_type: string;
    supported_payment_types: string[];
    timezone: string;
  };
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
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);
  const [hasRecordedSelection, setHasRecordedSelection] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showNoMatchesModal, setShowNoMatchesModal] = useState(false);
  const [showSpecificTherapistModal, setShowSpecificTherapistModal] = useState(false);

  /** New: cache monthly availability by therapist + month + tz (30s cache for live data) */
  const [availabilityCache, setAvailabilityCache] = useState<Record<string, Availability>>({});
  const [lastLiveRefresh, setLastLiveRefresh] = useState<Record<string, number>>({});
  
  /** Direct API response cache - stores the raw API data without transformation bullshit */
  const [apiResponseCache, setApiResponseCache] = useState<Record<string, any>>({});
  const [showTherapistSearchLoading, setShowTherapistSearchLoading] = useState(false);
  const [therapistSearchPreloader, setTherapistSearchPreloader] = useState<(() => Promise<void>) | null>(null);
  const [isSwitchingTherapists, setIsSwitchingTherapists] = useState(false);
  
  const currentTherapistData = therapistsList[currentIndex];
  const therapist = currentTherapistData?.therapist;
  const matchedSpecialtiesRaw = currentTherapistData?.matched_diagnoses_specialities || [];
  

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
  

  /** New: Fetch monthly availability JSON when therapist or month changes */
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth(); // 0-based
  const avKey = useMemo(() => {
    const email = therapist?.calendar_email || therapist?.email;
    if (!email) return "";
    return `${email}:${currentYear}:${currentMonth + 1}:${timezone}`;
  }, [therapist?.calendar_email, therapist?.email, currentYear, currentMonth, timezone]);

  // Lazy calendar loading - only load when user needs to see availability
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  
  const loadCalendarData = useCallback(async () => {
    const email = therapist?.calendar_email || therapist?.email;
    if (!email || !avKey || isLoadingCalendar || availabilityCache[avKey]) {
      console.log(`[Calendar Debug] 🛑 Skipping calendar load:`, {
        hasEmail: !!email,
        email: email,
        hasAvKey: !!avKey,
        avKey: avKey,
        isLoadingCalendar,
        hasCachedData: !!availabilityCache[avKey],
        cacheKeys: Object.keys(availabilityCache)
      });
      return;
    }

    setIsLoadingCalendar(true);
    
    const paymentType = getSelectedPaymentType();

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
      
      // Transform response to format expected by UI
      const transformedDays: { [key: number]: any } = {};
      
      // Calculate the 15-day booking window (same logic as calendar rendering)
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const minimumBookingTime = new Date(tomorrow);
      minimumBookingTime.setDate(minimumBookingTime.getDate() + 1);
      minimumBookingTime.setHours(0, 0, 0, 0); // Start of day after tomorrow
      
      const maximumBookingTime = new Date(now);
      maximumBookingTime.setDate(maximumBookingTime.getDate() + 15);
      maximumBookingTime.setHours(23, 59, 59, 999); // End of 15th day
      
      // Get all days in current month that are within the booking window
      const bookableDays = [];
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
      
      for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const date = new Date(currentYear, currentMonth, day);
        // Only include days within the booking window
        if (date.getTime() >= minimumBookingTime.getTime() && date.getTime() <= maximumBookingTime.getTime()) {
          bookableDays.push(day);
        }
      }
      
      console.log(`[Calendar Debug] 📅 Fetching availability for ${bookableDays.length} bookable days in month ${currentYear}-${currentMonth + 1}: [${bookableDays.join(', ')}]`);
      
      // Fetch availability for only the bookable days
      const dailyRequests = bookableDays.map(day => {
        const queryDate = new Date(currentYear, currentMonth, day);
        
        const url = new URL(`/therapists/${encodeURIComponent(email)}/availability/daily`, API_BASE);
        url.searchParams.set("date", queryDate.toISOString().split('T')[0]);
        url.searchParams.set("debug", "false");
        
        // Debug: Log the API call details
        console.log(`[API Debug] 🚀 Making API call:`, {
          url: url.toString(),
          therapistEmail: email,
          requestedDate: queryDate.toISOString().split('T')[0],
          dayInMonth: day,
          debug: false
        });
        
        return fetch(url.toString(), {
          cache: "no-store"
        }).then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            
            // Debug: Log the API response
            console.log(`[API Debug] 📥 API Response for day ${day}:`, {
              requestedDate: queryDate.toISOString().split('T')[0],
              responseData: data,
              availableSlots: data.available_slots,
              responseDateFromAPI: data.date,
              dayOfWeek: data.day_of_week,
              timezone: data.timezone,
              totalSlots: data.total_slots
            });
            
            // Store the raw API response directly - fuck the transformation layer
            const apiKey = `${email}:${data.date}`;
            setApiResponseCache(prev => ({
              ...prev,
              [apiKey]: data
            }));
            
            return { day, data, success: true };
          } else {
            console.warn(`[Calendar Debug] ⚠️ Failed to fetch day ${day}: ${response.status}`);
            return { day, data: null, success: false };
          }
        }).catch((error) => {
          console.warn(`[Calendar Debug] ⚠️ Error fetching day ${day}:`, error);
          return { day, data: null, success: false };
        });
      });
      
      // Wait for all daily requests to complete
      const startTime = performance.now();
      const results = await Promise.allSettled(dailyRequests);
      const endTime = performance.now();
      
      console.log(`[Calendar Debug] ⏱️ Fetched ${bookableDays.length} bookable days in ${Math.round(endTime - startTime)}ms`);
      
      // Process results
      let successfulDays = 0;
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success && result.value.data) {
          const { day, data } = result.value;
          
          // Handle new daily API response format
          if (data.available_slots && data.date && data.therapist_info) {
            const dayNumber = new Date(data.date).getDate();
            const dayDate = new Date(data.date);
            
            // Convert available_slots like ["10:00", "11:00", "12:00"] to slot objects
            const transformedSlots = data.available_slots.map((timeSlot: string) => {
              const [hours, minutes] = timeSlot.split(':').map(Number);
              const slotDateTime = new Date(dayDate);
              slotDateTime.setHours(hours, minutes, 0, 0);
              
              return {
                start: slotDateTime.toISOString(),
                end: timeSlot, // Keep original time for reference
                is_free: true
              };
            });
            
            transformedDays[dayNumber] = {
              date: data.date,
              day_of_week: data.day_of_week,
              slots: transformedSlots,
              sessions: [], // Initialize sessions array for compatibility
              summary: `${data.total_slots} slots available`
            };
            successfulDays++;
          }
        }
      });
      
      // Calendar data loaded successfully
      console.log(`[Calendar Debug] ✅ Successfully processed ${successfulDays} days with availability data`);
      
      setAvailabilityCache(prev => ({
        ...prev,
        [avKey]: {
          months: [{
            days: transformedDays,
            meta: {
              calendar_id: email,
              timezone,
              year: currentYear,
              month: currentMonth + 1,
              work_start: "07:00",
              work_end: "22:00", 
              slot_minutes: 60
            }
          }],
          therapist_info: {
            email: email,
            name: therapist?.intern_name || therapist?.program || 'Unknown',
            program: therapist?.program || 'Unknown',
            accepting_new_clients: true
          },
          booking_info: {
            session_duration_minutes: 60,
            payment_type: paymentType,
            supported_payment_types: ['out-of-pocket', 'insurance'],
            timezone: timezone
          }
        }
      }));
      
      setLastLiveRefresh(prev => ({ ...prev, [avKey]: Date.now() }));
      
      // Cache updated
      
    } catch (error) {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
      const errorDetails = {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        email: email,
        avKey: avKey,
        url: `${API_BASE}/therapists/${encodeURIComponent(email)}/availability/daily`,
        timestamp: new Date().toISOString()
      };
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[Calendar Debug] ⏱️ Timeout after 30 seconds:`, errorDetails);
      } else {
        console.error(`[Calendar Debug] ❌ Request failed:`, errorDetails);
      }
      
      setAvailabilityCache(prev => ({
        ...prev,
        [avKey]: {
          months: [],
          therapist_info: {
            email: email,
            name: therapist?.intern_name || '',
            program: therapist?.program || '',
            accepting_new_clients: false
          },
          booking_info: {
            session_duration_minutes: 60,
            payment_type: paymentType,
            supported_payment_types: ['cash_pay'],
            timezone: timezone
          }
        }
      }));
    } finally {
      setIsLoadingCalendar(false);
    }
  }, [avKey, timezone, therapist?.calendar_email, therapist?.email, therapist?.intern_name, therapist?.program, currentYear, currentMonth, getSelectedPaymentType, isLoadingCalendar, availabilityCache]);
  
  // Trigger lazy calendar loading when therapist is viewed
  useEffect(() => {
    // Reduced logging for calendar loading
    
    if (therapist && !isSwitchingTherapists) {
      // Load calendar data immediately
      loadCalendarData();
    }
  }, [therapist?.id, therapist, loadCalendarData, isSwitchingTherapists]);
  
  // Get previously viewed therapists (excluding current)
  const previouslyViewed = therapistsList.filter(t => 
    viewedTherapistIds.has(t.therapist.id) && t.therapist.id !== therapist?.id
  );
  
  const handleFindAnother = async () => {
    console.log(`[Find Another] Current therapist: ${therapist?.intern_name} (index ${currentIndex})`);
    console.log(`[Find Another] Total therapists available: ${therapistsList.length}`);
    
    // Check if this was a specific therapist request
    if (clientData?.matching_preference === 'requesting_specific') {
      console.log('[Find Another] This was a specific therapist request - showing modal');
      setShowSpecificTherapistModal(true);
      return;
    }
    
    // UNIFIED APPROACH: Always use LoadingScreen for consistent UX
    
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
    
    // If we need new therapists, still use LoadingScreen for consistency
    console.log(`[Find Another] Need new therapists - using LoadingScreen for consistent UX`);
    
    // Show loading screen immediately for consistent experience
    setShowTherapistSearchLoading(true);
    
    // Start the backend fetch in the background
    setTimeout(() => {
      handleFindAnotherFallback();
    }, 1000); // Small delay to show loading screen
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
      
      try {
        onFindAnother?.();
        // Reset selection state for new therapist
        setSelectedTimeSlot(null);
        setSelectedDateObj(null);
        setImageError({});
        setHasRecordedSelection(false);
        
        console.log(`[Find Another] ✅ Successfully fetched new therapists`);
      } catch (error) {
        console.error('[Find Another] ❌ Failed to fetch new therapists:', error);
      } finally {
        // Hide loading screen after backend fetch completes
        setShowTherapistSearchLoading(false);
        setTherapistSearchPreloader(null);
        console.log(`[Find Another] Loading screen hidden after backend fetch`);
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
      
      // Check if we've seen all therapists (about to cycle back to first one)
      if (nextIndex === 0 && viewedTherapistIds.size >= therapistsList.length) {
        console.log(`[Find Another] All ${therapistsList.length} therapists have been viewed, showing no matches modal`);
        setShowNoMatchesModal(true);
        setIsSwitchingTherapists(false);
        return;
      }
      
      console.log(`[Find Another] Fallback - Moving to: ${nextTherapist?.intern_name} (index ${nextIndex})`);
      
      setCurrentIndex(nextIndex);
      setSelectedTimeSlot(null);
      setSelectedDateObj(null);
      setImageError({});
      setHasRecordedSelection(false);
      
      // Hide loading screen and re-enable auto-selection
      setShowTherapistSearchLoading(false);
      setTherapistSearchPreloader(null);
      
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
    
    // FIXED TIMEZONE HANDLING - Create appointment datetime with proper client timezone
    console.log('🕐 FIXED TIMEZONE CONVERSION:');
    console.log(`  Client timezone: ${timezone} (${timezoneDisplay})`);
    console.log(`  Client state: ${clientData?.state || 'Unknown'}`);
    
    // BROWSER TIMEZONE VALIDATION - Cross-check with user's actual device timezone
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log(`  Browser detected timezone: ${browserTimezone}`);
    
    // Validate browser timezone matches selected state timezone
    if (browserTimezone !== timezone) {
      console.log(`  ⚠️ TIMEZONE MISMATCH WARNING:`);
      console.log(`    Selected state timezone: ${timezone}`);
      console.log(`    Browser detected timezone: ${browserTimezone}`);
      console.log(`    This could indicate:`);
      console.log(`    - User is traveling/VPN`);
      console.log(`    - User selected wrong state`);
      console.log(`    - Timezone mapping error`);
      
      // Check if they're at least in the same "timezone family"
      const stateMapping: { [key: string]: string[] } = {
        "America/New_York": ["America/New_York", "America/Detroit", "America/Kentucky/Louisville"],
        "America/Chicago": ["America/Chicago", "America/Menominee", "America/North_Dakota/Center"],
        "America/Denver": ["America/Denver", "America/Boise"],
        "America/Los_Angeles": ["America/Los_Angeles"],
        "America/Phoenix": ["America/Phoenix"],
        "America/Anchorage": ["America/Anchorage"],
        "Pacific/Honolulu": ["Pacific/Honolulu"]
      };
      
      let timezonesMatch = false;
      for (const [baseTimezone, variants] of Object.entries(stateMapping)) {
        if (variants.includes(browserTimezone) && variants.includes(timezone)) {
          timezonesMatch = true;
          console.log(`    ✅ Timezone variants match (${baseTimezone} family)`);
          break;
        }
      }
      
      if (!timezonesMatch) {
        console.log(`    ⚠️ Timezone families don't match - booking may be incorrect`);
      }
    } else {
      console.log(`  ✅ Browser timezone matches selected state timezone`);
    }
    
    let datetime: string;
    
    try {
      // Method 1: Create the datetime string and let the backend handle timezone conversion
      // This is more reliable than frontend timezone calculations which are error-prone
      const appointmentDateTimeString = `${yyyy}-${mm}-${dd}T${timeIn24Hour}:00`;
      
      // Create metadata to help backend properly handle timezone
      const bookingMetadata = {
        selectedDate: selectedDateObj.toDateString(),
        selectedTimeSlot: selectedTimeSlot,
        selectedTimeIn24Hour: timeIn24Hour,
        clientTimezone: timezone,
        clientTimezoneDisplay: timezoneDisplay,
        clientState: clientData?.state || '',
        originalDateTimeString: appointmentDateTimeString
      };
      
      console.log(`  Booking metadata:`, bookingMetadata);
      
      // Calculate timezone offset for the client's timezone
      
      // Get the proper timezone offset string
      const offsetMinutes = -getTherapistOffsetMinutes(timezone);
      const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
      const offsetMins = Math.abs(offsetMinutes) % 60;
      const offsetSign = offsetMinutes >= 0 ? '+' : '-';
      const timezoneOffsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
      
      // Create the final datetime with explicit timezone
      datetime = `${appointmentDateTimeString}${timezoneOffsetString}`;
      
      console.log(`  Original datetime string: ${appointmentDateTimeString}`);
      console.log(`  Client timezone offset: ${timezoneOffsetString}`);
      console.log(`  Final datetime with timezone: ${datetime}`);
      
      // Verification: Parse back and verify it shows the correct time
      const verificationDate = new Date(datetime);
      const verificationInClientTz = verificationDate.toLocaleString("en-US", { 
        timeZone: timezone,
        weekday: 'short',
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      });
      
      // Also get just the time to compare
      const verificationTimeOnly = verificationDate.toLocaleString("en-US", { 
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      console.log(`  ✅ VERIFICATION:`);
      console.log(`  Selected: ${selectedDateObj.toDateString()} at ${selectedTimeSlot}`);
      console.log(`  Parsed back: ${verificationInClientTz}`);
      console.log(`  Time only: ${verificationTimeOnly} (should match ${selectedTimeSlot})`);
      
      // Critical verification: ensure the hour matches
      const selectedHourNum = hour;
      const isAM = selectedTimeSlot.toLowerCase().includes('am');
      const isPM = selectedTimeSlot.toLowerCase().includes('pm');
      
      let expectedHour = selectedHourNum;
      if (isPM && selectedHourNum !== 12) expectedHour += 12;
      if (isAM && selectedHourNum === 12) expectedHour = 0;
      
      // Get actual hour in client timezone
      const actualHourInClientTz = parseInt(verificationDate.toLocaleString("en-US", { 
        timeZone: timezone, 
        hour: 'numeric', 
        hour12: false 
      }));
      
      if (Math.abs(actualHourInClientTz - expectedHour) <= 1) { // Allow 1 hour tolerance for edge cases
        console.log(`  ✅ Hour verification PASSED: Expected ${expectedHour}, got ${actualHourInClientTz}`);
      } else {
        console.log(`  ⚠️ Hour verification WARNING: Expected ${expectedHour}, got ${actualHourInClientTz}`);
        console.log(`  This may indicate a timezone conversion issue`);
      }
      
    } catch (error) {
      console.error('❌ Error in fixed timezone conversion:', error);
      
      // Fallback: Send without timezone and include metadata for backend processing
      const appointmentDateTimeString = `${yyyy}-${mm}-${dd}T${timeIn24Hour}:00`;
      
      console.log('🔄 Using fallback: sending datetime without timezone for backend processing');
      console.log(`  Backend will handle timezone conversion using client state: ${clientData?.state}`);
      
      // Send the raw datetime and let backend apply timezone based on client state
      datetime = appointmentDateTimeString;
      
      console.log(`  Fallback datetime: ${datetime}`);
    }
    
    // Close the confirmation modal
    setShowConfirmationModal(false);
    
    // Only call the parent callback - let the main component handle the booking
    // This eliminates the duplicate API call that was causing double emails
    if (onBookSession) {
      onBookSession(currentTherapistData, datetime);
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
    // Normalize 15-day limit to end of 14th day
    const maximumBookingDate = new Date(now);
    maximumBookingDate.setDate(maximumBookingDate.getDate() + 15);
    maximumBookingDate.setHours(23, 59, 59, 999); // End of 15th day
    
    // Don't navigate to a month that's entirely beyond the 15-day window
    if (next.getTime() > maximumBookingDate.getTime()) {
      console.log(`[Calendar Navigation] Cannot navigate beyond 15-day booking window`);
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
  const availabilityResponse = availabilityCache[avKey];
  const emailForSlots = therapist?.calendar_email || therapist?.email || '';

  // Availability cache check

  // Helper function to extract current month's availability data from the new structure
  const getCurrentMonthAvailability = () => {
    if (!availabilityResponse?.months) {
      console.log(`[Calendar Debug] 🚫 No availability response or months:`, {
        hasResponse: !!availabilityResponse,
        hasMonths: !!availabilityResponse?.months,
        responseStructure: availabilityResponse ? Object.keys(availabilityResponse) : []
      });
      return null;
    }
    
    console.log(`[Calendar Debug] 🔍 Searching months:`, {
      totalMonths: availabilityResponse.months.length,
      monthsMeta: availabilityResponse.months.map(m => ({
        year: m.meta?.year,
        month: m.meta?.month,
        daysCount: Object.keys(m.days || {}).length
      })),
      targetYear: currentYear,
      targetMonth: currentMonth + 1
    });
    
    // Find the month that matches current year and month
    const targetMonth = availabilityResponse.months.find(m => 
      m.meta?.year === currentYear && m.meta?.month === (currentMonth + 1)
    );
    
    console.log(`[Calendar Debug] 🎯 Month search result:`, {
      foundMatch: !!targetMonth,
      targetMonth: targetMonth ? {
        year: targetMonth.meta?.year,
        month: targetMonth.meta?.month,
        daysCount: Object.keys(targetMonth.days || {}).length,
        sampleDays: Object.keys(targetMonth.days || {}).slice(0, 3)
      } : null
    });
    
    return targetMonth || null;
  };

  // Extract current month's availability (maintains backward compatibility)
  const availability = getCurrentMonthAvailability();
  
  console.log(`[Calendar Debug] ✅ Final availability:`, {
    hasAvailability: !!availability,
    daysCount: availability?.days ? Object.keys(availability.days).length : 0,
    sampleDays: availability?.days ? Object.keys(availability.days).slice(0, 5) : []
  });

  // Enhanced therapist data with availability API response (if available)
  const enhancedTherapistData = useMemo(() => {
    const base = therapist || {};
    const apiTherapistInfo = availabilityResponse?.therapist_info;
    const apiBookingInfo = availabilityResponse?.booking_info;
    
    if (apiTherapistInfo && apiBookingInfo) {
      return {
        ...base,
        // Merge API data with existing therapist data
        program: apiTherapistInfo.program || base.program,
        accepting_new_clients: apiTherapistInfo.accepting_new_clients ?? base.accepting_new_clients,
        // Add session info from API response
        session_duration_minutes: apiBookingInfo.session_duration_minutes,
        supported_payment_types: apiBookingInfo.supported_payment_types,
        api_payment_type: apiBookingInfo.payment_type,
        api_timezone: apiBookingInfo.timezone
      };
    }
    
    return base;
  }, [therapist, availabilityResponse]);


  // Count available slots for a particular day - FIXED: Use same data source as slotsForDay
  const getDayAvailableCount = useCallback((date: Date): number => {
    const dayNum = date.getDate();
    const emailForSlots = therapist?.calendar_email || therapist?.email || '';

    // Check if the date is in the currently cached month
    const dateYear = date.getFullYear();
    const dateMonth = date.getMonth();
    const isSameMonth = (dateYear === currentYear && dateMonth === currentMonth);

    // FIXED: 24-hour minimum lead time check - tomorrow is the minimum booking time
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Start of tomorrow

    const minimumBookingTime = tomorrow; // FIXED: Tomorrow is the minimum booking time
    const dateEndOfDay = new Date(date);
    dateEndOfDay.setHours(23, 59, 59, 999); // End of the selected day

    // 15-day advance limit - normalized to 15 days from today at end of day
    const maximumBookingTime = new Date(now);
    maximumBookingTime.setDate(maximumBookingTime.getDate() + 15);
    maximumBookingTime.setHours(23, 59, 59, 999); // End of 15th day
    const dateStartOfDay = new Date(date);
    dateStartOfDay.setHours(0, 0, 0, 0); // Start of the selected day

    // If the entire day is within the 24-hour lead time or beyond 15 days, return 0
    if (dateEndOfDay.getTime() < minimumBookingTime.getTime() || dateStartOfDay.getTime() > maximumBookingTime.getTime()) {
      return 0;
    }

    // FIXED: Use the same data source as slotsForDay - check daily API cache first
    const selectedDateStr = date.toISOString().split('T')[0];
    const apiKey = `${emailForSlots}:${selectedDateStr}`;
    const apiResponse = apiResponseCache[apiKey];

    if (apiResponse && apiResponse.available_slots) {
      // Use the daily API response data - same as slotsForDay
      const rawSlots = (apiResponse.available_slots || []).map((timeSlot: string) => {
        const [hours, minutes] = timeSlot.split(':').map(Number);
        const slotDateTime = new Date(date);
        slotDateTime.setHours(hours, minutes, 0, 0);
        return slotDateTime;
      });

      // Apply the same business hours filtering as slotsForDay
      const filteredSlots = rawSlots.filter((slot: Date) => {
        const hour = slot.getHours();
        return hour >= 7 && hour < 22; // 7 AM - 10 PM EST
      });

      // Apply the same time window filtering as slotsForDay
      const filteredSlotsAfterTimeWindow = filteredSlots.filter((slot: Date) => {
        return slot.getTime() >= minimumBookingTime.getTime() && slot.getTime() <= maximumBookingTime.getTime();
      });

      // Apply therapist category restrictions (same as slotsForDay)
      const therapistCategory = getTherapistCategory(therapist);
      let finalSlots = filteredSlotsAfterTimeWindow;

      if (therapistCategory === 'Associate Therapist') {
        finalSlots = finalSlots.filter((slot: Date) => slot.getMinutes() === 0);
      }

      // 🐛 DEBUG: Add detailed logging for September 15th and 21st
      if (dayNum === 15 || dayNum === 21) {
        console.log(`🔍 [CALENDAR DEBUG - PRIMARY] Sept ${dayNum}th getDayAvailableCount:`, {
          dayNum,
          selectedDateStr,
          apiKey,
          hasApiResponse: !!apiResponse,
          rawSlotsFromAPI: rawSlots.length,
          afterBusinessHours: filteredSlots.length,
          afterTimeWindowFilter: filteredSlotsAfterTimeWindow.length,
          afterTherapistRestrictions: finalSlots.length,
          minimumBookingTime: minimumBookingTime.toLocaleString(),
          maximumBookingTime: maximumBookingTime.toLocaleString(),
          therapistCategory,
          finalCount: finalSlots.length,
          dataSource: 'daily-api-cache',
          rawApiSlots: apiResponse?.available_slots || 'none'
        });
      }

      return finalSlots.length;
    }

    // Fallback to monthly data if daily API data not available
    if (isSameMonth && availability?.days && availability.days[dayNum]) {
      const payload = availability.days[dayNum];
      const sessions = payload.sessions ?? [];

      // FIXED: Use has_bookable_sessions when available, with graceful fallback
      // This provides backward compatibility during deployment transition
      const hasBookableSessions = payload.has_bookable_sessions;

      let availableSessions;

      if (hasBookableSessions !== undefined) {
        // New backend with has_bookable_sessions field - use it reliably
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Calendar] Day ${dayNum}: Using new backend has_bookable_sessions=${hasBookableSessions}, sessions=${sessions.length}`);
        }
        if (!hasBookableSessions) {
          return 0; // Backend confirms no bookable sessions
        }
        availableSessions = sessions; // Use only actual sessions
      } else {
        // Fallback for older backend without has_bookable_sessions field
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Calendar] Day ${dayNum}: Using fallback logic, sessions=${sessions.length}, slots=${(payload.slots || []).filter(s => s.is_free).length}`);
        }
        availableSessions = sessions.length > 0 ? sessions : (payload.slots || []).filter(s => s.is_free).map(s => ({ start: s.start, end: s.end }));

        if (availableSessions.length === 0) {
          return 0; // No availability found
        }
      }
      
      // Apply 24-hour lead time and 15-day advance limit filter  
      // Use the normalized maximumBookingTime already calculated above
      const normalizedMaxBookingTime = new Date(now);
      normalizedMaxBookingTime.setDate(normalizedMaxBookingTime.getDate() + 14);
      normalizedMaxBookingTime.setHours(23, 59, 59, 999);
      availableSessions = availableSessions.filter(session => {
        const sessionTime = new Date(session.start);
        const hour = sessionTime.getHours();
        // Filter for business hours (7 AM - 10 PM) AND booking window
        return sessionTime.getTime() >= minimumBookingTime.getTime() && 
               sessionTime.getTime() <= normalizedMaxBookingTime.getTime() &&
               hour >= 7 && hour < 22;
      });
      
      // Apply hourly restriction for Associate Therapists
      const therapistCategory = getTherapistCategory(therapist);
      if (therapistCategory === 'Associate Therapist') {
        availableSessions = availableSessions.filter(session => {
          const sessionTime = new Date(session.start);
          return sessionTime.getMinutes() === 0; // Only hourly slots
        });
      }
      
      // 🐛 DEBUG: Add detailed logging for September 21st
      if (dayNum === 21) {
        console.log(`🔍 [CALENDAR DEBUG - FALLBACK] Sept 21st getDayAvailableCount:`, {
          dayNum,
          isSameMonth,
          hasAvailabilityData: !!availability?.days,
          hasBookableSessions: payload.has_bookable_sessions,
          rawSessions: sessions.length,
          afterTimeWindowFilter: availableSessions.length,
          minimumBookingTime: minimumBookingTime.toLocaleString(),
          maximumBookingTime: normalizedMaxBookingTime.toLocaleString(),
          therapistCategory,
          finalCount: availableSessions.length,
          dataSource: 'monthly-fallback'
        });
      }

      return availableSessions.length;
    }
    
    // For dates in different months, return 0 (will need to fetch availability when calendar changes)
    return 0;
  }, [availability?.days, currentYear, currentMonth, therapist, getTherapistCategory, apiResponseCache]);

  // Auto-select first available date in current month only (never navigate calendar)
  useEffect(() => {
    if (!selectedDateObj && availability?.days && !isSwitchingTherapists) {
      const now = new Date();
      // Normalize to day after tomorrow at start of day
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const minimumBookingDate = new Date(tomorrow);
      minimumBookingDate.setDate(minimumBookingDate.getDate() + 1);
      minimumBookingDate.setHours(0, 0, 0, 0); // Start of day after tomorrow
      
      // Normalize to 15 days from today at end of day  
      const maximumBookingDate = new Date(now);
      maximumBookingDate.setDate(maximumBookingDate.getDate() + 15);
      maximumBookingDate.setHours(23, 59, 59, 999); // End of 15th day
      
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
  }, [availability?.days, selectedDateObj, currentYear, currentMonth, getDayAvailableCount, isSwitchingTherapists]);

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

    // Use the direct API response data - bypass the broken transformation layer completely
    const selectedDateStr = selectedDateObj.toISOString().split('T')[0];
    const apiKey = `${emailForSlots}:${selectedDateStr}`;
    const apiResponse = apiResponseCache[apiKey];
    
    if (apiResponse && apiResponse.available_slots) {
      dataSource = 'direct-api-response';
      // Convert API slots like ["17:00", "18:00"] directly to Date objects
      rawSlots = apiResponse.available_slots.map((timeSlot: string) => {
        const [hours, minutes] = timeSlot.split(':').map(Number);
        const slotDateTime = new Date(selectedDateObj);
        slotDateTime.setHours(hours, minutes, 0, 0);
        return slotDateTime;
      });
      
      console.log(`[API Direct] 🎯 Using API response directly for ${selectedDateStr}:`, {
        apiKey,
        availableSlots: apiResponse.available_slots,
        convertedToSlots: rawSlots.length,
        slotTimes: rawSlots.map(s => s.toLocaleTimeString())
      });
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

    // 🔧 FIXED: 24-HOUR MINIMUM LEAD TIME & 15-DAY ADVANCE LIMIT: Only show slots within booking window
    const now = new Date();
    // FIXED: Normalize to tomorrow at start of day for minimum (not day after tomorrow)
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const minimumBookingTime = tomorrow; // FIXED: Tomorrow is the minimum booking time
    
    // Normalize to 15 days from today at end of day for maximum
    const maximumBookingTime = new Date(now);
    maximumBookingTime.setDate(maximumBookingTime.getDate() + 15);
    maximumBookingTime.setHours(23, 59, 59, 999); // End of 15th day
    
    const beforeTimeWindowFilter = filteredSlots.length;
    filteredSlots = filteredSlots.filter(dt => {
      return dt.getTime() >= minimumBookingTime.getTime() && dt.getTime() <= maximumBookingTime.getTime();
    });
    
    const removedByTimeWindowFilter = beforeTimeWindowFilter - filteredSlots.length;
    if (removedByTimeWindowFilter > 0) {
      console.log(`[Booking Time Window Filter] ${therapist?.intern_name}: Filtered out ${removedByTimeWindowFilter} slots outside 24hr-15day window (${minimumBookingTime.toLocaleString()} to ${maximumBookingTime.toLocaleString()})`);
    }

    // Get therapist category for restrictions
    const therapistCategory = getTherapistCategory(therapist);

    // 🐛 DEBUG: Add detailed logging for September 21st
    if (selectedDateObj.getDate() === 21 && selectedDateObj.getMonth() === 8) { // September = month 8
      // Also check what getDayAvailableCount returns for comparison
      const countFromAvailabilityFunction = getDayAvailableCount(selectedDateObj);

      console.log(`🔍 [TIME SLOTS DEBUG] Sept 21st slotsForDay:`, {
        selectedDate: selectedDateObj.toDateString(),
        dataSource,
        rawSlotsCount: rawSlots.length,
        afterBusinessHours: filteredSlots.length + removedByTimeWindowFilter,
        afterTimeWindowFilter: filteredSlots.length,
        removedByTimeWindow: removedByTimeWindowFilter,
        minimumBookingTime: minimumBookingTime.toLocaleString(),
        maximumBookingTime: maximumBookingTime.toLocaleString(),
        now: now.toLocaleString(),
        therapistCategory,
        COMPARISON: {
          getDayAvailableCountResult: countFromAvailabilityFunction,
          mismatch: countFromAvailabilityFunction !== filteredSlots.length,
          monthlyVsDaily: `Monthly: ${countFromAvailabilityFunction}, Daily: ${filteredSlots.length}`,
          dataSourceConflict: countFromAvailabilityFunction > 0 && filteredSlots.length === 0
        }
      });
    }

    // ASSOCIATE THERAPIST RESTRICTION: Only allow on-the-hour slots (12pm, 1pm, 2pm, NO in-betweens)
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
  }, [availability?.days, selectedDateObj, emailForSlots, timezoneDisplay, timezone, therapist, getTherapistCategory]);

  const formatTimeLabel = (date: Date) => {
    const timeString = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
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
          console.log(`[Find Another] ✅ Preload complete, completing immediately`);
          // Complete immediately when preload is done
          handleCompletion();
        })
        .catch((error) => {
          console.error(`[Find Another] ❌ Preload failed:`, error);
          // Complete immediately even if preload fails
          handleCompletion();
        });
    } else {
      // No preloader, complete immediately
      handleCompletion();
    }
    
    return () => {
      mounted = false;
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
        minDisplayTime={500} // Quick loading
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
                      {/* Therapist category and session info */}
                      <div className="text-sm text-gray-600 mt-1 mb-3" style={{ fontFamily: 'var(--font-inter)' }}>
                        <p>{getTherapistCategory(enhancedTherapistData)}</p>
                      </div>
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
                  <p className="text-xs text-gray-600 mb-2" style={{ fontFamily: 'var(--font-inter)' }}>
                    {clientData?.state ? 
                      `${String(clientData.state).toUpperCase()} Time (${timezoneDisplay})` : 
                      `Local Time (${timezoneDisplay})`
                    }
                  </p>
                  
                  {/* Live Data Status Debug Info (only in development) */}
                  {process.env.NODE_ENV === 'development' && (
                    <p className="text-xs text-green-600 mb-2 font-mono" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                      {(() => {
                        const lastRefresh = lastLiveRefresh[avKey];
                        const cacheAge = lastRefresh ? Math.round((Date.now() - lastRefresh) / 1000) : null;
                        const hasCache = !!availabilityCache[avKey];
                        const programType = therapist?.program || 'Unknown';
                        
                        return `LIVE DATA | ${hasCache ? `Fresh: ${cacheAge !== null ? cacheAge + 's' : 'N/A'}` : 'Loading...'} | ${programType} | ${avKey.split(':')[0]}`;
                      })()}
                    </p>
                  )}

                  {/* Calendar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium" style={{ fontFamily: 'var(--font-inter)' }}>{monthLabel}</h4>
                      <div className="flex gap-2">
                        <button 
                          onClick={goPrevMonth} 
                          className="p-1 hover:bg-gray-100 rounded border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                          aria-label="Previous month"
                          disabled={(() => {
                            const now = new Date();
                            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                            const calendarMonthStart = new Date(currentYear, currentMonth, 1);
                            // Only allow going back if we're viewing a future month (not the current month)
                            return calendarMonthStart.getTime() <= currentMonthStart.getTime();
                          })()}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={goNextMonth} 
                          className="p-1 hover:bg-gray-100 rounded border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                          aria-label="Next month"
                          disabled={(() => {
                            const now = new Date();
                            // Normalize to 15 days from today at end of day
                            const maximumBookingDate = new Date(now);
                            maximumBookingDate.setDate(maximumBookingDate.getDate() + 15);
                            maximumBookingDate.setHours(23, 59, 59, 999);
                            const nextMonth = new Date(currentYear, currentMonth + 1, 1);
                            return nextMonth.getTime() > maximumBookingDate.getTime();
                          })()}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="relative border border-[#5C3106] rounded-2xl p-2 shadow-[1px_1px_0_#5C3106]" style={{ fontFamily: 'var(--font-inter)' }}>
                      {/* Calendar Loading Overlay */}
                      {isLoadingCalendar && (
                        <div className="absolute inset-0 bg-yellow-50/90 backdrop-blur-sm rounded-2xl z-10 flex items-center justify-center">
                          <div className="text-center">
                            {/* Sun-like radial dial animation */}
                            <div className="relative w-12 h-12 mx-auto mb-3">
                              {/* Outer rays */}
                              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
                                {Array.from({ length: 8 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="absolute w-0.5 h-4 bg-yellow-600/70 rounded-full"
                                    style={{
                                      top: '0px',
                                      left: '50%',
                                      transformOrigin: '50% 24px',
                                      transform: `translateX(-50%) rotate(${i * 45}deg)`,
                                    }}
                                  />
                                ))}
                              </div>
                              
                              {/* Inner rays - counter rotating */}
                              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
                                {Array.from({ length: 6 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="absolute w-0.5 h-3 bg-yellow-500/50 rounded-full"
                                    style={{
                                      top: '2px',
                                      left: '50%',
                                      transformOrigin: '50% 22px',
                                      transform: `translateX(-50%) rotate(${i * 60}deg)`,
                                    }}
                                  />
                                ))}
                              </div>
                              
                              {/* Central sun core */}
                              <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-yellow-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
                            </div>
                            
                            <p className="text-xs text-yellow-700/80 font-medium" style={{ fontFamily: 'var(--font-inter)' }}>
                              Loading availability...
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1" style={{ fontFamily: 'var(--font-inter)' }}>
                        {['m','t','w','t','f','s','s'].map((d, i) => (
                          <div key={`dh-${i}`} className="py-1 uppercase tracking-wide">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center text-xs" style={{ fontFamily: 'var(--font-inter)' }}>
                        {calendarCells.map((cell) => {
                          const selected = selectedDateObj ? isSameDay(cell.date, selectedDateObj) : false;
                          const now = new Date();
                          
                          // FIXED: Normalize minimum time to tomorrow at start of day
                          const tomorrow = new Date(now);
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          tomorrow.setHours(0, 0, 0, 0);

                          const minimumBookingTime = tomorrow; // FIXED: Tomorrow is the minimum booking time
                          
                          // Normalize maximum time to 15 days from today at end of day
                          const maximumBookingTime = new Date(now);
                          maximumBookingTime.setDate(maximumBookingTime.getDate() + 15);
                          maximumBookingTime.setHours(23, 59, 59, 999); // End of 15th day
                          
                          const isToday = isSameDay(cell.date, now);
                          const isWithinLeadTime = cell.date.getTime() < minimumBookingTime.getTime();
                          const isBeyond14Days = cell.date.getTime() > maximumBookingTime.getTime();
                          const isOutsideBookingWindow = isWithinLeadTime || isBeyond14Days;
                          
                          let bgClass = 'bg-white';
                          let isUnavailable = false;
                          let textClass = '';
                          let isLoading = false;
                          
                          if (cell.inMonth) {
                            if (isOutsideBookingWindow) {
                              // Dates outside booking window (within 24hrs or beyond 15 days) are greyed out and disabled
                              bgClass = 'bg-gray-100';
                              textClass = 'text-gray-400';
                              isUnavailable = true;
                            } else {
                              // Check if this date's availability is still loading
                              const isCurrentMonthDate = cell.date.getFullYear() === currentYear && cell.date.getMonth() === currentMonth;
                              
                              // Loading state: using lazy loading state
                              const hasAvailabilityData = availability?.days;
                              
                              isLoading = isCurrentMonthDate && (isLoadingCalendar || (!hasAvailabilityData && !availabilityCache[avKey]));
                              
                              if (isLoading) {
                                // Loading state - shimmer animation with blue tint
                                bgClass = 'bg-gradient-to-r from-blue-100 via-blue-50 to-blue-100 bg-[length:200%_100%]';
                                textClass = 'text-blue-600 animate-pulse';
                                isUnavailable = false; // Not unavailable, just loading
                              } else {
                                // Future dates within booking window use availability color-coding
                                const count = getDayAvailableCount(cell.date);
                                const color = count > 5 ? 'green' : count > 2 ? 'yellow' : 'red';
                                isUnavailable = count === 0; // Only unavailable when no slots exist

                                // 🐛 DEBUG: Add logging for September 15th and 21st calendar coloring
                                if (cell.date.getDate() === 15 || cell.date.getDate() === 21) {
                                  console.log(`🎨 [CALENDAR COLOR DEBUG] Sept ${cell.date.getDate()}th:`, {
                                    count,
                                    color,
                                    isUnavailable,
                                    willBeGrey: isUnavailable && color === 'red',
                                    cell: cell.date.toDateString(),
                                    avKey,
                                    hasAvailabilityCache: !!availabilityCache[avKey],
                                    availabilityDataSource: availability ? 'cache' : 'none',
                                    dataInCache: availability?.days?.[cell.date.getDate()] || 'not found'
                                  });
                                }

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
                          }

                          const getTitle = () => {
                            if (!cell.inMonth) return undefined;
                            if (isOutsideBookingWindow) {
                              if (isToday) {
                                return 'Today - earliest booking is 24 hours from now';
                              } else if (isWithinLeadTime) {
                                return 'Within 24-hour minimum lead time - not available';
                              } else if (isBeyond14Days) {
                                return 'Beyond 15-day advance limit - not available';
                              } else {
                                return 'Past date - not available';
                              }
                            }
                            if (isLoading) {
                              return 'Loading availability...';
                            }
                            return `Available slots: ${getDayAvailableCount(cell.date)}`;
                          };

                          return (
                            <button
                              key={cell.key}
                              onClick={() => {
                                if (cell.inMonth && !isUnavailable && !isLoading) {
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
                              disabled={!cell.inMonth || isUnavailable || isLoading}
                              title={getTitle()}
                              className={`py-2 rounded-lg transition-colors border relative ${
                                selected
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : cell.inMonth
                                    ? isLoading
                                      ? `${bgClass} ${textClass} cursor-wait border-blue-200 animate-[shimmer_1.5s_ease-in-out_infinite]`
                                      : isUnavailable
                                        ? `${bgClass} ${textClass} cursor-not-allowed opacity-75 border-transparent`
                                        : `${bgClass} hover:bg-yellow-50 border-transparent`
                                    : 'bg-white text-gray-300 cursor-not-allowed opacity-60 border-transparent'
                              }`}
                            >
                              <span className={`relative ${isUnavailable && cell.inMonth && !isOutsideBookingWindow ? 'relative' : ''}`}>
                                {cell.day}
                                {/* Loading animation for dates that are fetching availability */}
                                {isLoading && cell.inMonth && (
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="inline-block w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="inline-block w-1 h-1 bg-blue-500 rounded-full animate-bounce mx-0.5" style={{ animationDelay: '150ms' }}></span>
                                    <span className="inline-block w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                  </span>
                                )}
                                {/* Red line for unavailable dates with slots */}
                                {isUnavailable && cell.inMonth && !isOutsideBookingWindow && !isLoading && (
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="block w-full h-0.5 bg-red-500 transform rotate-45 absolute"></span>
                                  </span>
                                )}
                                {/* X mark for dates outside booking window */}
                                {isOutsideBookingWindow && cell.inMonth && !isLoading && (
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
                    ) : selectedDateObj ? (
                      // No slots available for selected date
                      <div className="col-span-2 flex flex-col items-center justify-center py-8 text-center">
                        <div className="text-gray-400 mb-2">
                          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                          No available time slots
                        </p>
                        <p className="text-gray-400 text-xs mt-1" style={{ fontFamily: 'var(--font-inter)' }}>
                          Try selecting a different date
                        </p>
                      </div>
                    ) : (
                      // Loading state - show while fetching slots
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
                      disabled={showTherapistSearchLoading}
                    >
                      {showTherapistSearchLoading ? 'Finding New Therapist...' : 'Find Another Therapist →'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {previouslyViewed.map((therapistData) => (
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
        bookingInfo={availabilityResponse?.booking_info}
        therapistInfo={availabilityResponse?.therapist_info}
      />
      
      {/* No Additional Matches Modal */}
      <Dialog open={showNoMatchesModal} onOpenChange={setShowNoMatchesModal}>
        <DialogContent className="max-w-md mx-auto bg-white border border-[#5C3106] rounded-3xl shadow-[1px_1px_0_#5C3106]">
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="flex items-center justify-center gap-2 text-xl sm:text-2xl text-gray-800" 
                        style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
              <Info className="w-5 h-5 text-blue-600" />
              No Additional Matches Available
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 text-center px-2">
            <p className="text-base sm:text-lg text-gray-800 font-medium" 
               style={{ fontFamily: 'var(--font-inter)' }}>
              We couldn't find any more therapists that match your preferences
            </p>
            
            <p className="text-sm text-gray-600" 
               style={{ fontFamily: 'var(--font-inter)' }}>
              We're actively expanding our clinical team quickly to cover a wider range of preferences
            </p>
            
            <div className="flex flex-col gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowNoMatchesModal(false);
                  // Option A: Return to preference selection (implementation needed)
                  console.log('Change Preferences clicked - returning to preferences page');
                }}
                className="w-full py-3 px-6 bg-white border border-[#5C3106] rounded-2xl text-gray-800 text-base font-medium hover:bg-[#F5E8D1] transition-colors shadow-[1px_1px_0_#5C3106]"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                Change Preferences
              </Button>
              
              <Button
                onClick={() => {
                  setShowNoMatchesModal(false);
                  // Option B: Keep all preferences but set gender to "No Preference" and re-search
                  console.log('View All Genders clicked - setting gender preference to no preference and re-searching');
                  if (onFindAnother) {
                    // This would need to pass updated preferences to the parent
                    onFindAnother();
                  }
                }}
                className="w-full py-3 px-6 bg-yellow-100 border border-[#5C3106] rounded-2xl text-gray-800 text-base font-medium hover:bg-yellow-200 transition-colors shadow-[1px_1px_0_#5C3106]"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                View All Genders
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Specific Therapist Redirect Modal */}
      <Dialog open={showSpecificTherapistModal} onOpenChange={setShowSpecificTherapistModal}>
        <DialogContent className="max-w-md mx-auto bg-white border border-[#5C3106] rounded-3xl shadow-[1px_1px_0_#5C3106]">
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="flex items-center justify-center gap-2 text-xl sm:text-2xl text-gray-800" 
                        style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
              <Info className="w-5 h-5 text-blue-600" />
              No Additional Matches
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 text-center px-2">
            <p className="text-base sm:text-lg text-gray-800 font-medium" 
               style={{ fontFamily: 'var(--font-inter)' }}>
              We're going to help you find other therapists who might be a good fit
            </p>
            
            <p className="text-sm text-gray-600" 
               style={{ fontFamily: 'var(--font-inter)' }}>
              We need you to answer a couple questions about what you're looking for in a therapist, and we'll match you with new options.
            </p>
            
            <div className="flex flex-col gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowSpecificTherapistModal(false);
                  // Redirect to main flow to restart with match_me preference
                  // Store current state and payment type for the new flow
                  const currentState = clientData?.state || '';
                  const currentPaymentType = clientData?.payment_type || 'cash_pay';
                  
                  // Store in localStorage so the new flow can pick up the preferences
                  localStorage.setItem('redirectFromSpecificTherapist', 'true');
                  localStorage.setItem('redirectState', currentState);
                  localStorage.setItem('redirectPaymentType', currentPaymentType);
                  
                  console.log('[Specific Therapist Modal] Redirecting to restart flow with match_me');
                  window.location.href = '/';
                }}
                className="w-full py-3 px-6 bg-[#5C3106] text-white rounded-2xl text-base font-medium hover:bg-[#4A2805] transition-colors"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                Continue to Find Therapists
              </Button>
              
              <Button
                onClick={() => setShowSpecificTherapistModal(false)}
                variant="outline"
                className="w-full py-3 px-6 bg-white border border-[#5C3106] rounded-2xl text-gray-800 text-base font-medium hover:bg-[#F5E8D1] transition-colors shadow-[1px_1px_0_#5C3106]"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                Stay with Current Therapist
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 