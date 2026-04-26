import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { requireSameOrigin } from "@/lib/csrf";
import { audit, requestMeta } from "@/lib/audit";
import { buildPage, parsePageParams } from "@/lib/pagination";
import { Title, Description, parseJson } from "@/lib/zod-helpers";

const CreateBody = z.object({
  name: Title,
  description: Description.optional().nullable(),
});

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const params = parsePageParams(url.searchParams);

  const [rows, total] = await db.$transaction([
    db.election.findMany({
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        openedAt: true,
        closedAt: true,
        _count: { select: { positions: true, ballots: true } },
      },
    }),
    db.election.count(),
  ]);

  return NextResponse.json(
    buildPage(
      rows.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
        openedAt: e.openedAt?.toISOString() ?? null,
        closedAt: e.closedAt?.toISOString() ?? null,
        positionCount: e._count.positions,
        ballotCount: e._count.ballots,
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
  const { name } = parsed.data;
  const description =
    parsed.data.description && parsed.data.description.length > 0
      ? parsed.data.description
      : null;

  const election = await db.election.create({
    data: { name, description },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
    },
  });

  const admin = await db.admin.findUnique({
    where: { id: guard.value.adminId },
    select: { email: true },
  });
  const meta = requestMeta(req);
  await audit({
    adminId: guard.value.adminId,
    adminEmail: admin?.email ?? null,
    action: "election.create",
    targetType: "election",
    targetId: election.id,
    details: { name: election.name },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json(
    {
      election: {
        ...election,
        createdAt: election.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
