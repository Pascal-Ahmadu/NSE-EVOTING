import { db } from "./db";
import { log } from "./logger";

export interface AuditEntry {
  adminId: string | null;
  adminEmail: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Append-only audit. Failures are logged but never thrown — we never block
 * the user-facing action because audit logging hiccuped.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        adminId: entry.adminId,
        adminEmail: entry.adminEmail,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
  } catch (err) {
    log.error("audit_write_failed", {
      action: entry.action,
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}

export function requestMeta(req: Request): {
  ip: string;
  userAgent: string;
} {
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff
    ? xff.split(",")[0]!.trim()
    : req.headers.get("x-real-ip") ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  return { ip, userAgent };
}
