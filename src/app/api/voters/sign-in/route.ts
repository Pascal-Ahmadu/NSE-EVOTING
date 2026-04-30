import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifySecret } from "@/lib/password";
import { getActiveVoterPasswordHash } from "@/lib/credentials";
import { isRevoked } from "@/lib/revocation";
import { getVoterSession } from "@/lib/session";
import { requireSameOrigin } from "@/lib/csrf";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { VoterIdInput, parseJson } from "@/lib/zod-helpers";
import { audit, requestMeta } from "@/lib/audit";
import { log } from "@/lib/logger";

const Body = z.object({
  voterId: VoterIdInput,
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
  const { voterId, password } = parsed.data;

  const idLimit = checkRateLimit({
    key: `voter-signin:id:${voterId}`,
    limit: 5,
    windowMs: 5 * 60_000,
  });
  if (!idLimit.ok) return rateLimitResponse(idLimit.retryAfterSec);

  const meta = requestMeta(req);
  const voter = await db.voter.findUnique({ where: { voterId } });
  const revoked = voter ? await isRevoked("voter", voter.id) : false;
  const activeHash = voter && !revoked ? await getActiveVoterPasswordHash(voter.id) : null;
  if (!voter || revoked || !activeHash || !(await verifySecret(password, activeHash))) {
    log.warn("voter_signin_failed", { voterId, ip });
    await audit({
      actorType: "voter",
      actorId: null,
      actorLabel: voterId,
      action: "voter.signin.failed",
      meta,
    });
    return NextResponse.json(
      {
        error:
          "We couldn't sign you in. Check your NSE number and password — or contact your election administrator.",
      },
      { status: 401 },
    );
  }

  const session = await getVoterSession();
  session.voterId = voter.id;
  await session.save();

  await audit({
    actorType: "voter",
    actorId: voter.id,
    actorLabel: voter.voterId,
    action: "voter.signin",
    meta,
  });

  return NextResponse.json({
    voter: {
      id: voter.id,
      name: voter.name,
      email: voter.email,
      voterId: voter.voterId,
    },
  });
}
