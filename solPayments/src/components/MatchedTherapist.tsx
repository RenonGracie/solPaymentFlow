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
  const [hasAttemptedFallback, setHasAttemptedFallback] = useState(false);
  
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
    
    // Show the search modal first
    setShowSearchModal(true);
    
    // Wait for 2 seconds (modal duration) before proceeding
    setTimeout(() => {
      setShowSearchModal(false);
      
      // If we have multiple therapists already loaded, cycle through them first
      if (therapistsList.length > 1) {
        const nextIndex = (currentIndex + 1) % therapistsList.length;
        const nextTherapist = therapistsList[nextIndex]?.therapist;
        
        console.log(`[Find Another] Moving to: ${nextTherapist?.intern_name} (index ${nextIndex})`);
        
        setCurrentIndex(nextIndex);
        setSelectedTimeSlot(null);
        setSelectedDateObj(null);
        setImageError({});
        setHasRecordedSelection(false);
        setHasAttemptedFallback(false); // Reset fallback flag when switching therapists
        return;
      }
      
      // Continue with existing fallback logic if needed
      handleFindAnotherFallback();
    }, 2000);
  };
  
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
        setHasAttemptedFallback(false); // Reset fallback flag when fetching new therapists
      } catch (error) {
        console.error('[Find Another] Failed to fetch new therapists:', error);
      } finally {
        setIsFindingAnother(false);
      }
    } else {
      // Fallback: cycle through existing list (original behavior)
      const nextIndex = (currentIndex + 1) % therapistsList.length;
      const nextTherapist = therapistsList[nextIndex]?.therapist;
      
      console.log(`[Find Another] Fallback - Moving to: ${nextTherapist?.intern_name} (index ${nextIndex})`);
      
      setCurrentIndex(nextIndex);
      setSelectedTimeSlot(null);
      setSelectedDateObj(null);
      setImageError({});
      setHasRecordedSelection(false);
    }
  };
  
  const handleSelectPreviousTherapist = (therapistId: string) => {
    const therapistIndex = therapistsList.findIndex(t => t.therapist.id === therapistId);
    if (therapistIndex !== -1) {
      setCurrentIndex(therapistIndex);
      setSelectedTimeSlot(null);
      setImageError({});
      setHasRecordedSelection(false); // Reset for new therapist
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
    
    console.log('==========================================');
    
    const yyyy = selectedDateObj.getFullYear();
    const mm = String(selectedDateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDateObj.getDate()).padStart(2, '0');
    const normalizedTime = selectedTimeSlot.replace(/\s/g, '');
    
    console.log('🕐 BOOKING TIME DEBUG:');
    console.log(`  Selected time slot: "${selectedTimeSlot}"`);
    console.log(`  Normalized time: "${normalizedTime}"`);
    
    // Create a proper Date object with timezone information
    const timeIn24Hour = convertTo24Hour(normalizedTime);
    console.log(`  Converted to 24-hour: "${timeIn24Hour}"`);
    
    const [hour, minute] = timeIn24Hour.split(':').map(Number);
    console.log(`  Parsed hour: ${hour}, minute: ${minute}`);
    
    // Create Date object in the therapist's timezone (not browser timezone)
    // This ensures appointments are scheduled at the correct time regardless of where the client is located
    const therapistTimezoneOffset = getTherapistTimezoneOffset(timezone);
    const utcDateTime = new Date(yyyy, selectedDateObj.getMonth(), selectedDateObj.getDate(), hour, minute, 0);
    
    // Adjust for the difference between browser timezone and therapist timezone
    const browserOffset = new Date().getTimezoneOffset(); // Browser's offset from UTC (in minutes)
    const therapistOffsetMinutes = getTherapistOffsetMinutes(timezone); // Therapist's offset from UTC (in minutes)
    const offsetDifference = browserOffset - therapistOffsetMinutes; // Difference in minutes
    
    // Adjust the UTC time by the offset difference
    utcDateTime.setMinutes(utcDateTime.getMinutes() + offsetDifference);
    
    // Format as ISO string with therapist's timezone offset
    const datetime = utcDateTime.toISOString().slice(0, -1) + therapistTimezoneOffset;
    
    console.log('🕐 TIMEZONE FIX DEBUG:');
    console.log(`  Therapist timezone: ${timezone}`);
    console.log(`  Selected time: ${selectedTimeSlot}`);
    console.log(`  Original construction: ${yyyy}-${mm}-${dd}T${timeIn24Hour}:00`);
    console.log(`  Browser offset: ${browserOffset} minutes`);
    console.log(`  Therapist offset: ${therapistOffsetMinutes} minutes`);
    console.log(`  Offset difference: ${offsetDifference} minutes`);
    console.log(`  Therapist timezone offset: ${therapistTimezoneOffset}`);
    console.log(`  UTC DateTime: ${utcDateTime}`);
    console.log(`  Final datetime with timezone: ${datetime}`);
    
    // Close the confirmation modal
    setShowConfirmationModal(false);
    
    // Only call the parent callback - let the main component handle the booking
    // This eliminates the duplicate API call that was causing double emails
    if (onBookSession) {
      onBookSession(currentTherapistData, datetime);
    }
  };
  
  const getTherapistTimezoneOffset = (timezone: string) => {
    // Get timezone offset for the therapist's timezone and format as +/-HH:MM
    try {
      const now = new Date();
      const therapistTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
      const utcTime = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
      const offsetMinutes = Math.round((therapistTime.getTime() - utcTime.getTime()) / (1000 * 60));
      
      const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
      const offsetMins = Math.abs(offsetMinutes) % 60;
      const sign = offsetMinutes >= 0 ? '+' : '-';
      return `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
    } catch (error) {
      console.error('Error calculating therapist timezone offset:', error);
      return '-05:00'; // Default to EST
    }
  };

  const getTherapistOffsetMinutes = (timezone: string): number => {
    // Get the therapist's timezone offset in minutes from UTC
    try {
      const now = new Date();
      const therapistTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
      const utcTime = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
      return Math.round((therapistTime.getTime() - utcTime.getTime()) / (1000 * 60));
    } catch (error) {
      console.error('Error calculating therapist offset minutes:', error);
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
  
  // Helper function to find earliest available date in a given month
  const findEarliestAvailableDateInMonth = (year: number, month: number): Date | null => {
    const today = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const checkDate = new Date(year, month, day);
      
      // Skip if it's today or earlier
      if (checkDate <= today) continue;
      
      const availableCount = getDayAvailableCount(checkDate);
      if (availableCount > 0) {
        console.log(`[Calendar Navigation] Found earliest available date in ${year}-${month + 1}: ${checkDate.toDateString()} (${availableCount} slots)`);
        return checkDate;
      }
    }
    
    console.log(`[Calendar Navigation] No availability found in ${year}-${month + 1}`);
    return null;
  };
  
  const goPrevMonth = () => {
    const next = new Date(currentYear, currentMonth - 1, 1);
    setCalendarDate(next);
    
    // Find earliest available date in the new month
    const earliestAvailable = findEarliestAvailableDateInMonth(next.getFullYear(), next.getMonth());
    if (earliestAvailable) {
      setSelectedDateObj(earliestAvailable);
      console.log(`[Calendar Navigation] Auto-selected earliest date in previous month: ${earliestAvailable.toDateString()}`);
    } else {
      // Clear selection if no availability in this month
      setSelectedDateObj(null);
      console.log(`[Calendar Navigation] No availability in previous month, clearing date selection`);
    }
  };
  
  const goNextMonth = () => {
    const next = new Date(currentYear, currentMonth + 1, 1);
    const now = new Date();
    const maximumBookingDate = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days from now
    
    // Don't navigate to a month that's entirely beyond the 14-day window
    if (next.getTime() > maximumBookingDate.getTime()) {
      console.log(`[Calendar Navigation] Cannot navigate beyond 14-day booking window`);
      return;
    }
    
    setCalendarDate(next);
    
    // Find earliest available date in the new month
    const earliestAvailable = findEarliestAvailableDateInMonth(next.getFullYear(), next.getMonth());
    if (earliestAvailable) {
      setSelectedDateObj(earliestAvailable);
      console.log(`[Calendar Navigation] Auto-selected earliest date in next month: ${earliestAvailable.toDateString()}`);
    } else {
      // Clear selection if no availability in this month
      setSelectedDateObj(null);
      console.log(`[Calendar Navigation] No availability in next month, clearing date selection`);
    }
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
    
    // 24-hour minimum lead time check
    const now = new Date();
    const minimumBookingTime = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours from now
    const dateEndOfDay = new Date(date);
    dateEndOfDay.setHours(23, 59, 59, 999); // End of the selected day
    
    // 14-day advance limit check
    const maximumBookingTime = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days from now
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
      const maximumBookingTime = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days from now
      availableSessions = availableSessions.filter(session => {
        const sessionTime = new Date(session.start);
        return sessionTime.getTime() >= minimumBookingTime.getTime() && sessionTime.getTime() <= maximumBookingTime.getTime();
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
        
        // Apply filters
        const maximumBookingTime = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days from now
        let filteredSlots = daySlots.filter(dt => 
          dt.getTime() >= minimumBookingTime.getTime() && dt.getTime() <= maximumBookingTime.getTime()
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

  // Auto-select first available future date and navigate to correct month
  useEffect(() => {
    if (!selectedDateObj && (availability?.days || Object.keys(fetchedSlots).length > 0)) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0); // Start of tomorrow
      
      const minimumBookingDate = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours from now
      
      console.log(`[Calendar] Auto-selection starting from minimum booking time (24hr lead): ${minimumBookingDate.toLocaleString()}`);
      console.log(`[Calendar] Tomorrow is: ${tomorrow.toDateString()}`);
      
      // Search across multiple months for the first available date
      let foundAvailableDate: Date | null = null;
      
      // Only search within the 14-day booking window
      const maximumBookingDate = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days from now
      
      console.log(`[Calendar] Searching within 14-day booking window: ${minimumBookingDate.toLocaleDateString()} to ${maximumBookingDate.toLocaleDateString()}`);
      
      // Search day by day within the 14-day window, starting from tomorrow if it meets the 24hr requirement
      let currentSearchDate = new Date(Math.max(tomorrow.getTime(), minimumBookingDate.getTime()));
      
      // Check if tomorrow is unavailable and should be skipped
      if (tomorrow.getTime() >= minimumBookingDate.getTime()) {
        const tomorrowAvailability = getDayAvailableCount(tomorrow);
        if (tomorrowAvailability === 0) {
          console.log(`[Calendar] Tomorrow (${tomorrow.toDateString()}) has no available slots, auto-skipping to next available date`);
        } else {
          console.log(`[Calendar] Tomorrow (${tomorrow.toDateString()}) has ${tomorrowAvailability} available slots`);
        }
      } else {
        console.log(`[Calendar] Tomorrow (${tomorrow.toDateString()}) is within 24-hour lead time, starting search from ${currentSearchDate.toDateString()}`);
      }
      
      while (currentSearchDate.getTime() <= maximumBookingDate.getTime() && !foundAvailableDate) {
        const availableCount = getDayAvailableCount(currentSearchDate);
        if (availableCount > 0) {
          foundAvailableDate = new Date(currentSearchDate);
          console.log(`[Calendar] Found first available date: ${foundAvailableDate.toDateString()} (${availableCount} slots)${foundAvailableDate.toDateString() !== tomorrow.toDateString() ? ' - skipped tomorrow as it was unavailable' : ''}`);
          break;
        }
        
        // Move to next day (create new date instead of mutating)
        currentSearchDate = new Date(currentSearchDate.getTime() + (24 * 60 * 60 * 1000));
      }
      
      if (!foundAvailableDate) {
        console.log(`[Calendar] No availability found within 14-day booking window`);
      }
      
      if (foundAvailableDate) {
        // Auto-navigate to the month with availability
        const targetYear = foundAvailableDate.getFullYear();
        const targetMonth = foundAvailableDate.getMonth();
        
        console.log(`[Calendar] Auto-navigating to month with availability: ${foundAvailableDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
        
        // Update calendar view to the month with availability
        if (targetYear !== currentYear || targetMonth !== currentMonth) {
          console.log(`[Calendar] Updating calendar view from ${currentYear}-${currentMonth + 1} to ${targetYear}-${targetMonth + 1}`);
          setCalendarDate(new Date(targetYear, targetMonth, 1));
        }
        
        // Select the available date
        setSelectedDateObj(foundAvailableDate);
        console.log(`[Calendar] Auto-selected: ${foundAvailableDate.toDateString()}`);
      } else if (!hasAttemptedFallback) {
        console.warn(`[Calendar] No availability found in next 3 months for ${therapist?.intern_name}`);
        
        // Only attempt fallback once to prevent infinite loop
        setHasAttemptedFallback(true);
        
        // Navigate to next month as fallback (away from current month with no availability)
        const nextMonth = new Date(currentYear, currentMonth + 1, 1);
        console.log(`[Calendar] Fallback: navigating to next month ${nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
        setCalendarDate(nextMonth);
        
        // Clear any invalid date selection when falling back
        setSelectedDateObj(null);
        console.log(`[Calendar] Cleared date selection during fallback navigation`);
      } else {
        console.warn(`[Calendar] Already attempted fallback. No further calendar navigation to prevent infinite loop.`);
      }
    }
  }, [availability?.days, fetchedSlots, selectedDateObj, currentYear, currentMonth, getDayAvailableCount, therapist?.intern_name, hasAttemptedFallback]);

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
    const minimumBookingTime = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours from now
    const maximumBookingTime = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days from now
    
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

  if (!therapist) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
      {/* Header */}
      <div className="relative h-12 sm:h-20 md:h-24 overflow-hidden flex-shrink-0">
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
        <h2 className="very-vogue-title text-2xl sm:text-3xl md:text-4xl text-gray-800">
          A Therapist We Think You'll <em>Click With</em>
        </h2>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 md:px-6 py-4">
        <div className="h-full flex flex-col max-w-7xl mx-auto">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 min-h-0">
            {/* Left Column - Therapist Details */}
            <div className="col-span-1 md:col-span-7 flex flex-col min-h-0">
              <Card className="md:flex-1 overflow-visible md:overflow-hidden bg-white border border-[#5C3106] rounded-3xl shadow-[1px_1px_0_#5C3106] relative">
                {hasValidVideo && (
                  <button
                    onClick={() => setShowVideo(!showVideo)}
                    className="absolute top-3 right-3 md:top-4 md:right-4 w-56 h-32 md:w-64 md:h-40 bg-gray-900 rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors overflow-hidden shadow-[1px_1px_0_#5C3106] z-10"
                  >
                    {therapist.image_link && !imageError[therapist.id] && getImageUrl(therapist.image_link) && (
                      <img
                        src={getImageUrl(therapist.image_link)}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-30"
                        onError={() => console.log(`[Video Preview] Image failed for ${therapist.intern_name}`)}
                        loading="lazy"
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-center gap-2">
                      <Play className="w-8 h-8 md:w-10 md:h-10 text-white" />
                      <span className="text-white text-xs font-medium">Watch Video</span>
                    </div>
                  </button>
                )}
                <CardContent className="p-4 md:p-6 md:h-full md:overflow-y-auto">
                  {/* Therapist Header */}
                  <div className="flex flex-col md:flex-row items-start gap-4 mb-6">
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
                          <span className="text-2xl font-medium text-gray-600">
                            {therapist.intern_name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 w-full">
                      <h2 className="very-vogue-title text-2xl sm:text-3xl text-gray-800">{therapist.intern_name}</h2>
                      <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>{getTherapistCategory(therapist)}</p>
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
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
                    <h3 className="very-vogue-title text-xl sm:text-2xl text-gray-800">Skills and Experience</h3>
                    
                    {/* Specialties */}
                    <div>
                      <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'var(--font-inter)' }}>Specializes in</p>
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
                                  onClick={() => setShowAllSpecialties(true)}
                                  className="px-3 py-1 rounded-full text-xs border shadow-[1px_1px_0_#5C3106] bg-white border-gray-300 text-blue-700"
                                  style={{ fontFamily: 'var(--font-inter)' }}
                                >
                                  Show {remaining}+ more
                                </button>
                              )}
                              {showAllSpecialties && nonMatched.length > 3 && (
                                <button
                                  onClick={() => setShowAllSpecialties(false)}
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
                        <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'var(--font-inter)' }}>Therapeutic orientation</p>
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
                        <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'var(--font-inter)' }}>Has experience working with religions</p>
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
                  <h3 className="very-vogue-title text-xl sm:text-2xl text-gray-800 mb-1">Book Your First Session</h3>
                  <p className="text-sm text-gray-600 mb-4" style={{ fontFamily: 'var(--font-inter)' }}>
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
                            const maximumBookingDate = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
                            const nextMonth = new Date(currentYear, currentMonth + 1, 1);
                            return nextMonth.getTime() > maximumBookingDate.getTime();
                          })()}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="border border-[#5C3106] rounded-2xl p-2 shadow-[1px_1px_0_#5C3106]" style={{ fontFamily: 'var(--font-inter)' }}>
                      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
                        {['m','t','w','t','f','s','s'].map((d, i) => (
                          <div key={`dh-${i}`} className="py-1 uppercase tracking-wide">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center text-sm">
                        {calendarCells.map((cell) => {
                          const selected = selectedDateObj ? isSameDay(cell.date, selectedDateObj) : false;
                          const now = new Date();
                          const minimumBookingTime = new Date(now.getTime() + (24 * 60 * 60 * 1000));
                          const maximumBookingTime = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
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
                              isUnavailable = color === 'red';
                              bgClass =
                                color === 'red' ? 'bg-red-100' :
                                color === 'yellow' ? 'bg-yellow-100' :
                                'bg-green-100';
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
                              onClick={() => cell.inMonth && !isUnavailable && setSelectedDateObj(cell.date)}
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
                            onClick={() => setSelectedTimeSlot(normalized)}
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
                      ['1:00pm', '2:00pm', '5:00pm', '6:00pm', '7:00pm', '8:00pm'].map((time) => {
                        const normalized = time.replace(/\s/g, '').toLowerCase();
                        return (
                          <button
                            key={`time-${time}`}
                            onClick={() => setSelectedTimeSlot(normalized)}
                            className={`p-3 rounded-full border transition-all shadow-[1px_1px_0_#5C3106] ${
                              selectedTimeSlot === normalized
                                ? 'border-yellow-400 bg-yellow-50'
                                : 'border-[#5C3106] bg-white hover:bg-yellow-50'
                            }`}
                            style={{ fontFamily: 'var(--font-inter)' }}
                          >
                            {time}
                          </button>
                        );
                      })
                    )}
                  </div>

                  <Button
                    className="w-full bg-yellow-100 hover:bg-yellow-200 text-gray-800 rounded-full mb-6"
                    onClick={handleBookSession}
                    disabled={!selectedTimeSlot || !selectedDateObj}
                  >
                    Book {getSessionDuration()}-Min Session →
                  </Button>

                  {/* Find Another Therapist */}
                  <div className="text-center mt-auto">
                    <p className="very-vogue-title text-lg sm:text-xl text-gray-800 mb-2">It's Okay to Keep Looking…</p>
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
              <h3 className="very-vogue-title text-xl sm:text-2xl text-gray-800 mb-4">Previously Viewed Therapists</h3>
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
                        <span className="text-xl font-medium text-gray-600">
                          {therapistData.therapist.intern_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <p className="font-medium text-sm">{therapistData.therapist.intern_name}</p>
                    <p className="text-xs text-gray-500">{therapistData.therapist.program}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simple Video Modal */}
      {showVideo && hasValidVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowVideo(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-medium text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                  Welcome from {therapist?.intern_name}
                </h3>
                <button 
                  onClick={() => setShowVideo(false)}
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
                        <p className="mt-3 text-sm text-gray-600 text-center">
                          If the video doesn't load, <a href={videoAnalysis.embedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">click here to view it directly</a>.
                        </p>
                      </div>
                    );
                  
                  default:
                    return (
                      <div className="text-center py-12">
                        <p className="text-gray-600 mb-4">Unable to display this video format.</p>
                        <a 
                          href={welcomeVideoLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
      />
    </div>
  );
}