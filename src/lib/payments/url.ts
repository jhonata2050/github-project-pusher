import { getRequest } from "@tanstack/react-start/server";

/**
 * Resolves the canonical public URL for webhooks, redirects, and notifications.
 * Respects configured environment variables, reverse-proxy headers, and request origins.
 * Adheres to Engineering Law #8 (Canonical URLs).
 */
export function getCanonicalPublicUrl(req?: Request): string {
  const configured = process.env["APP_URL"] || process.env["PUBLIC_URL"] || process.env["VITE_APP_URL"];
  if (configured) return configured.replace(/\/$/, "");
  const previewHost = process.env["LOVABLE_PREVIEW_HOST"];
  if (previewHost) {
    return `${previewHost.startsWith("http") ? "" : "https://"}${previewHost}`.replace(/\/$/, "");
  }
  try {
    const request = req || getRequest();
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    if (forwardedHost && !forwardedHost.includes("localhost") && !forwardedHost.includes("127.0.0.1")) {
      return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
    }
    const origin = new URL(request.url).origin;
    if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      return origin;
    }
  } catch {}
  return "https://eqsam.com";
}

export function publicUrl(): string {
  return getCanonicalPublicUrl();
}
