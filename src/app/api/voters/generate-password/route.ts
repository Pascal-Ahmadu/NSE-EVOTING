import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let password = "";
  for (let i = 0; i < 6; i++) {
    password += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return NextResponse.json({ password });
}
