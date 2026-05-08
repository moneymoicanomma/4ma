import { NextRequest, NextResponse } from "next/server";

import { canAccessBlogAdmin } from "@/lib/server/admin-access";
import { getCurrentAdminSessionIdentity, type AdminSessionIdentity } from "@/lib/server/admin-session";
import { createBlogDraft, listAdminBlogPosts } from "@/lib/server/blog";
import { getServerEnv } from "@/lib/server/env";
import { buildRequestAuditContext } from "@/lib/server/request-context";
import { isSameOriginRequest } from "@/lib/server/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildJsonResponse(payload: object, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

async function requireBlogIdentity(): Promise<
  | {
      ok: true;
      identity: AdminSessionIdentity;
    }
  | {
      ok: false;
      response: NextResponse;
    }
> {
  const identity = await getCurrentAdminSessionIdentity(getServerEnv());

  if (!identity) {
    return {
      ok: false,
      response: buildJsonResponse({ ok: false, message: "Sessao administrativa invalida." }, 401)
    };
  }

  if (!canAccessBlogAdmin(identity.role)) {
    return {
      ok: false,
      response: buildJsonResponse({ ok: false, message: "Sem permissao para acessar o blog." }, 403)
    };
  }

  return { ok: true, identity };
}

export async function GET() {
  const identity = await requireBlogIdentity();

  if (!identity.ok) {
    return identity.response;
  }

  try {
    return buildJsonResponse({ ok: true, posts: await listAdminBlogPosts() });
  } catch (error) {
    console.error("[admin blog] list posts failed", error);

    return buildJsonResponse(
      { ok: false, message: "Nao foi possivel carregar os posts agora." },
      503
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return buildJsonResponse({ ok: false, message: "Origem nao permitida." }, 403);
  }

  const identity = await requireBlogIdentity();

  if (!identity.ok) {
    return identity.response;
  }

  try {
    const postId = await createBlogDraft(identity.identity, buildRequestAuditContext(request));

    return buildJsonResponse({ ok: true, postId });
  } catch (error) {
    console.error("[admin blog] create draft failed", error);

    return buildJsonResponse(
      { ok: false, message: "Nao foi possivel criar o rascunho agora." },
      503
    );
  }
}
