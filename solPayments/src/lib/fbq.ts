// lib/fbq.ts

export const fbq = (...args: any[]) => {
  if (typeof window === "undefined") return;
  if (!(window as any).fbq) return;
  (window as any).fbq(...args);
};

// Convenience wrappers
export const trackPageView = () => fbq("track", "PageView");

export const trackLead = ({
  content_name,
  content_category,
  value,
  currency = "USD",
  eventID,
  params = {},
}: {
  content_name: string;
  content_category: string;
  value?: number;
  currency?: string;
  eventID?: string;
  params?: Record<string, any>;
}) => {
  const base = { content_name, content_category, value, currency, ...params };
  if (eventID) {
    fbq("track", "Lead", base, { eventID });
  } else {
    fbq("track", "Lead", base);
  }
};

export const trackPurchase = ({
  value,
  currency = "USD",
  eventID, // optional but useful when you also send CAPI
  params = {},
}: {
  value: number;
  currency?: string;
  eventID?: string;
  params?: Record<string, any>;
}) => {
  // Standard events can take 4th "options" arg where eventID lives
  // fbq('track', 'Purchase', {value, currency}, {eventID})
  const base = { value, currency, ...params };
  if (eventID) {
    fbq("track", "Purchase", base, { eventID });
  } else {
    fbq("track", "Purchase", base);
  }
};