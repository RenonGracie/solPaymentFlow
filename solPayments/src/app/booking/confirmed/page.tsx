// solPayments/src/app/booking/confirmed/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Play, CheckCircle, Calendar, Clock, User } from "lucide-react";
import Image from "next/image";
import axios from "@/api/axios";

// Video analysis types (reused from MatchedTherapist)
interface VideoAnalysis {
  hasVideo: boolean;
  videoType: string;
  embedUrl: string;
  videoId?: string;
  isShort?: boolean;
  platform?: string;
  reason: string;
}

interface BookingData {
  client: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    state?: string;
  };
  therapist: {
    id: string;
    intern_name: string;
    email: string;
    image_link?: string;
    welcome_video?: string;
    program?: string;
  };
  appointment: {
    datetime: string;
    status: string;
    duration_minutes: number;
    payment_type: string;
  };
}

// Function to extract YouTube video ID from URL
const extractYouTubeId = (url: string): string => {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : '';
};

// Video analysis function with Google Drive support
const analyzeVideo = (videoLink: string, therapistName?: string): VideoAnalysis => {
  if (!videoLink || videoLink.trim() === '') {
    return { hasVideo: false, videoType: 'none', embedUrl: '', reason: 'No video URL provided' };
  }

  const cleanUrl = videoLink.trim();
  
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    console.warn(`[Video] Invalid URL format for ${therapistName}: ${cleanUrl}`);
    return { hasVideo: false, videoType: 'invalid', embedUrl: '', reason: 'URL does not start with http/https' };
  }

  // Analyze Google Drive URLs
  if (cleanUrl.includes('drive.google.com')) {
    const driveMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      const fileId = driveMatch[1];
      const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      console.log(`[Video] Google Drive video detected: ${fileId}`);
      return { hasVideo: true, videoType: 'google-drive', embedUrl, videoId: fileId, reason: 'Valid Google Drive video' };
    } else {
      console.error(`[Video] Could not extract Google Drive file ID from: ${cleanUrl}`);
      return { hasVideo: false, videoType: 'google-drive-invalid', embedUrl: '', reason: 'Invalid Google Drive URL format' };
    }
  }

  // Analyze YouTube URLs
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    const videoId = extractYouTubeId(cleanUrl);
    if (!videoId) {
      console.error(`[Video] Could not extract YouTube ID from: ${cleanUrl}`);
      return { hasVideo: false, videoType: 'youtube-invalid', embedUrl: '', reason: 'Invalid YouTube URL format' };
    }

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
  const supportedPlatforms = ['wistia.com', 'loom.com'];
  const platform = supportedPlatforms.find(p => cleanUrl.includes(p));
  
  if (platform) {
    return { hasVideo: true, videoType: 'other-platform', embedUrl: cleanUrl, platform, reason: `Video from ${platform}` };
  }

  // Unknown video source
  console.warn(`[Video] Unknown video source for ${therapistName}: ${cleanUrl}`);
  return { hasVideo: false, videoType: 'unknown', embedUrl: '', reason: 'Unknown video platform or format' };
};

