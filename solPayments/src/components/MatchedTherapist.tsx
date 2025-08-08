// solPayments/src/components/MatchedTherapist.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, Play, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { TMatchedTherapistData } from "@/api/types/therapist.types";

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
  const [selectedDate, setSelectedDate] = useState<number | null>(11);
  const [viewedTherapistIds, setViewedTherapistIds] = useState<Set<string>>(new Set());
  const [showVideo, setShowVideo] = useState(false);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  
  const currentTherapistData = therapistsList[currentIndex];
  const therapist = currentTherapistData?.therapist;
  const matchedSpecialties = currentTherapistData?.matched_diagnoses_specialities || [];
  
  // Track viewed therapists
  useEffect(() => {
    if (therapist?.id) {
      setViewedTherapistIds(prev => new Set([...prev, therapist.id]));
    }
  }, [therapist?.id]);
  
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
    if (selectedTimeSlot && selectedDate && onBookSession) {
      const datetime = `2025-01-${selectedDate.toString().padStart(2, '0')}T${convertTo24Hour(selectedTimeSlot)}:00`;
      onBookSession(currentTherapistData, datetime);
    }
  };
  
  const convertTo24Hour = (time: string) => {
    const [hour, period] = time.split(/(?=[ap]m)/i);
    let [h, m = '00'] = hour.split(':');
    if (period.toLowerCase() === 'pm' && h !== '12') h = String(Number(h) + 12);
    if (period.toLowerCase() === 'am' && h === '12') h = '00';
    return `${h.padStart(2, '0')}:${m || '00'}`;
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

  // Combine all specialties and diagnoses
  const allSpecialties = [
    ...(therapist.specialities || []),
    ...(therapist.diagnoses || []),
    ...(therapist.diagnoses_specialities || [])
  ].filter(Boolean);
  
  // Remove duplicates and sort by match
  const uniqueSpecialties = Array.from(new Set(allSpecialties));
  const sortedSpecialties = [
    ...uniqueSpecialties.filter(s => matchedSpecialties.includes(s)),
    ...uniqueSpecialties.filter(s => !matchedSpecialties.includes(s))
  ];

  // Check if video URL is valid
  const hasValidVideo = therapist.welcome_video_link && 
    (therapist.welcome_video_link.startsWith('http://') || 
     therapist.welcome_video_link.startsWith('https://'));

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#FFFBF3' }}>
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
      <div className="flex-1 overflow-hidden px-6 py-4">
        <div className="h-full flex flex-col max-w-7xl mx-auto">
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
            {/* Left Column - Therapist Details */}
            <div className="col-span-7 flex flex-col min-h-0">
              <Card className="flex-1 overflow-hidden border-0 shadow-lg">
                <CardContent className="h-full p-6 overflow-y-auto">
                  {/* Therapist Header */}
                  <div className="flex items-start gap-4 mb-6">
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
                    
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-800">
                        {therapist.intern_name}
                      </h2>
                      <p className="text-gray-600">{therapist.program}</p>
                      
                      {/* Matched specialties */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {matchedSpecialties.slice(0, 3).map((specialty, i) => (
                          <span key={i} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                            {specialty}
                          </span>
                        ))}
                        {matchedSpecialties.length > 3 && (
                          <button className="text-blue-600 text-sm hover:underline">
                            +{matchedSpecialties.length - 3} more
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Video button */}
                    {hasValidVideo && (
                      <button
                        onClick={() => setShowVideo(!showVideo)}
                        className="flex-shrink-0 w-32 h-20 bg-gray-900 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors relative overflow-hidden"
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
                  <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
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
                    <h3 className="font-bold text-lg">Skills and Experience</h3>
                    
                    {/* Specialties */}
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Specializes in</p>
                      <div className="flex flex-wrap gap-2">
                        {sortedSpecialties.map((specialty, i) => (
                          <span 
                            key={`specialty-${i}`}
                            className={`px-3 py-1 rounded-full text-sm border ${
                              matchedSpecialties.includes(specialty)
                                ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                                : 'bg-white border-gray-300 text-gray-700'
                            }`}
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Therapeutic orientation */}
                    {therapist.therapeutic_orientation && therapist.therapeutic_orientation.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Therapeutic orientation</p>
                        <div className="flex flex-wrap gap-2">
                          {therapist.therapeutic_orientation.map((orientation, i) => (
                            <span key={`orientation-${i}`} className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm">
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
            <div className="col-span-5 flex flex-col min-h-0">
              <Card className="flex-1 border-0 shadow-lg">
                <CardContent className="h-full p-6 flex flex-col">
                  <h3 className="text-xl font-bold mb-2">Book Your First Session</h3>
                  <p className="text-sm text-gray-600 mb-4">Local Timezone (Central Time)</p>

                  {/* Calendar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">January 2025</h4>
                      <div className="flex gap-2">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={`day-${i}`} className="p-2 text-gray-500 text-xs">{day}</div>
                      ))}
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <button
                          key={`date-${day}`}
                          onClick={() => setSelectedDate(day)}
                          className={`p-2 rounded hover:bg-yellow-100 transition-colors ${
                            selectedDate === day ? 'bg-yellow-400 text-white' : ''
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Slots */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {['1:00pm', '2:00pm', '5:00pm', '6:00pm', '7:00pm', '8:00pm'].map((time) => (
                      <button
                        key={`time-${time}`}
                        onClick={() => setSelectedTimeSlot(time)}
                        className={`p-3 rounded-lg border transition-all ${
                          selectedTimeSlot === time
                            ? 'border-yellow-400 bg-yellow-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>

                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white mb-6"
                    onClick={handleBookSession}
                    disabled={!selectedTimeSlot || !selectedDate}
                  >
                    Book 45-Min Session →
                  </Button>

                  {/* Find Another Therapist */}
                  <div className="text-center mt-auto">
                    <p className="text-sm text-gray-500 mb-2">It's Okay to Keep Looking</p>
                    <Button
                      variant="outline"
                      className="w-full"
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
              <h3 className="text-lg font-semibold mb-4">Previously Viewed Therapists</h3>
              <div className="grid grid-cols-4 gap-4">
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