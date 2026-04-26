import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { requireSameOrigin } from "@/lib/csrf";

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getAdminSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}
