// solPayments/src/utils/timezoneUtils.ts
// Timezone conversion utilities for handling EST API times and user timezones

export interface TimeSlotMapping {
    displayTime: string;      // "3:00 PM" - what user sees
    originalEST: string;      // "18:00" - original EST time from API
    userTimezone: string;     // "America/Los_Angeles" - user's timezone
    timezoneDisplay: string;  // "PST" - user-friendly timezone abbreviation
  }
  
  // State to timezone mapping (IANA format)
  export const STATE_TIMEZONE_MAP: Record<string, string> = {
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
  
  // Timezone display names for user-friendly display (STANDARD TIME ONLY)
  export const TIMEZONE_DISPLAY_MAP: Record<string, string> = {
    "America/New_York": "EST",
    "America/Chicago": "CST",
    "America/Denver": "MST",
    "America/Phoenix": "MST", // Arizona doesn't observe DST
    "America/Los_Angeles": "PST",
    "America/Anchorage": "AK",
    "Pacific/Honolulu": "HI",
  };
  
  /**
   * Convert EST time from API to user's timezone for display
   * @param estTime - Time in EST format from API (e.g., "18:00")
   * @param userTimezone - User's IANA timezone (e.g., "America/Los_Angeles")
   * @param selectedDate - The date for the appointment
   * @returns Formatted time string in user's timezone (e.g., "3:00 PM")
   */
  export const convertESTToUserTime = (
    estTime: string,
    userTimezone: string,
    selectedDate: Date
  ): string => {
    try {
      // Parse EST time (backend always sends times as EST)
      const [hours, minutes] = estTime.split(':').map(Number);
  
      // Create an ISO string representing EST time as UTC+5 (EST is always UTC-5)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
  
      // Simple timezone conversion using standard offsets
  
      // Convert to user's timezone using standard offsets
      let userOffsetHours;
      switch (userTimezone) {
        case 'America/Los_Angeles':
          userOffsetHours = 8; // PST is UTC-8
          break;
        case 'America/Denver':
          userOffsetHours = 7; // MST is UTC-7
          break;
        case 'America/Chicago':
          userOffsetHours = 6; // CST is UTC-6
          break;
        case 'America/New_York':
          userOffsetHours = 5; // EST is UTC-5
          break;
        case 'America/Phoenix':
          userOffsetHours = 7; // MST is UTC-7 (no DST)
          break;
        case 'Pacific/Honolulu':
          userOffsetHours = 10; // HST is UTC-10
          break;
        default:
          userOffsetHours = 5; // Default to EST
          break;
      }
  
      // Calculate the time difference between EST and user timezone
      const timeDifference = 5 - userOffsetHours; // EST (5) minus user offset
      const userHour = hours + timeDifference;
  
      // Handle day boundary crossings
      let finalHour = userHour;
      if (finalHour < 0) {
        finalHour += 24;
      } else if (finalHour >= 24) {
        finalHour -= 24;
      }
  
      // Format as 12-hour time
      const period = finalHour >= 12 ? 'PM' : 'AM';
      const displayHour = finalHour === 0 ? 12 : finalHour > 12 ? finalHour - 12 : finalHour;
      const userTimeString = `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  
      console.log(`[Timezone Conversion] ${estTime} EST → ${userTimeString} (${userTimezone})`);
      return userTimeString;
    } catch (error) {
      console.error(`[Timezone Conversion] Error converting ${estTime} to ${userTimezone}:`, error);
      // Fallback: return original time formatted as 12-hour
      const [hours, minutes] = estTime.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
  };
  
  /**
   * Convert user's selected time back to EST for backend
   * @param userTime - Time selected by user (e.g., "3:00 PM")
   * @param userTimezone - User's IANA timezone (e.g., "America/Los_Angeles")
   * @param selectedDate - The date for the appointment
   * @returns EST time in 24-hour format (e.g., "18:00")
   */
  export const convertUserTimeToEST = (
    userTime: string,
    userTimezone: string,
    selectedDate?: Date
  ): string => {
    try {
      // Parse user time
      const timeMatch = userTime.toLowerCase().match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)$/i);
      if (!timeMatch) {
        throw new Error(`Invalid time format: ${userTime}`);
      }
  
      let hour = parseInt(timeMatch[1], 10);
      const minute = parseInt(timeMatch[2] || '0', 10);
      const period = timeMatch[3].toLowerCase();
  
      // Convert to 24-hour format
      if (period === 'pm' && hour !== 12) {
        hour += 12;
      } else if (period === 'am' && hour === 12) {
        hour = 0;
      }
  
      // Get standard timezone offset hours
      let userOffsetHours;
      switch (userTimezone) {
        case 'America/Los_Angeles':
          userOffsetHours = 8; // PST is UTC-8
          break;
        case 'America/Denver':
          userOffsetHours = 7; // MST is UTC-7
          break;
        case 'America/Chicago':
          userOffsetHours = 6; // CST is UTC-6
          break;
        case 'America/New_York':
          userOffsetHours = 5; // EST is UTC-5
          break;
        case 'America/Phoenix':
          userOffsetHours = 7; // MST is UTC-7 (no DST)
          break;
        case 'Pacific/Honolulu':
          userOffsetHours = 10; // HST is UTC-10
          break;
        default:
          userOffsetHours = 5; // Default to EST
          break;
      }
  
      // Calculate the time difference between user timezone and EST
      const timeDifference = userOffsetHours - 5; // User offset minus EST (5)
      const estHour = hour + timeDifference;
  
      // Handle day boundary crossings
      let finalHour = estHour;
      if (finalHour < 0) {
        finalHour += 24;
      } else if (finalHour >= 24) {
        finalHour -= 24;
      }
  
      // Format as 24-hour time string
      const estTimeString = `${String(finalHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  
      console.log(`[Timezone Conversion] ${userTime} (${userTimezone}) → ${estTimeString} EST`);
      return estTimeString;
    } catch (error) {
      console.error(`[Timezone Conversion] Error converting ${userTime} to EST:`, error);
      // Fallback: try to parse as 24-hour format
      if (userTime.includes(':')) {
        return userTime.split(' ')[0]; // Return just the time part
      }
      return "12:00"; // Ultimate fallback
    }
  };
  
  /**
   * Create a TimeSlotMapping object for a given EST time
   * @param estTime - Time in EST format from API (e.g., "18:00")
   * @param userTimezone - User's IANA timezone (e.g., "America/Los_Angeles")
   * @param selectedDate - The date for the appointment
   * @returns TimeSlotMapping object with display and original times
   */
  export const createTimeSlotMapping = (
    estTime: string,
    userTimezone: string,
    selectedDate: Date
  ): TimeSlotMapping => {
    const displayTime = convertESTToUserTime(estTime, userTimezone, selectedDate);
    const timezoneDisplay = getTimezoneDisplay(userTimezone, selectedDate);
  
    return {
      displayTime,
      originalEST: estTime,
      userTimezone,
      timezoneDisplay
    };
  };
  
  /**
   * Convert array of EST times to TimeSlotMapping array
   * @param estTimes - Array of EST times from API (e.g., ["17:00", "18:00"])
   * @param userTimezone - User's IANA timezone
   * @param selectedDate - The date for the appointment
   * @returns Array of TimeSlotMapping objects
   */
  export const convertESTTimesToUserSlots = (
    estTimes: string[],
    userTimezone: string,
    selectedDate: Date
  ): TimeSlotMapping[] => {
    return estTimes.map(estTime =>
      createTimeSlotMapping(estTime, userTimezone, selectedDate)
    );
  };
  
  /**
   * Format time with timezone suffix for confirmations
   * @param timeSlot - TimeSlotMapping object
   * @returns Formatted string like "3:00 PM PST"
   */
  export const formatTimeWithTimezone = (timeSlot: TimeSlotMapping): string => {
    return `${timeSlot.displayTime} ${timeSlot.timezoneDisplay}`;
  };
  
  /**
   * Get user's timezone based on their state
   * @param state - User's state abbreviation (e.g., "CA", "NY")
   * @returns IANA timezone string
   */
  export const getUserTimezone = (state?: string): string => {
    if (!state) {
      // Fallback to browser timezone
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
      } catch {
        return "America/New_York";
      }
    }
  
    const stateUpper = state.toUpperCase().trim();
    return STATE_TIMEZONE_MAP[stateUpper] || "America/New_York";
  };
  
  /**
   * Get display timezone abbreviation (STANDARD TIME ONLY)
   * @param timezone - IANA timezone string
   * @param date - Date (ignored - always returns standard time)
   * @returns User-friendly abbreviation (e.g., "PST", "EST", "CST", "MST")
   */
  export const getTimezoneDisplay = (timezone: string, _date?: Date): string => {
    return TIMEZONE_DISPLAY_MAP[timezone] || "EST";
  };
  
  /**
   * Check if a given date is during Daylight Saving Time for any timezone
   * @param timezone - IANA timezone string
   * @param date - Date to check
   * @returns True if the date is during DST for the given timezone
   */
  export const checkTimezoneDST = (timezone: string, date: Date): boolean => {
    // Arizona and Hawaii don't observe DST
    if (timezone === 'America/Phoenix' || timezone === 'Pacific/Honolulu') {
      return false;
    }
  
    try {
      // Use Intl.DateTimeFormat to get the timezone name which includes DST info
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short'
      });
  
      const parts = formatter.formatToParts(date);
      const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || '';
  
      // Check if the timezone name indicates daylight time
      const isDaylight = timeZoneName.includes('DT') || // EDT, PDT, CDT, MDT
                        timeZoneName.includes('Daylight') ||
                        (timezone === 'America/New_York' && timeZoneName === 'EDT') ||
                        (timezone === 'America/Los_Angeles' && timeZoneName === 'PDT') ||
                        (timezone === 'America/Chicago' && timeZoneName === 'CDT') ||
                        (timezone === 'America/Denver' && timeZoneName === 'MDT');
  
      return isDaylight;
    } catch (error) {
      console.warn(`[DST Check] Error checking DST for ${timezone}:`, error);
  
      // Fallback: manual check using offset comparison
      const januaryDate = new Date(date.getFullYear(), 0, 1);
      const januaryOffset = new Date(januaryDate.toLocaleString('en-US', { timeZone: timezone })).getTimezoneOffset();
      const currentOffset = new Date(date.toLocaleString('en-US', { timeZone: timezone })).getTimezoneOffset();
  
      return januaryOffset !== currentOffset;
    }
  };
  
  /**
   * Check if a given date is during Daylight Saving Time in Eastern timezone
   * @param date - Date to check
   * @returns True if the date is during EDT, false if EST
   */
  export const isDaylightSavingTime = (date: Date): boolean => {
    // Create a date in January (definitely standard time) for the same year
    const januaryDate = new Date(date.getFullYear(), 0, 1);
  
    // Get the timezone offset for both dates in minutes
    // Note: getTimezoneOffset() returns offset in minutes, with positive values for UTC-X
    const januaryOffset = new Date(januaryDate.toLocaleString('en-US', { timeZone: 'America/New_York' })).getTimezoneOffset();
    const currentOffset = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' })).getTimezoneOffset();
  
    // During DST, the offset is smaller (closer to UTC)
    // EST is UTC-5 (offset = 300 minutes), EDT is UTC-4 (offset = 240 minutes)
    return currentOffset < januaryOffset;
  };