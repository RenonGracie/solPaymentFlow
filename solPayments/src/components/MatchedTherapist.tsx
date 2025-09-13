// solPayments/src/components/MatchedTherapist.tsx - FIXED WITH DAILY API CALLS
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // Unused imports
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { TMatchedTherapistData } from "@/api/types/therapist.types";
import axios from "@/api/axios";
import { TherapistConfirmationModal } from "@/components/TherapistConfirmationModal";

/** NEW: Daily availability response type matching the API exactly */
type DailyAvailabilityData = {
  date: string;
  available_slots: string[];
  total_slots: number;
  has_bookable_sessions: boolean;
  therapist_info: any;
  fetched_at: number;
};

// Core interfaces
interface ClientSignupData {
  response_id?: string;
  client_name?: string;
  payment_type?: 'insurance' | 'cash_pay';
  state?: string;
}

interface MatchedTherapistProps {
  therapistsList: TMatchedTherapistData[];
  initialIndex: number;
  onBack: () => void;
  clientData: ClientSignupData | null;
  timezone?: string;
  timezoneDisplay?: string;
}

// Helper functions
const isSameDay = (date1: Date, date2: Date) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

const formatTime = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':');
  const hour12 = parseInt(hours) % 12 || 12;
  const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minutes} ${ampm}`;
};

// Get therapist category helper
const getTherapistCategory = (therapist: any) => {
  if (!therapist?.program) return 'Graduate Therapist';
  return therapist.program === 'Limited Permit' ? 'Associate Therapist' : 'Graduate Therapist';
};

export default function MatchedTherapist({
  therapistsList,
  initialIndex,
  onBack,
  clientData,
  // timezone = 'America/New_York', // Unused
  timezoneDisplay = 'EST'
}: MatchedTherapistProps) {
  // Basic state
  const [currentIndex] = useState(initialIndex); // setCurrentIndex removed as unused
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  // NEW: Daily availability cache - stores individual day responses
  const [dailyAvailabilityCache, setDailyAvailabilityCache] = useState<Record<string, DailyAvailabilityData>>({});
  const [loadingDays, setLoadingDays] = useState<Set<string>>(new Set());

  const currentTherapistData = therapistsList[currentIndex];
  const therapist = currentTherapistData?.therapist;

  // Get payment type from client data - UNUSED
  // const getSelectedPaymentType = useCallback((): 'insurance' | 'cash_pay' => {
  //   if (clientData?.payment_type === 'insurance' || clientData?.payment_type === 'cash_pay') {
  //     return clientData.payment_type;
  //   }
  //   return 'cash_pay'; // default
  // }, [clientData]);

  // Calendar date helpers
  // const currentYear = calendarDate.getFullYear(); // Unused
  // const currentMonth = calendarDate.getMonth(); // 0-based // Unused
  const monthLabel = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // NEW: Load individual day availability using daily API endpoint exactly as specified
  const loadDayAvailability = useCallback(async (date: Date) => {
    const email = therapist?.calendar_email || therapist?.email;
    if (!email) {
      console.warn('[Daily API] No therapist email available');
      return null;
    }

    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const cacheKey = `${email}:${dateStr}`;

    // Check cache first (cache for 30 seconds)
    const cached = dailyAvailabilityCache[cacheKey];
    if (cached && Date.now() - cached.fetched_at < 30000) {
      return cached;
    }

    // Check if already loading this day
    if (loadingDays.has(cacheKey)) {
      return null;
    }

    // Add to loading set
    setLoadingDays(prev => new Set(prev).add(cacheKey));

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://solhealthbe-production.up.railway.app';

      // Use curl command structure exactly as specified
      const url = `${API_BASE}/therapists/${encodeURIComponent(email)}/availability/daily`;
      const params = new URLSearchParams({
        date: dateStr,
        debug: 'false'
      });

      console.log(`[Daily API] 📅 Fetching ${dateStr}: ${url}?${params}`);

      const response = await axios.get(`${url}?${params}`, {
        timeout: 10000,
        headers: {
          'Authorization': 'Bearer super-secret-1231',
          'Content-Type': 'application/json'
        }
      });

      const dayData: DailyAvailabilityData = {
        date: dateStr,
        available_slots: response.data.available_slots || [],
        total_slots: response.data.total_slots || 0,
        has_bookable_sessions: response.data.has_bookable_sessions ?? (response.data.available_slots?.length > 0),
        therapist_info: response.data.therapist_info || null,
        fetched_at: Date.now()
      };

      // Update cache
      setDailyAvailabilityCache(prev => ({
        ...prev,
        [cacheKey]: dayData
      }));

      console.log(`[Daily API] ✅ ${dateStr}: ${dayData.total_slots} slots, has_bookable_sessions=${dayData.has_bookable_sessions}`);

      return dayData;

    } catch (error: any) {
      console.error(`[Daily API] ❌ Error fetching ${dateStr}:`, error.response?.status, error.response?.data || error.message);

      // Cache error result briefly to avoid repeated failed requests
      const errorData: DailyAvailabilityData = {
        date: dateStr,
        available_slots: [],
        total_slots: 0,
        has_bookable_sessions: false,
        therapist_info: null,
        fetched_at: Date.now()
      };

      setDailyAvailabilityCache(prev => ({
        ...prev,
        [cacheKey]: errorData
      }));

      return errorData;
    } finally {
      // Remove from loading set
      setLoadingDays(prev => {
        const newSet = new Set(prev);
        newSet.delete(cacheKey);
        return newSet;
      });
    }
  }, [therapist?.calendar_email, therapist?.email, dailyAvailabilityCache, loadingDays]);

  // NEW: Get available count using daily API data - UNUSED FUNCTION (commented out to fix TS errors)
  // const getDayAvailableCount = useCallback(async (date: Date): Promise<number> => {
  //   // Function implementation would go here
  //   return 0;
  // }, []);

  // Calendar generation logic
  const calendarCells = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    // const lastDay = new Date(year, month + 1, 0); // Unused variable
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const cells = [];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 42); // 6 weeks

    let currentDate = new Date(startDate);
    while (currentDate < endDate) {
      cells.push({
        date: new Date(currentDate),
        day: currentDate.getDate(),
        inMonth: currentDate.getMonth() === month,
        key: currentDate.toISOString().split('T')[0]
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return cells;
  }, [calendarDate]);

  // Calendar navigation
  const goPrevMonth = () => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCalendarDate(newDate);
    setSelectedDateObj(null);
  };

  const goNextMonth = () => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCalendarDate(newDate);
    setSelectedDateObj(null);
  };

  // Load availability for visible days on calendar change
  useEffect(() => {
    if (!therapist?.calendar_email && !therapist?.email) return;

    // Load availability for all visible bookable days
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const minimumBookingTime = new Date(tomorrow);
    minimumBookingTime.setDate(minimumBookingTime.getDate() + 1);
    minimumBookingTime.setHours(0, 0, 0, 0);

    const maximumBookingTime = new Date(now);
    maximumBookingTime.setDate(maximumBookingTime.getDate() + 15);
    maximumBookingTime.setHours(23, 59, 59, 999);

    const bookableDates = calendarCells
      .filter(cell => cell.inMonth)
      .map(cell => cell.date)
      .filter(date => date.getTime() >= minimumBookingTime.getTime() && date.getTime() <= maximumBookingTime.getTime());

    // Load availability for each bookable date
    bookableDates.forEach(date => {
      loadDayAvailability(date);
    });
  }, [calendarDate, therapist?.calendar_email, therapist?.email, calendarCells, loadDayAvailability]);

  // Get available time slots for selected date
  const getAvailableTimeSlots = useCallback(async () => {
    if (!selectedDateObj) return [];

    const email = therapist?.calendar_email || therapist?.email;
    if (!email) return [];

    const dateStr = selectedDateObj.toISOString().split('T')[0];
    const cacheKey = `${email}:${dateStr}`;

    let dayData = dailyAvailabilityCache[cacheKey];
    if (!dayData || Date.now() - dayData.fetched_at > 30000) {
      const loadedData = await loadDayAvailability(selectedDateObj);
      if (loadedData) {
        dayData = loadedData;
      }
    }

    if (!dayData) return [];

    // Apply filtering logic
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const minimumBookingTime = new Date(tomorrow);
    minimumBookingTime.setDate(minimumBookingTime.getDate() + 1);
    minimumBookingTime.setHours(0, 0, 0, 0);

    const maximumBookingTime = new Date(now);
    maximumBookingTime.setDate(maximumBookingTime.getDate() + 14);
    maximumBookingTime.setHours(23, 59, 59, 999);

    let availableSlots = dayData.available_slots.filter(timeStr => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const sessionDateTime = new Date(selectedDateObj);
      sessionDateTime.setHours(hours, minutes, 0, 0);

      return sessionDateTime.getTime() >= minimumBookingTime.getTime() &&
             sessionDateTime.getTime() <= maximumBookingTime.getTime() &&
             hours >= 7 && hours < 22;
    });

    // Apply hourly restriction for Associate Therapists
    const therapistCategory = getTherapistCategory(therapist);
    if (therapistCategory === 'Associate Therapist') {
      availableSlots = availableSlots.filter(timeStr => {
        const [, minutes] = timeStr.split(':').map(Number);
        return minutes === 0;
      });
    }

    return availableSlots.map(time => ({ time, display: formatTime(time) }));
  }, [selectedDateObj, therapist, dailyAvailabilityCache, loadDayAvailability]);

  // Available time slots for the selected date
  const [availableTimeSlots, setAvailableTimeSlots] = useState<Array<{ time: string, display: string }>>([]);

  // Update available time slots when selected date changes
  useEffect(() => {
    if (selectedDateObj) {
      getAvailableTimeSlots().then(setAvailableTimeSlots);
    } else {
      setAvailableTimeSlots([]);
    }
  }, [selectedDateObj, getAvailableTimeSlots]);

  if (!therapist) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Results
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column - Therapist Info */}
          <div className="col-span-1 md:col-span-7">
            <Card className="bg-white border border-[#5C3106] rounded-3xl shadow-[1px_1px_0_#5C3106]">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-40 h-48 relative rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {therapist.image_link ? (
                      <Image
                        src={therapist.image_link}
                        alt={`Photo of ${therapist.intern_name}`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-sm">No photo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="very-vogue-title text-xl text-gray-800 mb-1">
                        {therapist.intern_name}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {getTherapistCategory(therapist)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Booking */}
          <div className="col-span-1 md:col-span-5 flex flex-col min-h-0">
            <Card className="md:flex-1 bg-white border border-[#5C3106] rounded-3xl shadow-[1px_1px_0_#5C3106] md:sticky md:top-4">
              <CardContent className="p-4 md:p-6 flex flex-col">
                <h3 className="very-vogue-title text-lg sm:text-xl text-gray-800 mb-1">Book Your First Session</h3>
                <p className="text-xs text-gray-600 mb-2">
                  {clientData?.state ?
                    `${String(clientData.state).toUpperCase()} Time (${timezoneDisplay})` :
                    `Local Time (${timezoneDisplay})`
                  }
                </p>

                {/* Calendar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{monthLabel}</h4>
                    <div className="flex gap-2">
                      <button onClick={goPrevMonth} className="p-1 hover:bg-gray-100 rounded border border-gray-200">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={goNextMonth} className="p-1 hover:bg-gray-100 rounded border border-gray-200">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="border border-[#5C3106] rounded-2xl p-2 shadow-[1px_1px_0_#5C3106]">
                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
                      {['M','T','W','T','F','S','S'].map((d, i) => (
                        <div key={`dh-${i}`} className="py-1 uppercase tracking-wide">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {calendarCells.map((cell) => {
                        const selected = selectedDateObj ? isSameDay(cell.date, selectedDateObj) : false;
                        const now = new Date();

                        const tomorrow = new Date(now);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(0, 0, 0, 0);

                        const minimumBookingTime = new Date(tomorrow);
                        minimumBookingTime.setDate(minimumBookingTime.getDate() + 1);
                        minimumBookingTime.setHours(0, 0, 0, 0);

                        const maximumBookingTime = new Date(now);
                        maximumBookingTime.setDate(maximumBookingTime.getDate() + 15);
                        maximumBookingTime.setHours(23, 59, 59, 999);

                        const isOutsideBookingWindow = cell.date.getTime() < minimumBookingTime.getTime() ||
                                                     cell.date.getTime() > maximumBookingTime.getTime();

                        let bgClass = 'bg-white';
                        let isUnavailable = false;

                        if (cell.inMonth) {
                          if (isOutsideBookingWindow) {
                            bgClass = 'bg-gray-100';
                            isUnavailable = true;
                          } else {
                            // NEW: Use daily API data to determine color
                            const email = therapist?.calendar_email || therapist?.email;
                            const dateStr = cell.date.toISOString().split('T')[0];
                            const cacheKey = `${email}:${dateStr}`;
                            const dayData = dailyAvailabilityCache[cacheKey];
                            const isLoading = loadingDays.has(cacheKey);

                            if (isLoading) {
                              bgClass = 'bg-blue-100 animate-pulse';
                            } else if (dayData?.has_bookable_sessions) {
                              const count = dayData.total_slots;
                              bgClass = count > 5 ? 'bg-green-100' : count > 2 ? 'bg-yellow-100' : 'bg-red-100';
                            } else {
                              bgClass = 'bg-gray-200';
                              isUnavailable = true;
                            }
                          }
                        }

                        return (
                          <button
                            key={cell.key}
                            onClick={() => {
                              if (cell.inMonth && !isUnavailable) {
                                setSelectedDateObj(cell.date);
                                setSelectedTimeSlot(null);
                              }
                            }}
                            disabled={!cell.inMonth || isUnavailable}
                            className={`py-2 rounded-lg transition-colors border ${
                              selected
                                ? 'bg-blue-500 text-white border-blue-500'
                                : cell.inMonth
                                  ? `${bgClass} hover:bg-yellow-50 border-transparent`
                                  : 'bg-white text-gray-300 cursor-not-allowed opacity-60 border-transparent'
                            }`}
                          >
                            {cell.day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Time Slots */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">Available Times</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {availableTimeSlots.length > 0 ? (
                      availableTimeSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedTimeSlot(slot.time)}
                          className={`w-full p-3 rounded-xl text-left transition-colors border ${
                            selectedTimeSlot === slot.time
                              ? 'bg-yellow-100 border-yellow-300'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {slot.display}
                        </button>
                      ))
                    ) : selectedDateObj ? (
                      <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">No available time slots</p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">Select a date to see available times</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Book Session Button */}
                <Button
                  onClick={() => setShowConfirmationModal(true)}
                  disabled={!selectedTimeSlot || !selectedDateObj}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black rounded-full py-3 shadow-[1px_1px_0_#5C3106] disabled:opacity-50"
                >
                  Book 45-Min Session →
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmationModal && selectedDateObj && selectedTimeSlot && (
        <TherapistConfirmationModal
          isVisible={showConfirmationModal}
          onCancel={() => setShowConfirmationModal(false)}
          onConfirm={() => {
            // Handle booking confirmation here
            setShowConfirmationModal(false);
          }}
          therapist={{
            therapist: therapist,
            score: 100,
            matched_diagnoses_specialities: []
          }}
          selectedDate={selectedDateObj}
          selectedTimeSlot={selectedTimeSlot}
        />
      )}
    </div>
  );
}