import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_LOGIN_PATH,
  ADMIN_SESSION_COOKIE_NAME,
  resolveAdminSessionIdentity
} from "@/lib/admin/auth";
import type { AdminBackofficeRole } from "@/lib/server/admin-access";
import { getSessionAccountFromToken } from "@/lib/server/auth-store";
import { getServerEnv, isDatabaseConfigured, type ServerEnv } from "@/lib/server/env";

export type AdminSessionIdentity =
  | {
      kind: "account";
      accountId: string;
      username: string;
      displayName: string;
      role: AdminBackofficeRole;
    }
  | {
      kind: "fallback";
      username: string;
      displayName: string;
      role: AdminBackofficeRole;
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
      acceptedRoles: ["admin", "operator", "auditor"],
      sessionKind: "backoffice",
      sessionToken
    }).catch(() => null);

    if (session) {
      return {
        kind: "account",
        accountId: session.accountId,
        username: session.email,
        displayName: session.displayName,
        role: session.role as AdminBackofficeRole
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
    role: fallbackSession.role
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
