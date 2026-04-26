import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashSecret, verifySecret } from "@/lib/password";
import { requireSameOrigin } from "@/lib/csrf";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { VoterIdInput, parseJson } from "@/lib/zod-helpers";

const Body = z
  .object({
    voterId: VoterIdInput,
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(4, "New password must be at least 4 characters").max(64),
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "New password must differ from the current one",
    path: ["newPassword"],
  });

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const ip = clientIp(req);
  const limit = checkRateLimit({
    key: `voter-changepassword:${ip}`,
    limit: 10,
    windowMs: 10 * 60_000,
  });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

  const parsed = await parseJson(req, Body);
  if (!parsed.ok) return parsed.response;
  const { voterId, currentPassword, newPassword } = parsed.data;

  const voter = await db.voter.findUnique({ where: { voterId } });
  if (!voter || !(await verifySecret(currentPassword, voter.passwordHash))) {
    return NextResponse.json(
      { error: "NSE number or current password is incorrect" },
      { status: 401 },
    );
  }

  await db.voter.update({
    where: { id: voter.id },
    data: { passwordHash: await hashSecret(newPassword) },
  });

  return NextResponse.json({ ok: true });
}
