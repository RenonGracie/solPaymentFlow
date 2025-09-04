"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    __appScrollToTop?: (smooth?: boolean) => void;
  }
}

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const lastScrollPosition = useRef(0);

  useEffect(() => {
    document.body.className = "antialiased";
  }, []);

  // Enhanced keyboard detection and handling
  useEffect(() => {
    let rafId: number;
    
    const handleViewportChange = () => {
      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        // Calculate keyboard height
        const windowHeight = window.innerHeight;
        const viewportHeight = vv.height;
        const kbd = Math.max(0, windowHeight - viewportHeight);
        
        // Detect if keyboard is actually visible (more than 100px difference)
        const keyboardVisible = kbd > 100;
        
        setKeyboardHeight(kbd);
        setIsKeyboardVisible(keyboardVisible);

        // Store scroll position when keyboard opens
        if (keyboardVisible && !isKeyboardVisible) {
          lastScrollPosition.current = containerRef.current?.scrollTop || 0;
        }

        // Maintain scroll position when keyboard closes
        if (!keyboardVisible && isKeyboardVisible && containerRef.current) {
          // Small delay to let the viewport settle
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = lastScrollPosition.current;
            }
          }, 50);
        }
      });
    };

    // Listen to both resize and scroll events on visualViewport
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);
    
    // Also listen to focus/blur events to detect keyboard
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.contentEditable === 'true') {
        // Ensure input is visible
        setTimeout(() => {
          target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest' 
          });
        }, 300); // Wait for keyboard animation
      }
    };

    const handleFocusOut = () => {
      // When input loses focus, prevent scroll jump
      if (containerRef.current) {
        const scrollTop = containerRef.current.scrollTop;
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = scrollTop;
          }
        }, 0);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [isKeyboardVisible]);

  // Expose global scroll-to-top
  useEffect(() => {
    const scrollTop = (smooth = true) => {
      const el = containerRef.current;
      if (!el) return;
      try {
        el.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
      } catch {
        el.scrollTop = 0;
      }
    };

    window.__appScrollToTop = scrollTop;
    const onReset = () => scrollTop(true);
    window.addEventListener("app:reset-scroll", onReset as EventListener);
    return () => {
      window.removeEventListener("app:reset-scroll", onReset as EventListener);
    };
  }, []);

  return (
    <div
      id="app-scroll-root"
      ref={containerRef}
      className="antialiased overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
      style={{
        height: isKeyboardVisible ? `${window.visualViewport?.height || window.innerHeight}px` : "100dvh",
        maxHeight: isKeyboardVisible ? `${window.visualViewport?.height || window.innerHeight}px` : "100dvh",
        transition: "none", // Prevent animation on height change
        WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
        scrollBehavior: isKeyboardVisible ? "auto" : "smooth", // Disable smooth scroll when keyboard is visible
      }}
      data-keyboard-visible={isKeyboardVisible}
    >
      {children}
    </div>
  );
}
