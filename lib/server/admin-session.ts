import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_LOGIN_PATH,
  ADMIN_SESSION_COOKIE_NAME,
  resolveAdminSessionIdentity
} from "@/lib/admin/auth";
import { getSessionAccountFromToken } from "@/lib/server/auth-store";
import { getServerEnv, isDatabaseConfigured, type ServerEnv } from "@/lib/server/env";

export type AdminSessionIdentity =
  | {
      kind: "account";
      username: string;
      displayName: string;
      role: "admin" | "operator";
    }
  | {
      kind: "fallback";
      username: string;
      displayName: string;
      role: "admin";
    };

function buildAdminLoginRedirectPath(nextPath: string) {
  return `${ADMIN_LOGIN_PATH}?next=${encodeURIComponent(nextPath)}`;
}

export async function getCurrentAdminSessionIdentity(
  env: ServerEnv = getServerEnv()
): Promise<AdminSessionIdentity | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  if (isDatabaseConfigured(env)) {
    const session = await getSessionAccountFromToken({
      acceptedRoles: ["admin", "operator"],
      sessionKind: "backoffice",
      sessionToken
    }).catch(() => null);

    if (session) {
      return {
        kind: "account",
        username: session.email,
        displayName: session.displayName,
        role: session.role as "admin" | "operator"
      };
    }
  }

  const fallbackSession = await resolveAdminSessionIdentity(sessionToken);

  if (!fallbackSession) {
    return null;
  }

  return {
    kind: "fallback",
    username: fallbackSession.username,
    displayName: fallbackSession.username,
    role: "admin"
  };
}

export async function requireAdminSessionIdentity(
  nextPath: string,
  env: ServerEnv = getServerEnv()
) {
  const identity = await getCurrentAdminSessionIdentity(env);

  if (!identity) {
    redirect(buildAdminLoginRedirectPath(nextPath));
  }

  return identity;
}
