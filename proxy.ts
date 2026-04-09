import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_DEFAULT_REDIRECT_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_SESSION_COOKIE_NAME,
  createAdminCredentialFingerprint,
  getAdminAuthConfig,
  getSafeAdminRedirectPath,
  verifyAdminSessionToken
} from "@/lib/admin/auth";

function createAdminApiUnauthorizedResponse(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      message
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isLoginPage = pathname === ADMIN_LOGIN_PATH;
  const isSessionRoute = pathname === "/api/admin/session";
  const config = getAdminAuthConfig();

  if (isSessionRoute) {
    return NextResponse.next();
  }

  if (isLoginPage) {
    if (!config) {
      return NextResponse.next();
    }

    const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.next();
    }

    const session = await verifyAdminSessionToken(sessionToken, config.sessionSecret);
    const credentialFingerprint = await createAdminCredentialFingerprint(
      config.username,
      config.password
    );

    if (session && session.sub === config.username && session.cf === credentialFingerprint) {
      const nextPath = getSafeAdminRedirectPath(
        request.nextUrl.searchParams.get("next"),
        ADMIN_DEFAULT_REDIRECT_PATH
      );

      return NextResponse.redirect(new URL(nextPath, request.url));
    }

    return NextResponse.next();
  }

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  if (!config) {
    if (isAdminApi) {
      return createAdminApiUnauthorizedResponse(
        "Autenticação do admin ainda não foi configurada no ambiente.",
        503
      );
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = ADMIN_LOGIN_PATH;
    redirectUrl.searchParams.set("reason", "setup");

    return NextResponse.redirect(redirectUrl);
  }

  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    if (isAdminApi) {
      return createAdminApiUnauthorizedResponse("Autenticação do admin necessária.", 401);
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = ADMIN_LOGIN_PATH;
    redirectUrl.searchParams.set("next", `${pathname}${search}`);

    return NextResponse.redirect(redirectUrl);
  }

  const session = await verifyAdminSessionToken(sessionToken, config.sessionSecret);
  const credentialFingerprint = await createAdminCredentialFingerprint(
    config.username,
    config.password
  );

  if (!session || session.sub !== config.username || session.cf !== credentialFingerprint) {
    if (isAdminApi) {
      return createAdminApiUnauthorizedResponse("Sessão inválida ou expirada.", 401);
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = ADMIN_LOGIN_PATH;
    redirectUrl.searchParams.set("next", `${pathname}${search}`);

    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
