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

  // Track visual viewport height if needed later (kept lightweight; no style writes that cause jumps)
  useEffect(() => {
    const updateVh = () => {
      const vv: VisualViewport | null | undefined = window.visualViewport;
      const height = vv?.height ? vv.height : window.innerHeight;
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

  // Expose global scroll-to-top; pages can call on transitions/submit
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
      className="antialiased overflow-y-auto overflow-x-hidden overscroll-contain"
      style={{
        height: "100svh",
        maxHeight: "100svh",
        scrollBehavior: "smooth",
      }}
    >
      {children}
    </div>
  );
}
