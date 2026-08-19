import { z } from "zod";

export const publicAuthEventSchema = z.object({
  action: z.enum([
    "login.failed", 
    "signup.failed", 
    "password_reset.requested", 
    "password_reset.failed",
    "domain_validation_blocked",
    "metrics_ingestion_attempt"
  ]),
  email: z.string().trim().email().max(255).optional().nullable(),
  description: z.string().trim().min(1).max(300),
});

export const sessionEventSchema = z.object({
  action: z.enum([
    "login.succeeded",
    "logout",
    "signup.succeeded",
    "password.changed",
    "impersonation.started",
    "impersonation.ended",
    "security.unauthorized_access",
  ]),
  description: z.string().trim().min(1).max(300),
  entityType: z.string().trim().max(80).optional(),
  entityId: z.string().trim().max(120).optional(),
});