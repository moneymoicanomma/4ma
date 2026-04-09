import { NextRequest, NextResponse } from "next/server";

import { EVENT_FIGHTER_SESSION_COOKIE_NAME } from "@/lib/event-fighter/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const redirectUrl = new URL("/atletas-da-edicao", request.url);
  redirectUrl.hash = "acesso";

  const response = NextResponse.redirect(redirectUrl, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff"
    }
  });

  response.cookies.set({
    name: EVENT_FIGHTER_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}
