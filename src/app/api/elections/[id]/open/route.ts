import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { requireSameOrigin } from "@/lib/csrf";
import { audit, requestMeta } from "@/lib/audit";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const election = await db.election.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      positions: {
        select: { id: true, _count: { select: { candidates: true } } },
      },
    },
  });
  if (!election) {
    return NextResponse.json({ error: "Election not found" }, { status: 404 });
  }
  if (election.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft elections can be opened" },
      { status: 409 },
    );
  }
  if (election.positions.length === 0) {
    return NextResponse.json(
      { error: "Add at least one position before opening" },
      { status: 400 },
    );
  }
  if (election.positions.some((p) => p._count.candidates === 0)) {
    return NextResponse.json(
      { error: "Every position needs at least one candidate before opening" },
      { status: 400 },
    );
  }

  const now = new Date();
  await db.$transaction([
    db.election.updateMany({
      where: { status: "open" },
      data: { status: "closed", closedAt: now },
    }),
    db.election.update({
      where: { id },
      data: { status: "open", openedAt: now },
    }),
  ]);

  const admin = await db.admin.findUnique({
    where: { id: guard.value.adminId },
    select: { email: true },
  });
  const meta = requestMeta(req);
  await audit({
    adminId: guard.value.adminId,
    adminEmail: admin?.email ?? null,
    action: "election.open",
    targetType: "election",
    targetId: id,
    details: { name: election.name },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}
