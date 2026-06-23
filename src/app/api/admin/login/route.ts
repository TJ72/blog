import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = form.get("password");
  const expected = process.env.ADMIN_TOKEN;

  const back = new URL("/admin", request.url);

  // Wrong or unconfigured password -> bounce back with an error flag (303 so the
  // browser re-issues a GET to /admin after the POST).
  if (!expected || typeof password !== "string" || password !== expected) {
    back.searchParams.set("error", "1");
    return NextResponse.redirect(back, 303);
  }

  const res = NextResponse.redirect(back, 303);
  res.cookies.set(ADMIN_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
