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
  
  // Timezone display names for user-friendly display
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
      // Parse EST time
      const [hours, minutes] = estTime.split(':').map(Number);
  
      // Create a datetime in EST for the selected date
      const estDateTime = new Date(selectedDate);
      estDateTime.setHours(hours, minutes, 0, 0);
  
      // Create EST datetime with explicit timezone
      const estISOString = estDateTime.toISOString().split('T')[0] + `T${estTime}:00-05:00`;
      const estDateTimeWithTZ = new Date(estISOString);
  
      // Convert to user's timezone
      const userTimeString = estDateTimeWithTZ.toLocaleTimeString('en-US', {
        timeZone: userTimezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
  
      console.log(`[Timezone Conversion] EST ${estTime} → ${userTimeString} (${userTimezone})`);
      return userTimeString;
    } catch (error) {
      console.error(`[Timezone Conversion] Error converting EST ${estTime} to ${userTimezone}:`, error);
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
    selectedDate: Date
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
  
      // Convert to 24-hour format in user's timezone
      if (period === 'pm' && hour !== 12) {
        hour += 12;
      } else if (period === 'am' && hour === 12) {
        hour = 0;
      }
  
      // Create datetime in user's timezone
      const userDateTime = new Date(selectedDate);
      userDateTime.setHours(hour, minute, 0, 0);
  
      // Convert to EST
      const estTimeString = userDateTime.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
  
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
    const timezoneDisplay = TIMEZONE_DISPLAY_MAP[userTimezone] || 'EST';
  
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
   * Get display timezone abbreviation
   * @param timezone - IANA timezone string
   * @returns User-friendly abbreviation (e.g., "PST", "EST")
   */
  export const getTimezoneDisplay = (timezone: string): string => {
    return TIMEZONE_DISPLAY_MAP[timezone] || "EST";
  };