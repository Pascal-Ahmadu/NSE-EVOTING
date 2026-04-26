import { NextResponse } from "next/server";
import { getAdminSession, getVoterSession } from "./session";

export type Guard<T> =
  | { ok: true; value: T }
  | { ok: false; response: NextResponse };

export async function requireAdmin(): Promise<Guard<{ adminId: string }>> {
  const session = await getAdminSession();
  if (!session.adminId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, value: { adminId: session.adminId } };
}

export async function requireVoter(): Promise<Guard<{ voterId: string }>> {
  const session = await getVoterSession();
  if (!session.voterId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, value: { voterId: session.voterId } };
}
