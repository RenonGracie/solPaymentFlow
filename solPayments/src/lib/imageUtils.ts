// src/lib/imageUtils.ts

/**
 * Configuration for image CDN
 */
const IMAGE_CONFIG = {
    cloudfrontUrl: process.env.NEXT_PUBLIC_CLOUDFRONT_URL || '',
    s3BucketUrl: 'https://therapists-personal-data.s3.us-east-2.amazonaws.com',
    defaultImagePath: '/images',
    defaultExtension: '.jpg',
    supportedExtensions: /\.(jpg|jpeg|png|gif|webp)$/i,
  };
  
  /**
   * Get the full URL for a therapist's image
   * Handles various input formats:
   * - Full URLs (returned as-is)
   * - Email addresses (converted to CDN URLs)
   * - S3 paths (converted to CDN URLs)
   * 
   * @param imageLink - The image reference from the database
   * @param options - Optional configuration
   * @returns The full URL to the image
   */
  export function getTherapistImageUrl(
    imageLink: string | null | undefined,
    options?: {
      size?: 'thumb' | 'medium' | 'full';
      fallbackImage?: string;
    }
  ): string {
    const { fallbackImage = '' } = options || {};
    
    if (!imageLink) return fallbackImage;
    
    // If it's already a full URL, return it
    if (imageLink.startsWith('http://') || imageLink.startsWith('https://')) {
      return imageLink;
    }
    
    // Extract the filename from various formats
    let filename = extractFilename(imageLink);
    
    // Ensure the filename has an extension
    if (!filename.match(IMAGE_CONFIG.supportedExtensions)) {
      filename = `${filename}${IMAGE_CONFIG.defaultExtension}`;
    }
    
    // Add size prefix if specified
    if (options?.size && options.size !== 'full') {
      const nameParts = filename.split('.');
      const extension = nameParts.pop();
      const baseName = nameParts.join('.');
      filename = `${baseName}-${options.size}.${extension}`;
    }
    
    // Return CloudFront URL if available, otherwise S3 URL
    if (IMAGE_CONFIG.cloudfrontUrl) {
      return `${IMAGE_CONFIG.cloudfrontUrl}/${filename}`;
    }
    
    return `${IMAGE_CONFIG.s3BucketUrl}${IMAGE_CONFIG.defaultImagePath}/${filename}`;
  }
  
  /**
   * Extract filename from various input formats
   */
  function extractFilename(input: string): string {
    // If it's an email, use it directly
    if (input.includes('@')) {
      return input;
    }
    
    // If it's an S3 path, extract the filename
    if (input.includes('therapists-personal-data')) {
      // Try to match the pattern: .../images/filename
      const matches = input.match(/images\/(.+)$/);
      if (matches && matches[1]) {
        return matches[1];
      }
    }
    
    // If it contains slashes, get the last part
    if (input.includes('/')) {
      const parts = input.split('/');
      return parts[parts.length - 1];
    }
    
    // Otherwise, return as-is
    return input;
  }
  
  /**
   * Generate a therapist image URL based on their email
   */
  export function getTherapistImageByEmail(
    email: string | null | undefined,
    options?: Parameters<typeof getTherapistImageUrl>[1]
  ): string {
    if (!email) return options?.fallbackImage || '';
    
    // Clean the email (remove any whitespace, lowercase)
    const cleanEmail = email.trim().toLowerCase();
    
    return getTherapistImageUrl(cleanEmail, options);
  }
  
  /**
   * Preload images for better performance
   */
  export function preloadTherapistImages(therapists: Array<{ email?: string; image_link?: string }>) {
    if (typeof window === 'undefined') return;
    
    therapists.forEach(therapist => {
      const imageUrl = getTherapistImageUrl(therapist.image_link || therapist.email);
      if (imageUrl) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = imageUrl;
        document.head.appendChild(link);
      }
    });
  }
  
  /**
   * Get optimized image props for Next.js Image component
   */
  export function getOptimizedImageProps(
    imageLink: string | null | undefined,
    alt: string,
    size: 'avatar' | 'profile' | 'full' = 'profile'
  ) {
    const sizes = {
      avatar: { width: 80, height: 80 },
      profile: { width: 200, height: 200 },
      full: { width: 800, height: 800 },
    };
    
    const sizeConfig = sizes[size];
    
    return {
      src: getTherapistImageUrl(imageLink) || '/placeholder-therapist.jpg',
      alt,
      width: sizeConfig.width,
      height: sizeConfig.height,
      className: size === 'full' ? 'object-cover' : 'rounded-full object-cover',
    };
  }