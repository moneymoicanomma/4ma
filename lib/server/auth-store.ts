import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { withDatabaseTransaction, queryDatabase } from "@/lib/server/database";
import type { RequestAuditContext } from "@/lib/server/request-context";
import { verifyPasswordHash } from "@/lib/server/password-hash";

type AccountRole = "admin" | "operator" | "auditor" | "fighter";
type SessionKind = "backoffice" | "fighter_portal";

type AccountRow = {
  id: string;
  email: string;
  displayName: string;
  role: AccountRole;
  status: "invited" | "active" | "locked" | "disabled";
  passwordHash: string | null;
};

export type SessionAccount = {
  sessionId: string;
  accountId: string;
  email: string;
  displayName: string;
  role: AccountRole;
};

type LoginResult = {
  account: SessionAccount;
  sessionToken: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createOpaqueSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function authenticateAccountWithPassword(options: {
  acceptedRoles: readonly AccountRole[];
  email: string;
  password: string;
  requestContext: RequestAuditContext;
  sessionKind: SessionKind;
  sessionMaxAgeSeconds: number;
  sessionMetadata?: Record<string, unknown>;
}): Promise<LoginResult | null> {
  const {
    acceptedRoles,
    email,
    password,
    requestContext,
    sessionKind,
    sessionMaxAgeSeconds,
    sessionMetadata
  } = options;

  return withDatabaseTransaction(
    {
      actorRole: "service",
      actorEmail: email,
      requestId: requestContext.requestId,
      clientIp: requestContext.clientIp,
      origin: requestContext.requestOrigin,
      userAgent: requestContext.userAgent
    },
    async (transaction) => {
      const accountResult = await transaction.query<AccountRow>(
        `
          select
            id,
            email,
            display_name as "displayName",
            role,
            status,
            password_hash as "passwordHash"
          from app.accounts
          where email = $1
            and role = any($2::app.account_role_enum[])
          limit 1
        `,
        [email, acceptedRoles]
      );

      const account = accountResult.rows[0];

      if (!account || account.status !== "active") {
        return null;
      }

      const isValidPassword = await verifyPasswordHash(password, account.passwordHash);

      if (!isValidPassword) {
        return null;
      }

      const sessionToken = createOpaqueSessionToken();
      const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000);

      const sessionInsertResult = await transaction.query<{ id: string }>(
        `
          insert into app.auth_sessions (
            account_id,
            session_kind,
            token_hash,
            request_id,
            created_ip,
            user_agent,
            metadata,
            expires_at
          )
          values ($1, $2::app.auth_session_kind_enum, $3, $4, $5::inet, $6, $7::jsonb, $8)
          returning id
        `,
        [
          account.id,
          sessionKind,
          hashToken(sessionToken),
          requestContext.requestId,
          requestContext.clientIp,
          requestContext.userAgent,
          JSON.stringify(sessionMetadata ?? {}),
          expiresAt.toISOString()
        ]
      );

      await transaction.query("update app.accounts set last_login_at = now() where id = $1", [
        account.id
      ]);

      return {
        account: {
          sessionId: sessionInsertResult.rows[0]!.id,
          accountId: account.id,
          email: account.email,
          displayName: account.displayName,
          role: account.role
        },
        sessionToken
      };
    }
  );
}

export async function getSessionAccountFromToken(options: {
  acceptedRoles: readonly AccountRole[];
  sessionKind: SessionKind;
  sessionToken: string;
}) {
  const result = await queryDatabase<{
    sessionId: string;
    accountId: string;
    email: string;
    displayName: string;
    role: AccountRole;
  }>(
    `
      select
        s.id as "sessionId",
        a.id as "accountId",
        a.email,
        a.display_name as "displayName",
        a.role
      from app.auth_sessions s
      join app.accounts a
        on a.id = s.account_id
      where s.token_hash = $1
        and s.session_kind = $2::app.auth_session_kind_enum
        and s.revoked_at is null
        and s.expires_at > now()
        and a.status = 'active'
        and a.role = any($3::app.account_role_enum[])
      limit 1
    `,
    [hashToken(options.sessionToken), options.sessionKind, options.acceptedRoles]
  );

  const account = result.rows[0] ?? null;

  if (!account) {
    return null;
  }

  void queryDatabase(
    "update app.auth_sessions set last_seen_at = now() where id = $1 and revoked_at is null",
    [account.sessionId]
  ).catch(() => {
    // Best-effort touch; authentication should not fail because the heartbeat update did.
  });

  return account;
}

export async function revokeSessionToken(sessionToken: string) {
  await queryDatabase(
    `
      update app.auth_sessions
      set revoked_at = now()
      where token_hash = $1
        and revoked_at is null
    `,
    [hashToken(sessionToken)]
  );
}
