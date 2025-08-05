// solPayments/src/components/MatchedTherapist.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, Play, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { TMatchedTherapistData } from "@/api/types/therapist.types";

interface MatchedTherapistProps {
  therapistsList: TMatchedTherapistData[];
  clientData?: any;
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
  const [selectedDate, setSelectedDate] = useState<number | null>(11);
  const [viewedTherapistIds, setViewedTherapistIds] = useState<Set<string>>(new Set());
  const [showVideo, setShowVideo] = useState(false);
  
  const currentTherapistData = therapistsList[currentIndex];
  const therapist = currentTherapistData?.therapist;
  const matchedSpecialties = currentTherapistData?.matched_diagnoses_specialities || [];
  
  // Get client's needs from their responses
  const clientNeeds = clientData?.therapist_specializes_in || [];
  
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
  };
  
  const handleSelectPreviousTherapist = (therapistId: string) => {
    const therapistIndex = therapistsList.findIndex(t => t.therapist.id === therapistId);
    if (therapistIndex !== -1) {
      setCurrentIndex(therapistIndex);
      setSelectedTimeSlot(null);
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
    let [h, m] = hour.split(':');
    if (period.toLowerCase() === 'pm' && h !== '12') h = String(Number(h) + 12);
    if (period.toLowerCase() === 'am' && h === '12') h = '00';
    return `${h.padStart(2, '0')}:${m || '00'}`;
  };

  // Helper to get image URL (handles S3 URLs and CloudFront)
  const getImageUrl = (imageLink: string | null | undefined): string => {
    if (!imageLink) return '';
    
    // If it's already a full URL, use it directly
    if (imageLink.startsWith('http')) {
      return imageLink;
    }
    
    // Extract the filename/email from various formats
    let filename = '';
    
    if (imageLink.includes('@')) {
      // It's already an email-based filename
      filename = imageLink;
    } else if (imageLink.includes('therapists-personal-data')) {
      // Extract from S3 path format: s3://therapists-personal-data/images/email@domain.com
      const matches = imageLink.match(/images\/(.+)$/);
      if (matches && matches[1]) {
        filename = matches[1];
      } else {
        // Fallback: get the last part after the last slash
        const parts = imageLink.split('/');
        filename = parts[parts.length - 1];
      }
    } else {
      // Use as-is
      filename = imageLink;
    }
    
    // Ensure the filename has an image extension
    if (filename && !filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      filename = `${filename}.jpg`; // Default to .jpg if no extension
    }
    
    // Use CloudFront URL if available, otherwise fall back to S3
    const cloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
    if (cloudfrontUrl) {
      return `${cloudfrontUrl}/${filename}`;
    } else {
      // Fallback to direct S3 URL
      return `https://therapists-personal-data.s3.us-east-2.amazonaws.com/images/${filename}`;
    }
  };

  if (!therapist) return null;

  // Combine all specialties and diagnoses
  const allSpecialties = [
    ...(therapist.specialities || []),
    ...(therapist.diagnoses || []),
    ...(therapist.diagnoses_specialities || [])
  ].filter(Boolean); // Remove any null/undefined values
  
  // Remove duplicates and sort by match
  const uniqueSpecialties = Array.from(new Set(allSpecialties));
  const sortedSpecialties = [
    ...uniqueSpecialties.filter(s => matchedSpecialties.includes(s)),
    ...uniqueSpecialties.filter(s => !matchedSpecialties.includes(s))
  ];

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

      {/* Main Content - Flex grow to fill remaining space */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        <div className="h-full flex flex-col max-w-7xl mx-auto">
          {/* Top Section - Therapist Info */}
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
            {/* Left Column - Therapist Details (7 cols) */}
            <div className="col-span-7 flex flex-col min-h-0">
              <Card className="flex-1 overflow-hidden border-0 shadow-lg">
                <CardContent className="h-full p-6 overflow-y-auto">
                  {/* Therapist Header */}
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0">
                      {therapist.image_link && (
                        <img
                          src={getImageUrl(therapist.image_link)}
                          alt={therapist.intern_name}
                          className="w-24 h-24 rounded-full object-cover"
                          onError={(e) => {
                            // Fallback if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      )}
                      <div className={`w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center ${therapist.image_link ? 'hidden' : ''}`}>
                        <span className="text-2xl text-gray-500">
                          {therapist.intern_name?.charAt(0)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-800">
                        {therapist.intern_name}
                      </h2>
                      <p className="text-gray-600">{therapist.program}</p>
                      
                      {/* Top matched specialties as tags */}
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

                    {/* Video button if available */}
                    {therapist.welcome_video_link && (
                      <button
                        onClick={() => setShowVideo(!showVideo)}
                        className="flex-shrink-0 w-32 h-20 bg-gray-900 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors relative overflow-hidden"
                      >
                        {therapist.image_link && (
                          <img
                            src={getImageUrl(therapist.image_link)}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-50"
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
                      <p className="font-medium">{therapist.identities_as || therapist.gender || 'Female'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Age</p>
                      <p className="font-medium">{therapist.age || 'Early/Mid 20s'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Works in States</p>
                      <p className="font-medium">{therapist.states?.join(', ') || 'NJ'}</p>
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

                  {/* Skills and Experience Section */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg">Skills and Experience</h3>
                    
                    {/* Combined Specializes in section */}
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
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Therapeutic orientation</p>
                      <div className="flex flex-wrap gap-2">
                        {(therapist.therapeutic_orientation || []).map((orientation, i) => (
                          <span key={`orientation-${i}`} className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm">
                            {orientation}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Has experience with religions */}
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Has experience working with religions</p>
                      <div className="flex flex-wrap gap-2">
                        {(therapist.religion || []).map((religion, i) => (
                          <span key={`religion-${i}`} className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm">
                            {religion}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Booking (5 cols) */}
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
                      {/* Calendar days */}
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

          {/* Bottom Section - Previously Viewed Therapists (only show if we have some) */}
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
                    {therapistData.therapist.image_link && (
                      <img
                        src={getImageUrl(therapistData.therapist.image_link)}
                        alt={therapistData.therapist.intern_name}
                        className="w-20 h-20 rounded-full object-cover mx-auto mb-2"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    )}
                    <div className={`w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-2 ${therapistData.therapist.image_link ? 'hidden' : ''}`}>
                      <span className="text-xl text-gray-500">
                        {therapistData.therapist.intern_name?.charAt(0)}
                      </span>
                    </div>
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
      {showVideo && therapist.welcome_video_link && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowVideo(false)}>
          <div className="bg-white rounded-lg p-4 max-w-4xl w-full mx-4" onClick={e => e.stopPropagation()}>
            <iframe
              src={therapist.welcome_video_link}
              className="w-full h-[500px] rounded"
              allowFullScreen
            />
            <Button onClick={() => setShowVideo(false)} className="mt-4 w-full">
              Close Video
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}