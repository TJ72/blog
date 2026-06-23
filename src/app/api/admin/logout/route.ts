import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  // Relative Location — see the note in login/route.ts: an absolute redirect
  // built from request.url would point at Cloud Run's internal 0.0.0.0:8080.
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: "/admin" },
  });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
