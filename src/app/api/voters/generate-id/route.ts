import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { hashPII } from "@/lib/pii";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeSuffix(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}

export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = `NSE-${makeSuffix(4)}`;
    const exists = await db.voter.findUnique({
      where: { voterIdHash: hashPII(candidate) },
      select: { id: true },
    });
    if (!exists) return NextResponse.json({ voterId: candidate });
  }
  return NextResponse.json(
    { error: "Could not generate a unique voter ID" },
    { status: 500 },
  );
}
