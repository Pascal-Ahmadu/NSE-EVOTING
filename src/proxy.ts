import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";

interface AdminSessionData {
  adminId?: string;
}

const SESSION_COOKIE = "evoting_admin_session";
const PUBLIC_ADMIN_PATHS = ["/admin/sign-in", "/admin/change-password"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only guard /admin/* page navigations.
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    // env will throw on app boot in production; in dev, redirect to sign-in
    return NextResponse.redirect(new URL("/admin/sign-in", req.url));
  }

  const res = NextResponse.next();
  const session = await getIronSession<AdminSessionData>(req, res, {
    cookieName: SESSION_COOKIE,
    password,
  });

  if (!session.adminId) {
    const url = new URL("/admin/sign-in", req.url);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
