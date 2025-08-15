import { useEffect, useRef, useCallback } from 'react';

interface UseInputFocusOptions {
  scrollOffset?: number;
  scrollDelay?: number;
  preventZoom?: boolean;
}

export function useInputFocus(options: UseInputFocusOptions = {}) {
  const {
    scrollOffset = 20,
    scrollDelay = 300,
    preventZoom = true,
  } = options;
  
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const handleFocus = useCallback(() => {
    if (!inputRef.current) return;

    // Clear any pending scroll
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Delay scroll to let keyboard fully appear
    scrollTimeoutRef.current = setTimeout(() => {
      if (!inputRef.current) return;

      const element = inputRef.current;
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      
      // Check if element is below the visible area (accounting for keyboard)
      if (rect.bottom > viewportHeight - scrollOffset) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }, scrollDelay);
  }, [scrollOffset, scrollDelay]);

  const handleBlur = useCallback(() => {
    // Clear any pending scroll
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Prevent viewport from jumping
    if (window.visualViewport) {
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    // Set font size to prevent zoom on iOS
    if (preventZoom) {
      input.style.fontSize = '16px';
    }

    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);

    return () => {
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleFocus, handleBlur, preventZoom]);

  return inputRef;
} 