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
    select: { name: true, status: true },
  });
  if (!election) {
    return NextResponse.json({ error: "Election not found" }, { status: 404 });
  }
  if (election.status !== "open") {
    return NextResponse.json(
      { error: "Only open elections can be closed" },
      { status: 409 },
    );
  }
  await db.election.update({
    where: { id },
    data: { status: "closed", closedAt: new Date() },
  });

  const admin = await db.admin.findUnique({
    where: { id: guard.value.adminId },
    select: { email: true },
  });
  const meta = requestMeta(req);
  await audit({
    adminId: guard.value.adminId,
    adminEmail: admin?.email ?? null,
    action: "election.close",
    targetType: "election",
    targetId: id,
    details: { name: election.name },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}
