import { NextRequest, NextResponse } from "next/server";

import { canAccessBlogAdmin } from "@/lib/server/admin-access";
import { getCurrentAdminSessionIdentity, type AdminSessionIdentity } from "@/lib/server/admin-session";
import {
  getAdminBlogPost,
  publishAdminBlogPost,
  saveAdminBlogPost,
  unpublishAdminBlogPost
} from "@/lib/server/blog";
import { getServerEnv } from "@/lib/server/env";
import { buildRequestAuditContext } from "@/lib/server/request-context";
import { isSameOriginRequest, readJsonRequestBody } from "@/lib/server/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BLOG_SAVE_BODY_BYTES = 768 * 1024;
const MAX_BLOG_ACTION_BODY_BYTES = 32 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type BlogPostActionBody = {
  action?: "publish" | "unpublish";
};

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

async function resolvePostId(params: Promise<{ postId: string }>) {
  const { postId } = await params;

  return UUID_PATTERN.test(postId) ? postId : null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  const identity = await requireBlogIdentity();

  if (!identity.ok) {
    return identity.response;
  }

  try {
    const postId = await resolvePostId(context.params);

    if (!postId) {
      return buildJsonResponse({ ok: false, message: "ID de post invalido." }, 400);
    }

    const post = await getAdminBlogPost(postId);

    if (!post) {
      return buildJsonResponse({ ok: false, message: "Post nao encontrado." }, 404);
    }

    return buildJsonResponse({ ok: true, post });
  } catch (error) {
    console.error("[admin blog] get post failed", error);

    return buildJsonResponse(
      { ok: false, message: "Nao foi possivel carregar o post agora." },
      503
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  if (!isSameOriginRequest(request)) {
    return buildJsonResponse({ ok: false, message: "Origem nao permitida." }, 403);
  }

  const identity = await requireBlogIdentity();

  if (!identity.ok) {
    return identity.response;
  }

  const requestBody = await readJsonRequestBody<unknown>(request, {
    maxBytes: MAX_BLOG_SAVE_BODY_BYTES
  });

  if (!requestBody.ok) {
    return buildJsonResponse({ ok: false, message: requestBody.message }, requestBody.status);
  }

  try {
    const postId = await resolvePostId(context.params);

    if (!postId) {
      return buildJsonResponse({ ok: false, message: "ID de post invalido." }, 400);
    }

    const result = await saveAdminBlogPost(
      postId,
      requestBody.data,
      identity.identity,
      buildRequestAuditContext(request)
    );

    return result.ok
      ? buildJsonResponse({ ok: true, post: result.post })
      : buildJsonResponse({ ok: false, message: result.message }, 400);
  } catch (error) {
    console.error("[admin blog] save post failed", error);

    return buildJsonResponse(
      { ok: false, message: "Nao foi possivel salvar o post agora." },
      503
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  if (!isSameOriginRequest(request)) {
    return buildJsonResponse({ ok: false, message: "Origem nao permitida." }, 403);
  }

  const identity = await requireBlogIdentity();

  if (!identity.ok) {
    return identity.response;
  }

  const requestBody = await readJsonRequestBody<BlogPostActionBody>(request, {
    maxBytes: MAX_BLOG_ACTION_BODY_BYTES
  });

  if (!requestBody.ok) {
    return buildJsonResponse({ ok: false, message: requestBody.message }, requestBody.status);
  }

  try {
    const postId = await resolvePostId(context.params);

    if (!postId) {
      return buildJsonResponse({ ok: false, message: "ID de post invalido." }, 400);
    }

    const requestContext = buildRequestAuditContext(request);
    const result =
      requestBody.data?.action === "publish"
        ? await publishAdminBlogPost(postId, identity.identity, requestContext)
        : requestBody.data?.action === "unpublish"
          ? await unpublishAdminBlogPost(postId, identity.identity, requestContext)
          : null;

    if (!result) {
      return buildJsonResponse({ ok: false, message: "Acao invalida." }, 400);
    }

    return result.ok
      ? buildJsonResponse({ ok: true, post: result.post })
      : buildJsonResponse({ ok: false, message: result.message }, 400);
  } catch (error) {
    console.error("[admin blog] post action failed", error);

    return buildJsonResponse(
      { ok: false, message: "Nao foi possivel atualizar o post agora." },
      503
    );
  }
}