export default function BookingConfirmedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const responseId = searchParams?.get('response_id') || null;
  
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Fetch booking data
  useEffect(() => {
    const fetchBookingData = async () => {
      if (!responseId) {
        setError('Missing response ID');
        setLoading(false);
        return;
      }

      try {
        console.log('📋 Fetching booking confirmation data for response_id:', responseId);
        
        // Fetch the client response data which should now include booking details
        const response = await axios.get(`/client-responses/${responseId}`);
        const data = response.data;
        
        console.log('✅ Booking confirmation data received:', data);
        
        // Extract booking information from the response
        const bookingInfo: BookingData = {
          client: {
            id: data.id || responseId,
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            email: data.email || '',
            state: data.state || ''
          },
          therapist: {
            id: data.therapist_id || '',
            intern_name: data.therapist_name || 'Your Therapist',
            email: data.therapist_email || '',
            image_link: data.therapist_image || '',
            welcome_video: data.therapist_welcome_video || '',
            program: data.therapist_program || ''
          },
          appointment: {
            datetime: data.appointment_datetime || new Date().toISOString(),
            status: data.appointment_status || 'scheduled',
            duration_minutes: data.duration_minutes || (data.payment_type === 'insurance' ? 55 : 45),
            payment_type: data.payment_type || 'insurance'
          }
        };
        
        setBookingData(bookingInfo);
      } catch (err) {
        console.error('❌ Failed to fetch booking data:', err);
        setError('Failed to load booking information');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingData();
  }, [responseId]);

  // Fixed video for booking confirmation page
  const BOOKING_CONFIRMATION_VIDEO = 'https://drive.google.com/file/d/1nBP0ZCLJGUertyy7t8SFZ_hK4F5j1igX/view?usp=drivesdk';
  
  // Video analysis - always use the fixed confirmation video
  const videoAnalysis = useMemo(() => {
    return analyzeVideo(BOOKING_CONFIRMATION_VIDEO, 'Booking Confirmation');
  }, []);

  const hasValidVideo = videoAnalysis.hasVideo;

  // Format appointment date and time
  const formatAppointmentDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const dateStr = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    return { dateStr, timeStr };
  };

  // Handle image URL
  const getImageUrl = (imageLink: string | null | undefined): string => {
    if (!imageLink) return '';
    if (imageLink.startsWith('http://') || imageLink.startsWith('https://')) {
      return imageLink;
    }
    console.warn('Image link is not a full URL:', imageLink);
    return '';
  };

  // Handle navigation to forms
  const handleSendMandatoryForms = () => {
    // Route to the mandatory forms page - this would need to be implemented
    // For now, we'll show an alert indicating the feature is coming
    alert('Mandatory forms feature coming soon! You will receive an email with the forms shortly.');
    
    // In a real implementation, this might route to:
    // router.push(`/forms/mandatory?response_id=${responseId}`);
  };

  // Handle back navigation
  const handleBack = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFBF3' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
            Loading your booking confirmation...
          </p>
        </div>
      </div>
    );
  }

  if (error || !bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFBF3' }}>
        <div className="text-center">
          <p className="text-red-600 mb-4" style={{ fontFamily: 'var(--font-inter)' }}>
            {error || 'Failed to load booking information'}
          </p>
          <Button onClick={handleBack} variant="outline">
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  const { dateStr, timeStr } = formatAppointmentDateTime(bookingData.appointment.datetime);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
      {/* Header */}
      <div className="relative h-12 sm:h-20 md:h-24 overflow-hidden flex-shrink-0">
        <Image
          src="/onboarding-banner.jpg"
          alt="Booking Confirmed Banner"
          width={1440}
          height={96}
          priority
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-start p-3 sm:p-4">
          <button
            onClick={handleBack}
            className="mr-2 p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5 text-gray-800" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 md:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h1 className="very-vogue-title text-3xl sm:text-4xl md:text-5xl text-gray-800 mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-lg sm:text-xl text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
              Your therapy session has been successfully scheduled
            </p>
          </div>

          {/* Booking Details Card */}
          <Card className="mb-8 bg-white border border-[#5C3106] rounded-3xl shadow-[1px_1px_0_#5C3106]">
            <CardContent className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Therapist Info */}
                <div className="space-y-4">
                  <h3 className="very-vogue-title text-xl sm:text-2xl text-gray-800 mb-4">
                    Your Therapist
                  </h3>
                  
                  <div className="flex items-center gap-4">
                    {bookingData.therapist.image_link && !imageError ? (
                      <img
                        src={getImageUrl(bookingData.therapist.image_link)}
                        alt={bookingData.therapist.intern_name}
                        className="w-16 h-16 rounded-full object-cover"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-semibold text-lg text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                        {bookingData.therapist.intern_name}
                      </h4>
                      <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
                        {bookingData.therapist.program === 'Limited Permit' ? 'Associate Therapist' : 'Graduate Therapist'}
                      </p>
                    </div>
                  </div>

                  {/* Confirmation Video Button */}
                  {hasValidVideo && (
                    <Button
                      onClick={() => setShowVideo(true)}
                      variant="outline"
                      className="w-full mt-4 border-2 border-[#5C3106] hover:bg-yellow-50"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Watch Confirmation Video
                    </Button>
                  )}
                </div>

                {/* Appointment Info */}
                <div className="space-y-4">
                  <h3 className="very-vogue-title text-xl sm:text-2xl text-gray-800 mb-4">
                    Session Details
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                          {dateStr}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                          {timeStr}
                        </p>
                        <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
                          {bookingData.appointment.duration_minutes} minutes
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-inter)' }}>
                        <strong>Important:</strong> You'll receive a calendar invitation and session link via email shortly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps Card */}
          <Card className="bg-white border border-[#5C3106] rounded-3xl shadow-[1px_1px_0_#5C3106]">
            <CardContent className="p-6 md:p-8 text-center">
              <h3 className="very-vogue-title text-xl sm:text-2xl text-gray-800 mb-4">
                Next Steps
              </h3>
              
              <p className="text-gray-600 mb-6" style={{ fontFamily: 'var(--font-inter)' }}>
                To complete your setup, please fill out the mandatory intake forms. 
                These help your therapist prepare for your first session.
              </p>

              <Button
                onClick={handleSendMandatoryForms}
                className="w-full max-w-md bg-yellow-100 hover:bg-yellow-200 text-gray-800 rounded-full border border-[#5C3106] shadow-[1px_1px_0_#5C3106]"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                Send Mandatory Forms →
              </Button>

              <p className="text-sm text-gray-500 mt-4" style={{ fontFamily: 'var(--font-inter)' }}>
                The forms will be sent to {bookingData.client.email}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Video Modal */}
      {showVideo && hasValidVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowVideo(false)}>
          <div className="bg-white rounded-lg p-4 w-full max-w-4xl mx-auto" onClick={e => e.stopPropagation()}>
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                Booking Confirmation Video
              </h3>
            </div>
            
            {(() => {
              switch (videoAnalysis.videoType) {
                case 'google-drive':
                  // Google Drive videos - use 16:9 aspect ratio
                  return (
                    <div className="w-full" style={{ aspectRatio: '16/9' }}>
                      <iframe
                        src={videoAnalysis.embedUrl}
                        className="w-full h-full rounded"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        title="Booking Confirmation Video"
                      />
                    </div>
                  );
                
                case 'youtube-short':
                  return (
                    <div className="flex justify-center">
                      <div className="w-full max-w-sm" style={{ aspectRatio: '9/16' }}>
                        <iframe
                          src={`${videoAnalysis.embedUrl}?rel=0&modestbranding=1`}
                          className="w-full h-full rounded"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          title="Booking Confirmation Video"
                        />
                      </div>
                    </div>
                  );
                
                case 'youtube-regular':
                  return (
                    <div className="w-full" style={{ aspectRatio: '16/9' }}>
                      <iframe
                        src={`${videoAnalysis.embedUrl}?rel=0&modestbranding=1`}
                        className="w-full h-full rounded"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        title="Booking Confirmation Video"
                      />
                    </div>
                  );
                
                case 'vimeo':
                  return (
                    <div className="w-full" style={{ aspectRatio: '16/9' }}>
                      <iframe
                        src={videoAnalysis.embedUrl}
                        className="w-full h-full rounded"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        title="Booking Confirmation Video"
                      />
                    </div>
                  );
                
                case 'direct':
                  return (
                    <video
                      src={videoAnalysis.embedUrl}
                      className="w-full max-h-[500px] rounded"
                      controls
                      preload="metadata"
                      title="Booking Confirmation Video"
                    >
                      Your browser does not support the video tag.
                    </video>
                  );
                
                case 'other-platform':
                  return (
                    <div className="text-center">
                      <iframe
                        src={videoAnalysis.embedUrl}
                        className="w-full h-[400px] rounded"
                        allowFullScreen
                        title="Booking Confirmation Video"
                        onError={() => console.error(`[Video] Failed to load iframe for ${videoAnalysis.platform}`)}
                      />
                      <p className="mt-2 text-sm text-gray-600">
                        If the video doesn't load, <a href={videoAnalysis.embedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">click here to view it directly</a>.
                      </p>
                    </div>
                  );
                
                default:
                  return (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">Unable to display this video format.</p>
                      <a 
                        href={BOOKING_CONFIRMATION_VIDEO} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        View video in new tab
                      </a>
                    </div>
                  );
              }
            })()}
            
            <Button onClick={() => setShowVideo(false)} className="mt-4 w-full">
              Close Video
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 