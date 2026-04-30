import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashSecret } from "@/lib/password";
import { requireAdmin } from "@/lib/auth-guards";
import { requireSameOrigin } from "@/lib/csrf";
import { audit, requestMeta } from "@/lib/audit";
import { buildPage, parsePageParams } from "@/lib/pagination";
import { Email, Name, Password, VoterIdInput, parseJson } from "@/lib/zod-helpers";
import { getRevokedIds } from "@/lib/revocation";
import { decryptVoterFields, encryptVoter } from "@/lib/voter-pii";
import { hashPII } from "@/lib/pii";

const CreateBody = z.object({
  name: Name,
  email: Email,
  voterId: VoterIdInput,
  password: Password,
});

const SAFE_FIELDS = {
  id: true,
  name: true,
  email: true,
  voterId: true,
  registeredAt: true,
  _count: { select: { eligibilities: true } },
} as const;

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const params = parsePageParams(url.searchParams);
  const q = url.searchParams.get("q")?.trim() ?? "";

  const revokedIds = await getRevokedIds("voter");
  // Encrypted columns can't be searched by SQL `contains`. Fetch all live rows,
  // decrypt in memory, then filter + paginate. Voter counts in this app stay
  // small enough that this is fine; revisit if it grows past a few thousand.
  const baseWhere: Prisma.VoterWhereInput =
    revokedIds.length > 0 ? { id: { notIn: revokedIds } } : {};

  const allRows = await db.voter.findMany({
    where: baseWhere,
    orderBy: { registeredAt: "desc" },
    select: SAFE_FIELDS,
  });

  const decrypted = allRows.map((v) => ({
    ...decryptVoterFields(v),
    _count: v._count,
  }));

  const needle = q.toLowerCase();
  const filtered = needle
    ? decrypted.filter(
        (v) =>
          v.name.toLowerCase().includes(needle) ||
          v.email.toLowerCase().includes(needle) ||
          v.voterId.toLowerCase().includes(needle),
      )
    : decrypted;

  const total = filtered.length;
  const page = filtered.slice(params.skip, params.skip + params.take);

  return NextResponse.json(
    buildPage(
      page.map((v) => ({
        id: v.id,
        name: v.name,
        email: v.email,
        voterId: v.voterId,
        registeredAt: v.registeredAt.toISOString(),
        ballotCount: v._count.eligibilities,
      })),
      total,
      params,
    ),
  );
}

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const parsed = await parseJson(req, CreateBody);
  if (!parsed.ok) return parsed.response;
  const { name, email, voterId, password } = parsed.data;

  // Pre-check uniqueness against the hash columns so we can return a clean 409
  // before attempting the insert. The DB unique index is the source of truth.
  const emailHash = hashPII(email);
  const voterIdHash = hashPII(voterId);
  const existing = await db.voter.findFirst({
    where: { OR: [{ emailHash }, { voterIdHash }] },
    select: { emailHash: true, voterIdHash: true },
  });
  if (existing) {
    if (existing.emailHash === emailHash) {
      return NextResponse.json(
        { error: "A voter with this email already exists" },
        { status: 409 },
      );
    }
    if (existing.voterIdHash === voterIdHash) {
      return NextResponse.json(
        { error: "A voter with this voter ID already exists" },
        { status: 409 },
      );
    }
  }

  const encrypted = encryptVoter({ name, email, voterId });
  let created;
  try {
    created = await db.voter.create({
      data: {
        ...encrypted,
        passwordHash: await hashSecret(password),
      },
      select: {
        id: true,
        registeredAt: true,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const fields = (err.meta?.target as string[] | undefined) ?? [];
      if (fields.includes("emailHash")) {
        return NextResponse.json(
          { error: "A voter with this email already exists" },
          { status: 409 },
        );
      }
      if (fields.includes("voterIdHash")) {
        return NextResponse.json(
          { error: "A voter with this voter ID already exists" },
          { status: 409 },
        );
      }
    }
    throw err;
  }

  const admin = await db.admin.findUnique({
    where: { id: guard.value.adminId },
    select: { email: true },
  });
  const meta = requestMeta(req);
  await audit({
    adminId: guard.value.adminId,
    adminEmail: admin?.email ?? null,
    action: "voter.register",
    targetType: "voter",
    targetId: created.id,
    details: { email, voterId },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json(
    {
      voter: {
        id: created.id,
        name,
        email,
        voterId,
        registeredAt: created.registeredAt.toISOString(),
        password,
      },
    },
    { status: 201 },
  );
}
