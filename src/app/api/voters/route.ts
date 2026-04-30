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
  const where: Prisma.VoterWhereInput = {
    ...(revokedIds.length > 0 ? { id: { notIn: revokedIds } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { voterId: { contains: q } },
          ],
        }
      : {}),
  };

  const [rows, total] = await db.$transaction([
    db.voter.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { registeredAt: "desc" },
      select: SAFE_FIELDS,
    }),
    db.voter.count({ where }),
  ]);

  return NextResponse.json(
    buildPage(
      rows.map((v) => ({
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

  let created;
  try {
    created = await db.voter.create({
      data: {
        name,
        email,
        voterId,
        passwordHash: await hashSecret(password),
      },
      select: {
        id: true,
        name: true,
        email: true,
        voterId: true,
        registeredAt: true,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const fields = (err.meta?.target as string[] | undefined) ?? [];
      if (fields.includes("email")) {
        return NextResponse.json(
          { error: "A voter with this email already exists" },
          { status: 409 },
        );
      }
      if (fields.includes("voterId")) {
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
    details: { email: created.email, voterId: created.voterId },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json(
    {
      voter: {
        ...created,
        registeredAt: created.registeredAt.toISOString(),
        password,
      },
    },
    { status: 201 },
  );
}
