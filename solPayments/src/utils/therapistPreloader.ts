// Therapist Data Preloader Utility
import { TMatchedTherapistData } from "@/api/types/therapist.types";

interface PreloadProgress {
  total: number;
  completed: number;
  currentTask: string;
}

interface PreloadOptions {
  onProgress?: (progress: PreloadProgress) => void;
  timeout?: number; // Timeout for each individual preload task
}

/**
 * Preload therapist image with timeout and error handling
 */
const preloadImage = (src: string, timeout: number = 10000): Promise<void> => {
  return new Promise((resolve) => {
    if (!src || typeof src !== 'string') {
      resolve(); // Skip invalid URLs
      return;
    }

    const cleanSrc = src.trim();
    if (!cleanSrc.startsWith('http://') && !cleanSrc.startsWith('https://')) {
      resolve(); // Skip non-HTTP URLs
      return;
    }

    const img = new Image();
    const timer = setTimeout(() => {
      console.warn(`[Preloader] Image timeout: ${cleanSrc}`);
      resolve(); // Don't fail the entire process for one image
    }, timeout);

    img.onload = () => {
      clearTimeout(timer);
      console.log(`[Preloader] ✅ Image loaded: ${cleanSrc}`);
      resolve();
    };

    img.onerror = () => {
      clearTimeout(timer);
      console.warn(`[Preloader] ❌ Image failed: ${cleanSrc}`);
      resolve(); // Don't fail the entire process for one image
    };

    img.src = cleanSrc;
  });
};

/**
 * Preload video metadata (check if video exists and is accessible)
 */
const preloadVideo = (videoUrl: string, timeout: number = 5000): Promise<void> => {
  return new Promise((resolve) => {
    if (!videoUrl || typeof videoUrl !== 'string') {
      resolve();
      return;
    }

    const cleanUrl = videoUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      resolve();
      return;
    }

    // For YouTube videos, we can check if the video exists
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      // Extract video ID
      const videoIdMatch = cleanUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu.be\/)([^&\n?#]+)/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        
        // Preload the thumbnail as a proxy for video availability
        preloadImage(thumbnailUrl, timeout)
          .then(() => {
            console.log(`[Preloader] ✅ Video verified: ${cleanUrl}`);
            resolve();
          })
          .catch(() => {
            console.warn(`[Preloader] ❌ Video verification failed: ${cleanUrl}`);
            resolve();
          });
        return;
      }
    }

    // For other video types, just resolve (we can't easily preload them)
    console.log(`[Preloader] ℹ️ Video noted: ${cleanUrl}`);
    resolve();
  });
};

/**
 * Warm-up calendar availability for primary therapist during loading screen
 * This is a targeted preload to eliminate cold start without phantom requests
 */
