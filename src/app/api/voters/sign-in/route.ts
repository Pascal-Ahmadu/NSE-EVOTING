import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifySecret } from "@/lib/password";
import { getVoterSession } from "@/lib/session";
import { requireSameOrigin } from "@/lib/csrf";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { Email, parseJson } from "@/lib/zod-helpers";
import { log } from "@/lib/logger";

const Body = z.object({
  email: Email,
  password: z.string().min(1, "Password is required").max(64),
});

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const ip = clientIp(req);
  const ipLimit = checkRateLimit({
    key: `voter-signin:${ip}`,
    limit: 20,
    windowMs: 5 * 60_000,
  });
  if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfterSec);

  const parsed = await parseJson(req, Body);
  if (!parsed.ok) return parsed.response;
  const { email, password } = parsed.data;

  const emailLimit = checkRateLimit({
    key: `voter-signin:email:${email}`,
    limit: 5,
    windowMs: 5 * 60_000,
  });
  if (!emailLimit.ok) return rateLimitResponse(emailLimit.retryAfterSec);

  const voter = await db.voter.findUnique({ where: { email } });
  if (!voter || !(await verifySecret(password, voter.passwordHash))) {
    log.warn("voter_signin_failed", { email, ip });
    return NextResponse.json(
      {
        error:
          "We couldn't sign you in. Check your email and password — or contact your election administrator.",
      },
      { status: 401 },
    );
  }

  const session = await getVoterSession();
  session.voterId = voter.id;
  await session.save();

  return NextResponse.json({
    voter: {
      id: voter.id,
      name: voter.name,
      email: voter.email,
      voterId: voter.voterId,
    },
  });
}
