/**
 * Analytics Utility for EQSAM CLOUD
 */

type AnalyticsEvent = "purchase" | "lead" | "sign_up" | "page_view";

export const trackEvent = (event: AnalyticsEvent, data?: Record<string, any>) => {
  // Push to DataLayer (GTM)
  if (typeof window !== "undefined" && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: event,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Console log for debugging in dev
  if (process.env['NODE_ENV'] === "development") {
    console.log(`[Analytics] Tracked: ${event}`, data);
  }
};
