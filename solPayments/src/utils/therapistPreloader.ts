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
  return new Promise((resolve, reject) => {
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

// Calendar availability preloading removed - now loaded on-demand per day for better performance

/**
 * Preload all data for a single therapist
 */
export const preloadTherapistData = async (
  therapistData: TMatchedTherapistData,
  clientState?: string,
  paymentType?: string,
  options: PreloadOptions = {}
): Promise<void> => {
  const { onProgress, timeout = 10000 } = options;
  const therapist = therapistData.therapist;
  
  console.log(`[Preloader] 🔄 Starting preload for: ${therapist.intern_name}`);
  
  const tasks = [
    {
      name: 'Profile Image',
      task: () => preloadImage(therapist.image_link || '', timeout)
    },
    {
      name: 'Welcome Video',
      task: () => preloadVideo(therapist.welcome_video || therapist.welcome_video_link || therapist.greetings_video_link || '', timeout)
    }
    // Calendar availability removed - will be loaded on-demand per day
  ];

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
  console.log(`[Preloader] 🚀 Starting batch preload for ${therapistsList.length} therapists`);
  
  // Preload the first therapist completely, then preload others in parallel
  if (therapistsList.length > 0) {
    await preloadTherapistData(therapistsList[0], clientState, paymentType, options);
  }

  // Preload remaining therapists in parallel (but with lower priority)
  if (therapistsList.length > 1) {
    const remainingTherapists = therapistsList.slice(1);
    const parallelPreloads = remainingTherapists.map(therapist => 
      preloadTherapistData(therapist, clientState, paymentType, { 
        ...options, 
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
  paymentType?: string
) => {
  return async () => {
    try {
      console.log(`[Preloader] 🔄 Creating preloader for ${therapistsList.length} therapists`);
      
      // Add a global timeout for the entire preload process
      const preloadPromise = preloadMultipleTherapists(therapistsList, clientState, paymentType);
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
