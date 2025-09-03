"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TMatchedTherapistData } from "@/api/types/therapist.types";

interface TherapistConfirmationModalProps {
  isVisible: boolean;
  therapist: TMatchedTherapistData | null;
  selectedDate: Date | null;
  selectedTimeSlot: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  clientTimezone?: string;
  timezoneDisplay?: string;
  sessionDuration?: number;
}

export const TherapistConfirmationModal = ({ 
  isVisible, 
  therapist, 
  selectedDate, 
  selectedTimeSlot,
  onConfirm, 
  onCancel,
  clientTimezone = 'America/New_York',
  timezoneDisplay = 'EST',
  sessionDuration = 55
}: TherapistConfirmationModalProps) => {
  if (!therapist) return null;

  const getImageUrl = (imageLink: string | null | undefined): string => {
    if (!imageLink || typeof imageLink !== 'string') {
      return '';
    }
    
    const cleanLink = imageLink.trim();
    if (!cleanLink) {
      return '';
    }
    
    if (cleanLink.startsWith('http://') || cleanLink.startsWith('https://')) {
      return cleanLink;
    }
    
    return '';
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Date not selected';
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: '2-digit' 
    });
  };

  const formatTime = (timeSlot: string | null): string => {
    if (!timeSlot) return 'Time not selected';
    
    // Convert from normalized format (e.g., "3:45pm") back to display format
    const cleanTime = timeSlot.toLowerCase().trim();
    
    // Handle different formats
    const match = cleanTime.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)$/i);
    if (match) {
      const hour = match[1];
      const minute = match[2] || '00';
      const period = match[3].toUpperCase();
      return `${hour}:${minute}${period.toLowerCase()}`;
    }
    
    return timeSlot;
  };

  const getTherapistCategory = (therapist: TMatchedTherapistData['therapist']): string => {
    const program = (therapist?.program ?? '').trim();
    if (program === 'Limited Permit') return 'Associate Therapist';
    return 'Graduate Therapist';
  };

  const getSessionDuration = (therapist: TMatchedTherapistData['therapist']): number => {
    const category = getTherapistCategory(therapist);
    if (category === 'Graduate Therapist') return 45;
    if (category === 'Associate Therapist') return 55;
    return sessionDuration; // fallback to prop value
  };

  const actualSessionDuration = therapist ? getSessionDuration(therapist.therapist) : sessionDuration;

  return (
    <Dialog open={isVisible} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md bg-white rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="very-vogue-title text-2xl sm:text-3xl md:text-4xl text-gray-800">
              Confirm <em>your</em>  Selection
            </h2>
          </div>

          {/* Therapist Card */}
          <div className="border border-[#5C3106] rounded-2xl p-6 mb-8 shadow-[2px_2px_0_#5C3106]">
            <div className="flex items-center gap-4">
              {/* Therapist Image */}
              <div className="flex-shrink-0">
                {therapist.therapist.image_link && getImageUrl(therapist.therapist.image_link) ? (
                  <img
                    src={getImageUrl(therapist.therapist.image_link)}
                    alt={therapist.therapist.intern_name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-gray-200">
                    <span className="text-xl font-medium text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
                      {therapist.therapist.intern_name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Therapist Info */}
              <div className="flex-1">
                <h3 className="very-vogue-title text-xl sm:text-2xl text-gray-800 mb-1">
                  {therapist.therapist.intern_name}
                </h3>
                <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
                  {getTherapistCategory(therapist.therapist)}
                </p>
              </div>
            </div>

            {/* Session Time */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#5C3106] rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div style={{ fontFamily: 'var(--font-inter)' }}>
                  <p className="text-sm font-semibold text-gray-800">{formatDate(selectedDate)}</p>
                  <p className="text-sm text-gray-600">
                    {formatTime(selectedTimeSlot)} - {
                      selectedTimeSlot ? 
                      (() => {
                        const time = formatTime(selectedTimeSlot);
                        // Parse the time string (e.g., "1:00pm")
                        const match = time.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
                        if (!match) return '';
                        
                        let hour = parseInt(match[1]);
                        const minute = parseInt(match[2]);
                        const period = match[3].toLowerCase();
                        
                        // Convert to 24-hour format
                        if (period === 'pm' && hour !== 12) {
                          hour += 12;
                        } else if (period === 'am' && hour === 12) {
                          hour = 0;
                        }
                        
                        // Add session duration
                        const totalMinutes = hour * 60 + minute + actualSessionDuration;
                        const endHour24 = Math.floor(totalMinutes / 60) % 24;
                        const endMinute = totalMinutes % 60;
                        
                        // Convert back to 12-hour format
                        const endPeriod = endHour24 >= 12 ? 'pm' : 'am';
                        const endHour12 = endHour24 === 0 ? 12 : (endHour24 > 12 ? endHour24 - 12 : endHour24);
                        
                        return `${endHour12}:${endMinute.toString().padStart(2, '0')}${endPeriod}`;
                      })() : ''
                    } {timezoneDisplay}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {actualSessionDuration} minute session
                  </p>
                </div>
              </div>
            </div>

            {/* Timezone Warning */}
            {(() => {
              const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
              const browserDisplay = browserTimezone.split('/')[1]?.replace('_', ' ') || browserTimezone;
              
              if (clientTimezone !== browserTimezone) {
                return (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700" style={{ fontFamily: 'var(--font-inter)' }}>
                      ⓘ This appointment is being scheduled in {timezoneDisplay} time. Your browser is in {browserDisplay}.
                    </p>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            <Button
              className="w-full bg-yellow-100 hover:bg-yellow-200 text-gray-800 py-4 rounded-full text-base font-medium border border-[#5C3106] shadow-[1px_1px_0_#5C3106] transition-all"
              onClick={onConfirm}
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Book Session →
            </Button>
            
            <Button
              variant="outline"
              className="w-full py-4 rounded-full text-base font-medium border-2 border-[#5C3106] text-gray-800 hover:bg-gray-50 transition-all"
              onClick={onCancel}
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};