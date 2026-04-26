import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { requireSameOrigin } from "@/lib/csrf";
import { audit, requestMeta } from "@/lib/audit";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const voter = await db.voter.findUnique({
    where: { id },
    select: { email: true, voterId: true, name: true },
  });
  if (!voter) {
    return NextResponse.json({ error: "Voter not found" }, { status: 404 });
  }

  try {
    await db.voter.delete({ where: { id } });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      return NextResponse.json(
        { error: "Cannot remove a voter who has already submitted a ballot" },
        { status: 409 },
      );
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
    action: "voter.remove",
    targetType: "voter",
    targetId: id,
    details: { email: voter.email, voterId: voter.voterId, name: voter.name },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}
