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
  const [vh, setVh] = useState<number>(0);

  useEffect(() => {
    document.body.className = "antialiased";
  }, []);

  // Track visual viewport height to account for mobile URL bar and keyboard
  useEffect(() => {
    const updateVh = () => {
      const vv: VisualViewport | null | undefined = window.visualViewport;
      const height = vv?.height ? vv.height : window.innerHeight;
      const unit = height * 0.01; // 1% of viewport height
      document.documentElement.style.setProperty("--vvh", `${unit}px`);
      setVh(height);
    };

    updateVh();
    window.addEventListener("resize", updateVh);
    window.visualViewport?.addEventListener("resize", updateVh);
    return () => {
      window.removeEventListener("resize", updateVh);
      window.visualViewport?.removeEventListener("resize", updateVh);
    };
  }, []);

  // Expose and listen for global scroll-to-top; also auto-reset on keyboard dismiss
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

    const onFocusOut = () => {
      // When focus leaves an input, gently scroll back to top after keyboard hides
      const active = document.activeElement as HTMLElement | null;
      const isInput = !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable);
      if (!isInput) {
        setTimeout(() => scrollTop(true), 120);
      }
    };
    document.addEventListener("focusout", onFocusOut);

    return () => {
      window.removeEventListener("app:reset-scroll", onReset as EventListener);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return (
    <div
      id="app-scroll-root"
      ref={containerRef}
      className="antialiased overflow-y-auto overflow-x-hidden overscroll-contain"
      style={{
        height: "calc(var(--vvh, 1vh) * 100)",
        maxHeight: "calc(var(--vvh, 1vh) * 100)",
      }}
    >
      {children}
    </div>
  );
}
