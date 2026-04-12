import "server-only";

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

import { getServerEnv, isDatabaseConfigured } from "@/lib/server/env";

const DATABASE_CONNECTION_TIMEOUT_MS = 5000;
const DATABASE_QUERY_TIMEOUT_MS = 10000;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("Database is not configured.");
    this.name = "DatabaseNotConfiguredError";
  }
}

export type DatabaseRequestContext = {
  actorId?: string | null;
  actorRole?: string | null;
  actorEmail?: string | null;
  fantasyEntryId?: string | null;
  requestId: string;
  clientIp?: string | null;
  origin?: string | null;
  userAgent?: string | null;
};

export type DatabaseTransaction = {
  client: PoolClient;
  query<TResult extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<QueryResult<TResult>>;
};

declare global {
  // eslint-disable-next-line no-var
  var __mmmmaDatabasePool: Pool | undefined;
}

function createPool() {
  const env = getServerEnv();

  if (!isDatabaseConfigured(env)) {
    throw new DatabaseNotConfiguredError();
  }

  return new Pool({
    connectionString: env.databaseUrl!,
    max: env.databasePoolMaxConnections,
    connectionTimeoutMillis: DATABASE_CONNECTION_TIMEOUT_MS,
    query_timeout: DATABASE_QUERY_TIMEOUT_MS,
    statement_timeout: DATABASE_QUERY_TIMEOUT_MS,
    ssl:
      env.databaseSslMode === "require"
        ? {
            rejectUnauthorized: false
          }
        : undefined
  });
}

export function getDatabasePool() {
  if (!globalThis.__mmmmaDatabasePool) {
    globalThis.__mmmmaDatabasePool = createPool();
  }

  return globalThis.__mmmmaDatabasePool;
}

export async function queryDatabase<TResult extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: readonly unknown[]
) {
  return getDatabasePool().query<TResult>(text, values as unknown[]);
}

async function applyRequestContext(client: PoolClient, context: DatabaseRequestContext) {
  await client.query(
    `
      select app.set_request_context(
        $1::uuid,
        $2::text,
        $3::text,
        $4::uuid,
        $5::text,
        $6::inet,
        $7::text,
        $8::text
      )
    `,
    [
      context.actorId ?? null,
      context.actorRole ?? null,
      context.actorEmail ?? null,
      context.fantasyEntryId ?? null,
      context.requestId,
      context.clientIp ?? null,
      context.origin ?? null,
      context.userAgent ?? null
    ]
  );
}

async function applyEncryptionKeyIfNeeded(client: PoolClient) {
  const env = getServerEnv();

  if (!env.appEncryptionKey) {
    throw new Error("APP_ENCRYPTION_KEY is required for this operation.");
  }

  await client.query("select set_config('app.encryption_key', $1, true)", [env.appEncryptionKey]);
}

export async function withDatabaseTransaction<TResult>(
  context: DatabaseRequestContext,
  execute: (transaction: DatabaseTransaction) => Promise<TResult>,
  options?: {
    requiresEncryptionKey?: boolean;
  }
) {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await applyRequestContext(client, context);

    if (options?.requiresEncryptionKey) {
      await applyEncryptionKeyIfNeeded(client);
    }

    const result = await execute({
      client,
      query(text, values) {
        return client.query(text, values as unknown[]);
      }
    });

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
