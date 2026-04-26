import { NextResponse } from "next/server";
import { getVoterSession } from "@/lib/session";
import { requireSameOrigin } from "@/lib/csrf";

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getVoterSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}
