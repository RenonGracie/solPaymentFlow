// solPayments/src/components/MatchedTherapist.tsx - FIXED
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Play, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { TMatchedTherapistData } from "@/api/types/therapist.types";
import type { SlotsResponse } from "@/api/services";
import { useTherapistsService } from "@/api/services";
import axios from "@/api/axios"; // Import axios for API calls

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
}

export default function MatchedTherapist({ 
  therapistsList,
  clientData,
  initialIndex = 0,
  onBack,
  onBookSession,
}: MatchedTherapistProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(new Date());
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [viewedTherapistIds, setViewedTherapistIds] = useState<Set<string>>(new Set());
  const [showVideo, setShowVideo] = useState(false);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const [fetchedSlots, setFetchedSlots] = useState<Record<string, string[]>>({});
  const [fetchingSlots, setFetchingSlots] = useState<Record<string, boolean>>({});
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);
  const [hasRecordedSelection, setHasRecordedSelection] = useState(false);

  /** New: cache monthly availability by therapist + month + tz */
  const [availabilityCache, setAvailabilityCache] = useState<Record<string, Availability>>({});
  
  const currentTherapistData = therapistsList[currentIndex];
  const therapist = currentTherapistData?.therapist;
  const matchedSpecialtiesRaw = currentTherapistData?.matched_diagnoses_specialities || [];
  
  const { slots: slotsRequest } = useTherapistsService();

  // Get payment type from client data, localStorage, or query param
  const getSelectedPaymentType = (): 'insurance' | 'cash_pay' => {
    // First check client data
    if (clientData?.payment_type === 'insurance' || clientData?.payment_type === 'cash_pay') {
      return clientData.payment_type;
    }
    // Then query param
    if (typeof window !== 'undefined') {
      const qp = new URLSearchParams(window.location.search).get('payment_type');
      if (qp === 'cash_pay' || qp === 'insurance') return qp;
      try {
        const fromLs = window.localStorage.getItem('sol_payment_type');
        if (fromLs === 'cash_pay' || fromLs === 'insurance') return fromLs;
      } catch {}
    }
    return 'insurance';
  };

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
        console.log(`✅ Recorded therapist selection: ${therapist.intern_name}`);
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
  }, [therapist?.calendar_email, therapist?.email, clientData?.response_id, clientData?.state, timezone, slotsRequest]);

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

        // Log available sessions
        const byDay: Record<string, string[]> = {};
        Object.entries(data.days || {}).forEach(([dayStr, payload]) => {
          const sessions = (payload.sessions ?? payload.slots.filter(s => s.is_free).map(s => ({ start: s.start, end: s.end })));
          byDay[dayStr] = sessions.map(s => s.start);
        });
        console.log(`[availability] ${email} ${currentYear}-${String(currentMonth+1).padStart(2,"0")} (${timezoneDisplay}/${timezone})`, byDay);

        setAvailabilityCache(prev => ({ ...prev, [avKey]: data }));
      } catch (e) {
        console.warn("Availability fetch error", e);
      }
    };
    fetchAvailability();
    return () => controller.abort();
  }, [avKey, timezone, currentYear, currentMonth]);
  
  // Get previously viewed therapists (excluding current)
  const previouslyViewed = therapistsList.filter(t => 
    viewedTherapistIds.has(t.therapist.id) && t.therapist.id !== therapist?.id
  );
  
  const handleFindAnother = () => {
    const nextIndex = (currentIndex + 1) % therapistsList.length;
    setCurrentIndex(nextIndex);
    setSelectedTimeSlot(null);
    setImageError({});
    setHasRecordedSelection(false); // Reset for new therapist
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
    if (!selectedTimeSlot || !selectedDateObj || !clientData?.response_id) return;
    
    const yyyy = selectedDateObj.getFullYear();
    const mm = String(selectedDateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDateObj.getDate()).padStart(2, '0');
    const normalizedTime = selectedTimeSlot.replace(/\s/g, '');
    const datetime = `${yyyy}-${mm}-${dd}T${convertTo24Hour(normalizedTime)}:00`;
    
    try {
      // Call the appointments endpoint directly
      const response = await axios.post('/appointments', {
        client_response_id: clientData.response_id,
        therapist_email: therapist?.email,
        therapist_name: therapist?.intern_name,
        datetime: datetime,
        payment_type: getSelectedPaymentType(),
      });
      
      console.log('✅ Appointment booked:', response.data);
      
      // Call the parent callback if provided
      if (onBookSession) {
        onBookSession(currentTherapistData, datetime);
      }
    } catch (error) {
      console.error('❌ Failed to book appointment:', error);
      // Still call parent callback as fallback
      if (onBookSession) {
        onBookSession(currentTherapistData, datetime);
      }
    }
  };
  
  const convertTo24Hour = (time: string) => {
    const [hour, period] = time.split(/(?=[ap]m)/i);
    const parts = hour.split(':');
    let h = parts[0];
    const m = parts[1] || '00';
    
    if (period.toLowerCase() === 'pm' && h !== '12') h = String(Number(h) + 12);
    if (period.toLowerCase() === 'am' && h === '12') h = '00';
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  };

  // Function to handle image URL - S3 presigned URLs should be used directly
  const getImageUrl = (imageLink: string | null | undefined): string => {
    if (!imageLink) return '';
    if (imageLink.startsWith('http://') || imageLink.startsWith('https://')) {
      return imageLink;
    }
    console.warn('Image link is not a full URL:', imageLink);
    return '';
  };

  // Map program/cohort to display category
  const getTherapistCategory = (t: { program?: string; cohort?: string } | undefined): string => {
    const pt = getSelectedPaymentType();
    if (pt === 'cash_pay') return 'Graduate Therapist';
    if (pt === 'insurance') return 'Associate Therapist';
    const hay = `${t?.program ?? ''} ${t?.cohort ?? ''}`.toLowerCase();
    const gradHints = ['graduate', 'grad', 'intern', 'practicum', 'student', 'trainee'];
    return gradHints.some(k => hay.includes(k)) ? 'Graduate Therapist' : 'Associate Therapist';
  };

  // Function to extract YouTube video ID from URL
  const extractYouTubeId = (url: string): string => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : '';
  };

  // Handle image loading error
  const handleImageError = (therapistId: string) => {
    console.error(`Failed to load image for therapist ${therapistId}`);
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

  // Check if video URL is valid
  const welcomeVideoLink = therapist?.welcome_video_link ?? '';
  const hasValidVideo = welcomeVideoLink.startsWith('http://') || welcomeVideoLink.startsWith('https://');

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
    setSelectedDateObj(new Date(next.getFullYear(), next.getMonth(), 1));
  };
  const goNextMonth = () => {
    const next = new Date(currentYear, currentMonth + 1, 1);
    setCalendarDate(next);
    setSelectedDateObj(new Date(next.getFullYear(), next.getMonth(), 1));
  };

  // Pull availability for this therapist + month (if fetched)
  const availability = availabilityCache[avKey];
  const emailForSlots = therapist?.calendar_email || therapist?.email || '';

  // Fallback: derive per-day available slot counts from legacy ISO slots
  const legacyDayCount = useMemo(() => {
    const map: Record<number, number> = {};
    const isoList = (fetchedSlots[emailForSlots] || therapist?.available_slots || []) as string[];
    for (const iso of isoList) {
      const dt = new Date(iso);
      if (dt.getFullYear() === currentYear && dt.getMonth() === currentMonth) {
        const day = dt.getDate();
        map[day] = (map[day] ?? 0) + 1;
      }
    }
    return map;
  }, [fetchedSlots, therapist?.available_slots, emailForSlots, currentYear, currentMonth]);

  // Count available slots for a particular day
  const getDayAvailableCount = (date: Date): number => {
    const dayNum = date.getDate();
    if (availability?.days && availability.days[dayNum]) {
      const payload = availability.days[dayNum];
      const sessions = payload.sessions ?? [];
      if (sessions.length > 0) return sessions.length;
      const freeSlots = (payload.slots || []).filter(s => s.is_free);
      return freeSlots.length;
    }
    return legacyDayCount[dayNum] ?? 0;
  };

  // Build time slots for the selected day
  const slotsForDay = useMemo(() => {
    if (!selectedDateObj) return [];

    // Prefer new availability JSON
    if (availability?.days) {
      const dayNum = selectedDateObj.getDate();
      const payload = availability.days[dayNum];
      if (payload) {
        const sessions = (payload.sessions && payload.sessions.length > 0)
          ? payload.sessions.map(s => new Date(s.start))
          : payload.slots.filter(s => s.is_free).map(s => new Date(s.start));
        return sessions
          .filter(dt => isSameDay(dt, selectedDateObj))
          .sort((a, b) => a.getTime() - b.getTime());
      }
    }

    // Fallback to legacy ISO list
    const calendarAvailableSlotsLegacy = (fetchedSlots[emailForSlots] || therapist?.available_slots || []) as string[];
    return (calendarAvailableSlotsLegacy || [])
      .map((iso: string) => new Date(iso))
      .filter((dt: Date) => isSameDay(dt, selectedDateObj))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());
  }, [availability?.days, selectedDateObj, emailForSlots, fetchedSlots, therapist?.available_slots]);

  const formatTimeLabel = (date: Date) =>
    date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

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
        <h2 className="very-vogue-title text-2xl sm:text-3xl text-gray-800">
          We Found the <em>Best Therapist</em> for You
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
                    {therapist.image_link && !imageError[therapist.id] && (
                      <img
                        src={getImageUrl(therapist.image_link)}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-50"
                        onError={() => {}}
                      />
                    )}
                    <Play className="w-7 h-7 md:w-8 md:h-8 text-white relative z-10" />
                  </button>
                )}
                <CardContent className="p-4 md:p-6 md:h-full md:overflow-y-auto">
                  {/* Therapist Header */}
                  <div className="flex flex-col md:flex-row items-start gap-4 mb-6">
                    <div className="flex-shrink-0">
                      {therapist.image_link && !imageError[therapist.id] ? (
                        <img
                          src={getImageUrl(therapist.image_link)}
                          alt={therapist.intern_name}
                          className="w-24 h-24 rounded-full object-cover"
                          onError={() => handleImageError(therapist.id)}
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-2xl text-gray-500">
                            {therapist.intern_name?.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 w-full">
                      <h2 className="very-vogue-title text-3xl text-gray-800">{therapist.intern_name}</h2>
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
                    <h3 className="very-vogue-title text-2xl text-gray-800">Skills and Experience</h3>
                    
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
                  <h3 className="very-vogue-title text-2xl text-gray-800 mb-1">Book Your First Session</h3>
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
                        <button onClick={goNextMonth} className="p-1 hover:bg-gray-100 rounded border border-gray-200" aria-label="Next month">
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
                          let bgClass = 'bg-white';
                          let isUnavailable = false;
                          
                          if (cell.inMonth) {
                            const count = getDayAvailableCount(cell.date);
                            const color = count > 5 ? 'green' : count > 2 ? 'yellow' : 'red';
                            isUnavailable = color === 'red';
                            bgClass =
                              color === 'red' ? 'bg-red-100' :
                              color === 'yellow' ? 'bg-yellow-100' :
                              'bg-green-100';
                          }

                          return (
                            <button
                              key={cell.key}
                              onClick={() => cell.inMonth && !isUnavailable && setSelectedDateObj(cell.date)}
                              disabled={!cell.inMonth || isUnavailable}
                              title={cell.inMonth ? `Available slots: ${getDayAvailableCount(cell.date)}` : undefined}
                              className={`py-2 rounded-lg transition-colors border relative ${
                                selected
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : cell.inMonth
                                    ? isUnavailable
                                      ? `${bgClass} cursor-not-allowed opacity-75 border-transparent`
                                      : `${bgClass} hover:bg-yellow-50 border-transparent`
                                    : 'bg-white text-gray-300 cursor-not-allowed opacity-60 border-transparent'
                              }`}
                            >
                              <span className={isUnavailable && cell.inMonth ? 'relative' : ''}>
                                {cell.day}
                                {isUnavailable && cell.inMonth && (
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="block w-full h-0.5 bg-red-500 transform rotate-45 absolute"></span>
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
                      ['1:00pm', '2:00pm', '5:00pm', '6:00pm', '7:00pm', '8:00pm'].map((time) => (
                        <button
                          key={`time-${time}`}
                          onClick={() => setSelectedTimeSlot(time)}
                          className={`p-3 rounded-full border transition-all shadow-[1px_1px_0_#5C3106] ${
                            selectedTimeSlot === time
                              ? 'border-yellow-400 bg-yellow-50'
                              : 'border-[#5C3106] bg-white hover:bg-yellow-50'
                          }`}
                          style={{ fontFamily: 'var(--font-inter)' }}
                        >
                          {time}
                        </button>
                      ))
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
                    <p className="very-vogue-title text-xl text-gray-800 mb-2">It's Okay to Keep Looking…</p>
                    <Button
                      variant="outline"
                      className="w-full rounded-full border-2 border-[#5C3106]"
                      onClick={handleFindAnother}
                    >
                      Find Another Therapist →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Previously Viewed Therapists section remains the same... */}
          {previouslyViewed.length > 0 && (
            <div className="mt-6">
              <h3 className="very-vogue-title text-2xl text-gray-800 mb-4">Previously Viewed Therapists</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {previouslyViewed.slice(0, 4).map((therapistData) => (
                  <button
                    key={`prev-${therapistData.therapist.id}`}
                    onClick={() => handleSelectPreviousTherapist(therapistData.therapist.id)}
                    className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all text-center"
                  >
                    {therapistData.therapist.image_link && !imageError[therapistData.therapist.id] ? (
                      <img
                        src={getImageUrl(therapistData.therapist.image_link)}
                        alt={therapistData.therapist.intern_name}
                        className="w-20 h-20 rounded-full object-cover mx-auto mb-2"
                        onError={() => handleImageError(therapistData.therapist.id)}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-2">
                        <span className="text-xl text-gray-500">
                          {therapistData.therapist.intern_name?.charAt(0)}
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

      {/* Video Modal remains the same... */}
      {showVideo && hasValidVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowVideo(false)}>
          <div className="bg-white rounded-lg p-4 max-w-4xl w-full mx-4" onClick={e => e.stopPropagation()}>
            {therapist.welcome_video_link?.includes('youtube.com') || therapist.welcome_video_link?.includes('youtu.be') ? (
              <iframe
                src={`https://www.youtube.com/embed/${extractYouTubeId(therapist.welcome_video_link)}`}
                className="w-full h-[500px] rounded"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            ) : therapist.welcome_video_link?.includes('vimeo.com') ? (
              <iframe
                src={therapist.welcome_video_link.replace('vimeo.com', 'player.vimeo.com/video')}
                className="w-full h-[500px] rounded"
                allowFullScreen
              />
            ) : (
              <video
                src={therapist.welcome_video_link}
                className="w-full h-[500px] rounded"
                controls
                autoPlay
              />
            )}
            <Button onClick={() => setShowVideo(false)} className="mt-4 w-full">
              Close Video
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}