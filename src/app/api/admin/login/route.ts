import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSession,
  verifyPassword,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = form.get("password");

  // On a correct password, mint a signed session token (createSession returns
  // null if SESSION_SECRET is missing, so we fail closed).
  const token =
    typeof password === "string" && verifyPassword(password)
      ? createSession()
      : null;

  // Use a RELATIVE Location instead of new URL(..., request.url): behind Cloud
  // Run's proxy the standalone server sees request.url as the container's
  // internal 0.0.0.0:8080 address, so an absolute redirect sent the browser to
  // https://0.0.0.0:8080/admin. A relative Location is resolved by the browser
  // against the real public origin. 303 = re-issue as GET.
  if (!token) {
    return new NextResponse(null, {
      status: 303,
      headers: { Location: "/admin?error=1" },
    });
  }

  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: "/admin" },
  });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
