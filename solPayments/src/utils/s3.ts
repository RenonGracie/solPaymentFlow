// src/utils/s3.ts

export enum S3MediaType {
    IMAGE = 'image',
    WELCOME_VIDEO = 'welcome_video',
    INTRO_VIDEO = 'intro_video',
  }
  
  const S3_BUCKET_NAME = 'therapists-personal-data';
  const S3_BUCKET_URL = `https://${S3_BUCKET_NAME}.s3.us-east-2.amazonaws.com`;
  
  /**
   * Get the S3 URL for a therapist's media file
   * @param email - Therapist's email address
   * @param mediaType - Type of media (image, welcome_video, intro_video)
   * @returns The full S3 URL or null if email is not provided
   */
  export function getMediaUrl(
    email: string | null | undefined,
    mediaType: S3MediaType
  ): string | null {
    if (!email) return null;
  
    let path = '';
    
    switch (mediaType) {
      case S3MediaType.IMAGE:
        // Images are stored as: images/email@domain.com
        path = `images/${email}`;
        break;
      
      case S3MediaType.WELCOME_VIDEO:
        // Welcome videos are stored as: videos/email@domain.com_welcome
        // But some use different format, so we need to handle both
        if (email.includes('@binghamton.edu')) {
          // For binghamton emails, format is different
          path = `videos/${email.split('@')[0]}@binghamton.edu_welcome`;
        } else {
          // For solhealth emails
          path = `videos/${email}_welcome`;
        }
        break;
      
      case S3MediaType.INTRO_VIDEO:
        // Intro/greetings videos follow similar pattern
        path = `videos/${email}_intro`;
        break;
      
      default:
        return null;
    }
  
    return `${S3_BUCKET_URL}/${path}`;
  }
  
  /**
   * Get all media URLs for a therapist
   * @param email - Therapist's email address
   * @returns Object with all media URLs
   */
  export function getTherapistMediaUrls(email: string | null | undefined): {
    imageUrl: string | null;
    welcomeVideoUrl: string | null;
    introVideoUrl: string | null;
  } {
    return {
      imageUrl: getMediaUrl(email, S3MediaType.IMAGE),
      welcomeVideoUrl: getMediaUrl(email, S3MediaType.WELCOME_VIDEO),
      introVideoUrl: getMediaUrl(email, S3MediaType.INTRO_VIDEO),
    };
  }
  
  // Type guard: narrows url to string when true
  export function isPresignedUrl(url: string | null | undefined): url is string {
    return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
  }
  
  /**
   * Get the appropriate media URL, handling both presigned URLs from backend
   * and constructing URLs from email when needed
   * @param providedUrl - URL provided by backend (might be presigned)
   * @param email - Therapist's email (fallback)
   * @param mediaType - Type of media
   * @returns The appropriate URL to use
   */
  export function getMediaUrlWithFallback(
    providedUrl: string | null | undefined,
    email: string | null | undefined,
    mediaType: S3MediaType
  ): string | null {
    // If backend provided a presigned URL, use it
    if (isPresignedUrl(providedUrl)) {
      return providedUrl;
    }
    
    // Otherwise, construct the URL from email
    return getMediaUrl(email, mediaType);
  }