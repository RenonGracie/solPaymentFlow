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
 * Simplified calendar warmup - just check if the endpoint is responsive
 * No heavy data loading during preload phase
 */
const warmupCalendarAvailability = async (
  therapistEmail: string,
  timeout: number = 3000
): Promise<void> => {
  console.log(`[Preloader] 🗓️ Pinging calendar endpoint for: ${therapistEmail}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
    const url = new URL(`/therapists/${encodeURIComponent(therapistEmail)}/availability`, API_BASE);
    url.searchParams.set("live_check", "false"); // Just ping, don't do live checks
    url.searchParams.set("quick_check", "true"); // Quick health check only
    
    const response = await fetch(url.toString(), {
      method: 'HEAD', // Just check if endpoint exists
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok || response.status === 405) { // 405 = Method Not Allowed, but endpoint exists
      console.log(`[Preloader] ✅ Calendar endpoint responsive for ${therapistEmail}`);
    } else {
      console.warn(`[Preloader] ⚠️ Calendar endpoint status ${response.status} for ${therapistEmail}`);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Preloader] ⏱️ Calendar ping timeout for ${therapistEmail}`);
    } else {
      console.warn(`[Preloader] ❌ Calendar ping failed for ${therapistEmail}:`, error);
    }
  }
};

/**
 * Preload all data for a single therapist
 */
export const preloadTherapistData = async (
  therapistData: TMatchedTherapistData,
  _clientState?: string, // Prefix with underscore to indicate intentionally unused
  _paymentType?: string, // Simplified - not needed for lightweight preload
  options: PreloadOptions & { isPrimary?: boolean } = {}
): Promise<void> => {
  const { onProgress, timeout = 5000, isPrimary = false } = options; // Reduced default timeout
  const therapist = therapistData.therapist;
  
  console.log(`[Preloader] 🔄 Starting lightweight preload for: ${therapist.intern_name}${isPrimary ? ' (PRIMARY)' : ''}`);
  
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

  // Add lightweight calendar ping ONLY for the primary therapist
  if (isPrimary && therapist.email) {
    const emailAddress = therapist.email;
    tasks.push({
      name: 'Calendar Ping',
      task: () => warmupCalendarAvailability(emailAddress, 2000) // Short 2s timeout for ping
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
  options: PreloadOptions = {}
): Promise<void> => {
  console.log(`[Preloader] 🚀 Starting lightweight batch preload for ${therapistsList.length} therapists`);
  
  // Only preload the first therapist with calendar ping
  if (therapistsList.length > 0) {
    await preloadTherapistData(therapistsList[0], clientState, paymentType, { 
      ...options,
      isPrimary: true,
      timeout: 3000 // Fast timeout for primary
    });
  }

  // Preload remaining therapists in parallel (images/videos only, no calendar)
  if (therapistsList.length > 1) {
    const remainingTherapists = therapistsList.slice(1, 4); // Limit to first 4 total to avoid overload
    const parallelPreloads = remainingTherapists.map(therapist => 
      preloadTherapistData(therapist, clientState, paymentType, { 
        ...options, 
        isPrimary: false,
        timeout: 2000 // Very short timeout for background
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
      console.log(`[Preloader] 🔄 Creating lightweight preloader for ${therapistsList.length} therapists`);
      
      // Simplified - no global timeout, just let individual timeouts handle it
      await preloadMultipleTherapists(therapistsList, clientState, paymentType);
      console.log(`[Preloader] ✅ Lightweight preloader completed successfully`);
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