const warmupCalendarAvailability = async (
  therapistEmail: string,
  timezone: string = "America/New_York",
  paymentType: string = "cash_pay",
  timeout: number = 8000
): Promise<void> => {
  console.log(`[Preloader] 🗓️ Warming up calendar for: ${therapistEmail}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Get current month for immediate display
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
    const url = new URL(`/therapists/${encodeURIComponent(therapistEmail)}/availability`, API_BASE);
    url.searchParams.set("year", year.toString());
    url.searchParams.set("month", month.toString());
    url.searchParams.set("timezone", timezone);
    url.searchParams.set("payment_type", paymentType);
    url.searchParams.set("live_check", "true");
    url.searchParams.set("slot_minutes", "60");
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[Preloader] ✅ Calendar warmed up for ${therapistEmail} - found ${Object.keys(data.days || {}).length} days`);
    } else {
      console.warn(`[Preloader] ⚠️ Calendar warmup response not OK: ${response.status} for ${therapistEmail}`);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Preloader] ⏱️ Calendar warmup timeout for ${therapistEmail}`);
    } else {
      console.warn(`[Preloader] ❌ Calendar warmup failed for ${therapistEmail}:`, error);
    }
  }
};

/**
 * Preload all data for a single therapist
 */
export const preloadTherapistData = async (
  therapistData: TMatchedTherapistData,
  _clientState?: string, // Prefix with underscore to indicate intentionally unused
  paymentType?: string,
  options: PreloadOptions & { isPrimary?: boolean; userTimezone?: string } = {}
): Promise<void> => {
  const { onProgress, timeout = 10000, isPrimary = false, userTimezone } = options;
  const therapist = therapistData.therapist;
  
  console.log(`[Preloader] 🔄 Starting preload for: ${therapist.intern_name}${isPrimary ? ' (PRIMARY)' : ''}`);
  
  const tasks = [
    {
      name: 'Profile Image',
      task: () => preloadImage(therapist.image_link || '', timeout)
    },
    {
      name: 'Welcome Video',
      task: () => preloadVideo(therapist.welcome_video || therapist.welcome_video_link || therapist.greetings_video_link || '', timeout)
    }
  ];

  // Add calendar warmup ONLY for the primary therapist to eliminate cold start
  if (isPrimary && therapist.email) {
    const emailAddress = therapist.email; // TypeScript assertion for non-null
    tasks.push({
      name: 'Calendar Availability',
      task: () => warmupCalendarAvailability(
        emailAddress,
        userTimezone || "America/New_York",
        paymentType || "cash_pay",
        timeout
      )
    });
  }

  let completed = 0;
  const total = tasks.length;

  for (const { name, task } of tasks) {
    onProgress?.({ total, completed, currentTask: name });
    
    try {
      await task();
      completed++;
      console.log(`[Preloader] ✅ ${name} completed for ${therapist.intern_name}`);
    } catch (error) {
      completed++;
      console.warn(`[Preloader] ❌ ${name} failed for ${therapist.intern_name}:`, error);
    }
  }

  onProgress?.({ total, completed, currentTask: 'Complete' });
  console.log(`[Preloader] 🎯 Preload complete for: ${therapist.intern_name}`);
};

/**
 * Preload data for multiple therapists
 */
export const preloadMultipleTherapists = async (
  therapistsList: TMatchedTherapistData[],
  clientState?: string,
  paymentType?: string,
  options: PreloadOptions & { userTimezone?: string } = {}
): Promise<void> => {
  console.log(`[Preloader] 🚀 Starting batch preload for ${therapistsList.length} therapists`);
  
  // Preload the first therapist completely with calendar warmup
  if (therapistsList.length > 0) {
    await preloadTherapistData(therapistsList[0], clientState, paymentType, { 
      ...options,
      isPrimary: true // This will trigger calendar warmup
    });
  }

  // Preload remaining therapists in parallel (no calendar warmup, lower priority)
  if (therapistsList.length > 1) {
    const remainingTherapists = therapistsList.slice(1);
    const parallelPreloads = remainingTherapists.map(therapist => 
      preloadTherapistData(therapist, clientState, paymentType, { 
        ...options, 
        isPrimary: false,
        timeout: (options.timeout || 10000) * 0.5 // Shorter timeout for background preloading
      })
    );

    // Don't await these - let them complete in the background
    Promise.allSettled(parallelPreloads).then(() => {
      console.log(`[Preloader] 🎯 Background preload complete for ${remainingTherapists.length} additional therapists`);
    });
  }
};

/**
 * Create a preload function for use with LoadingScreen
 */
export const createTherapistPreloader = (
  therapistsList: TMatchedTherapistData[],
  clientState?: string,
  paymentType?: string,
  userTimezone?: string
) => {
  return async () => {
    try {
      console.log(`[Preloader] 🔄 Creating preloader for ${therapistsList.length} therapists`);
      console.log(`[Preloader] 🌍 User timezone: ${userTimezone || 'America/New_York (default)'}`);
      console.log(`[Preloader] 💳 Payment type: ${paymentType || 'cash_pay (default)'}`);
      
      // Add a global timeout for the entire preload process
      const preloadPromise = preloadMultipleTherapists(therapistsList, clientState, paymentType, {
        userTimezone
      });
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Preloader global timeout (15 seconds)'));
        }, 15000);
      });
      
      await Promise.race([preloadPromise, timeoutPromise]);
      console.log(`[Preloader] ✅ Preloader completed successfully`);
    } catch (error) {
      console.error(`[Preloader] ❌ Preloader failed:`, error);
      // Don't throw - let the loading screen proceed anyway
    }
  };
};

/**
 * Standalone function to warm up a specific therapist's calendar
 * Can be used independently during loading screens or user interactions
 */
export const warmupTherapistCalendar = warmupCalendarAvailability;
