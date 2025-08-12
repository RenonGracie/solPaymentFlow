// solPayments/src/components/MatchedTherapist.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, Play, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { TMatchedTherapistData } from "@/api/types/therapist.types";
import type { SlotsResponse } from "@/api/services";
import { useTherapistsService } from "@/api/services";

interface MatchedTherapistProps {
  therapistsList: TMatchedTherapistData[];
  clientData?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    response_id?: string;
    [key: string]: unknown;
  },  initialIndex?: number;
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
  
  const currentTherapistData = therapistsList[currentIndex];
  const therapist = currentTherapistData?.therapist;
  const matchedSpecialtiesRaw = currentTherapistData?.matched_diagnoses_specialities || [];
  
  const { slots: slotsRequest } = useTherapistsService();
  
  // Track viewed therapists
  useEffect(() => {
    if (therapist?.id) {
      setViewedTherapistIds(prev => new Set([...prev, therapist.id]));
    }
  }, [therapist?.id]);
  
  // Fetch Google Calendar-backed slots when therapist changes (by calendar/email)
  useEffect(() => {
    const email = therapist?.calendar_email || therapist?.email;
    if (!email) return;
    // Avoid refetch if already fetched
    if (fetchedSlots[email] || fetchingSlots[email]) return;
    setFetchingSlots(prev => ({ ...prev, [email]: true }));
    slotsRequest
      .makeRequest({ params: { email } })
      .then((res: SlotsResponse) => {
        const avail = res?.available_slots || [];
        setFetchedSlots(prev => ({ ...prev, [email]: avail }));
      })
      .catch(() => {
        // Swallow errors; fallback to any slots in the match payload
      })
      .finally(() => setFetchingSlots(prev => ({ ...prev, [email]: false })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [therapist?.calendar_email, therapist?.email]);
  
  // Get previously viewed therapists (excluding current)
  const previouslyViewed = therapistsList.filter(t => 
    viewedTherapistIds.has(t.therapist.id) && t.therapist.id !== therapist?.id
  );
  
  const handleFindAnother = () => {
    const nextIndex = (currentIndex + 1) % therapistsList.length;
    setCurrentIndex(nextIndex);
    setSelectedTimeSlot(null);
    setImageError({}); // Reset image errors for new therapist
  };
  
  const handleSelectPreviousTherapist = (therapistId: string) => {
    const therapistIndex = therapistsList.findIndex(t => t.therapist.id === therapistId);
    if (therapistIndex !== -1) {
      setCurrentIndex(therapistIndex);
      setSelectedTimeSlot(null);
      setImageError({});
    }
  };
  
  const handleBookSession = () => {
    if (selectedTimeSlot && selectedDateObj && onBookSession) {
      const yyyy = selectedDateObj.getFullYear();
      const mm = String(selectedDateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDateObj.getDate()).padStart(2, '0');
      const normalizedTime = selectedTimeSlot.replace(/\s/g, '');
      const datetime = `${yyyy}-${mm}-${dd}T${convertTo24Hour(normalizedTime)}:00`;
      onBookSession(currentTherapistData, datetime);
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
    
    // If it's already a full URL (S3 presigned URL), use it directly
    if (imageLink.startsWith('http://') || imageLink.startsWith('https://')) {
      return imageLink;
    }
    
    // This shouldn't happen with proper S3 presigned URLs, but as a fallback
    console.warn('Image link is not a full URL:', imageLink);
    return '';
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

  if (!therapist) return null;

  // Sanitize labels to remove JSON artifacts like curly braces or stray quotes
  const sanitizeLabel = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value
      .replace(/[{}\[\]"']/g, '') // remove curly/square braces and quotes (single/double)
      .replace(/\s+/g, ' ') // collapse whitespace
      .trim();
  };
 
  // Normalize arbitrary inputs (string | string[] | JSON-like) to a clean string[]
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
      // Remove wrapping braces if present like {a, b}
      const noBraces = raw.replace(/^[{\[]|[}\]]$/g, '');
      // Split by common delimiters
      const parts = noBraces.split(/[,;\|]/g).map((s) => sanitizeLabel(s));
      return parts.filter(Boolean);
    }
    // Fallback
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
      .filter((label) => /[A-Za-z0-9]/.test(label)); // ensure there is meaningful content
  };
 
  const matchedSpecialties = cleanList(matchedSpecialtiesRaw);
 
  // Combine all specialties and diagnoses
  const allSpecialtiesRaw = [
    ...toStringArray(therapist.specialities),
    ...toStringArray(therapist.diagnoses),
    ...toStringArray(therapist.diagnoses_specialities),
    ...toStringArray(therapist.diagnoses_specialties_array),
  ];
  const allSpecialties = cleanList(allSpecialtiesRaw);
  
  // Remove duplicates and sort by match
  const uniqueSpecialties = Array.from(new Set(allSpecialties));
  const sortedSpecialties = [
    ...uniqueSpecialties.filter(s => matchedSpecialties.includes(s)),
    ...uniqueSpecialties.filter(s => !matchedSpecialties.includes(s))
  ];
 
  // Combine internal and external therapeutic orientation fields
  const therapeuticOrientationCombined = [
    ...toStringArray(therapist.therapeutic_orientation),
    ...toStringArray(therapist.internal_therapeutic_orientation),
  ];
  const therapeuticOrientation = Array.from(new Set(cleanList(therapeuticOrientationCombined)));

  // Check if video URL is valid
  const hasValidVideo = therapist.welcome_video_link && 
    (therapist.welcome_video_link.startsWith('http://') || 
     therapist.welcome_video_link.startsWith('https://'));

  // Calendar computations (Monday-start week)
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
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
  const goPrevMonth = () => setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  const goNextMonth = () => setCalendarDate(new Date(currentYear, currentMonth + 1, 1));

  // Build time slots from therapist.available_slots for the selected day
  const emailForSlots = therapist?.calendar_email || therapist?.email || '';
  const calendarAvailableSlots = fetchedSlots[emailForSlots] || therapist.available_slots || [];
  const slotsForDay = (calendarAvailableSlots || [])
    .map((iso: string) => new Date(iso))
    .filter((dt: Date) => selectedDateObj && isSameDay(dt, selectedDateObj))
    .sort((a: Date, b: Date) => a.getTime() - b.getTime());

  const formatTimeLabel = (date: Date) =>
    date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
      {/* Header - Fixed height */}
      <div className="relative overflow-hidden h-[160px] flex-shrink-0">
        <Image
          src="/onboarding-banner.jpg"
          alt="Onboarding Banner"
          width={1440}
          height={160}
          priority
          className="w-full h-full object-cover"
        />
        
        <div className="absolute inset-0 flex flex-col justify-between p-6">
          <div className="flex items-center">
            {onBack && (
              <button
                onClick={onBack}
                className="mr-4 p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-800" />
              </button>
            )}
            <Image
              src="/sol-health-logo.svg"
              alt="Sol Health"
              width={120}
              height={20}
              className="h-5 w-auto"
            />
          </div>

          <div className="text-center">
            <h2 className="very-vogue-title text-3xl text-gray-800">
              We Found the <em>Best Therapist</em> for You
            </h2>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 md:px-6 py-4">
        <div className="h-full flex flex-col max-w-7xl mx-auto">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 min-h-0">
            {/* Left Column - Therapist Details */}
            <div className="col-span-1 md:col-span-7 flex flex-col min-h-0">
              <Card className="md:flex-1 overflow-visible md:overflow-hidden bg-white border border-[#5C3106] rounded-3xl shadow-[1px_1px_0_#5C3106]">
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
                      <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>{therapist.program}</p>
                      {/* Matched specialties */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {matchedSpecialties.slice(0, 3).map((specialty, i) => (
                          <span key={i} className="px-3 py-1 bg-yellow-100 text-gray-800 rounded-full text-xs border border-[#5C3106] shadow-[1px_1px_0_#5C3106]" style={{ fontFamily: 'var(--font-inter)' }}>
                            {specialty}
                          </span>
                        ))}
                        {matchedSpecialties.length > 3 && (
                          <button className="text-blue-700 text-sm underline" style={{ fontFamily: 'var(--font-inter)' }}>
                            +{matchedSpecialties.length - 3} more
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Video button */}
                    {hasValidVideo && (
                      <button
                        onClick={() => setShowVideo(!showVideo)}
                        className="mt-2 md:mt-0 w-full md:w-32 h-20 bg-gray-900 rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors relative overflow-hidden shadow-[1px_1px_0_#5C3106]"
                      >
                        {therapist.image_link && !imageError[therapist.id] && (
                          <img
                            src={getImageUrl(therapist.image_link)}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-50"
                            onError={() => {}}
                          />
                        )}
                        <Play className="w-8 h-8 text-white relative z-10" />
                      </button>
                    )}
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
                      <p className="font-medium">{therapist.states?.join(', ') || 'Not specified'}</p>
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

                  {/* Skills and Experience */}
                  <div className="space-y-4">
                    <h3 className="very-vogue-title text-2xl text-gray-800">Skills and Experience</h3>
                    
                    {/* Specialties */}
                    <div>
                      <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'var(--font-inter)' }}>Specializes in</p>
                      <div className="flex flex-wrap gap-2">
                        {sortedSpecialties.map((specialty, i) => (
                          <span 
                            key={`specialty-${i}`}
                            className={`px-3 py-1 rounded-full text-xs border shadow-[1px_1px_0_#5C3106] ${
                              matchedSpecialties.includes(specialty)
                                ? 'bg-yellow-100 border-[#5C3106] text-gray-800'
                                : 'bg-white border-gray-300 text-gray-700'
                            }`}
                            style={{ fontFamily: 'var(--font-inter)' }}
                          >
                            {specialty}
                          </span>
                        ))}
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
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Booking */}
            <div className="col-span-1 md:col-span-5 flex flex-col min-h-0">
              <Card className="md:flex-1 bg-white border border-[#5C3106] rounded-3xl shadow-[1px_1px_0_#5C3106] md:sticky md:top-4">
                <CardContent className="p-4 md:p-6 flex flex-col">
                  <h3 className="very-vogue-title text-2xl text-gray-800 mb-1">Book Your First Session</h3>
                  <p className="text-sm text-gray-600 mb-4" style={{ fontFamily: 'var(--font-inter)' }}>Local Timezone (Central Time)</p>

                  {/* Calendar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium" style={{ fontFamily: 'var(--font-inter)' }}>{monthLabel}</h4>
                      <div className="flex gap-2">
                        <button onClick={goPrevMonth} className="p-1 hover:bg-gray-100 rounded border border-gray-200" aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></button>
                        <button onClick={goNextMonth} className="p-1 hover:bg-gray-100 rounded border border-gray-200" aria-label="Next month"><ChevronRight className="w-4 h-4" /></button>
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
                          return (
                            <button
                              key={cell.key}
                              onClick={() => cell.inMonth && setSelectedDateObj(cell.date)}
                              disabled={!cell.inMonth}
                              className={`py-2 rounded-lg transition-colors border ${
                                selected
                                  ? 'bg-yellow-400 text-white border-yellow-400'
                                  : cell.inMonth
                                    ? 'bg-white hover:bg-yellow-50 border-transparent'
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
                    Book 45-Min Session →
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

          {/* Previously Viewed Therapists */}
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

      {/* Video Modal */}
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