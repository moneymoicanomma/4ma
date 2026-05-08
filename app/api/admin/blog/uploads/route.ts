import { NextRequest, NextResponse } from "next/server";

import { BLOG_UPLOAD_IMAGE_CONTENT_TYPES } from "@/lib/contracts/blog";
import { canAccessBlogAdmin } from "@/lib/server/admin-access";
import { getCurrentAdminSessionIdentity, type AdminSessionIdentity } from "@/lib/server/admin-session";
import { createBlogMediaRecord } from "@/lib/server/blog";
import { createBlogMediaUploadTarget } from "@/lib/server/blog-media-storage";
import { getServerEnv } from "@/lib/server/env";
import { buildRequestAuditContext } from "@/lib/server/request-context";
import { isSameOriginRequest, readJsonRequestBody } from "@/lib/server/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BLOG_UPLOAD_BODY_BYTES = 32 * 1024;
const MAX_BLOG_IMAGE_BYTES = 8 * 1024 * 1024;
const acceptedContentTypes = new Set<string>(BLOG_UPLOAD_IMAGE_CONTENT_TYPES);

type BlogUploadRequestBody = {
  fileName?: string;
  contentType?: string;
  byteSize?: number;
  scope?: string;
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
      response: buildJsonResponse({ ok: false, message: "Sem permissao para enviar imagens." }, 403)
    };
  }

  return { ok: true, identity };
}

function normalizeUploadBody(input: BlogUploadRequestBody | null | undefined) {
  const fileName = input?.fileName?.trim() ?? "";
  const contentType = input?.contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  const byteSize = input?.byteSize;
  const scope = input?.scope?.trim() || "draft";

  if (!fileName || fileName.length > 240) {
    return {
      ok: false as const,
      message: "Nome de arquivo invalido."
    };
  }

  if (!acceptedContentTypes.has(contentType)) {
    return {
      ok: false as const,
      message: "Formato de imagem invalido."
    };
  }

  if (
    typeof byteSize !== "number" ||
    !Number.isInteger(byteSize) ||
    byteSize <= 0 ||
    byteSize > MAX_BLOG_IMAGE_BYTES
  ) {
    return {
      ok: false as const,
      message: "Imagem grande demais."
    };
  }

  return {
    ok: true as const,
    data: {
      fileName,
      contentType,
      byteSize,
      scope
    }
  };
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return buildJsonResponse({ ok: false, message: "Origem nao permitida." }, 403);
  }

  const identity = await requireBlogIdentity();

  if (!identity.ok) {
    return identity.response;
  }

  const requestBody = await readJsonRequestBody<BlogUploadRequestBody>(request, {
    maxBytes: MAX_BLOG_UPLOAD_BODY_BYTES
  });

  if (!requestBody.ok) {
    return buildJsonResponse({ ok: false, message: requestBody.message }, requestBody.status);
  }

  const parsed = normalizeUploadBody(requestBody.data);

  if (!parsed.ok) {
    return buildJsonResponse({ ok: false, message: parsed.message }, 400);
  }

  try {
    const target = await createBlogMediaUploadTarget(parsed.data);
    const mediaId = await createBlogMediaRecord(
      {
        storageProvider: target.storageProvider,
        bucket: target.bucket,
        objectKey: target.objectKey,
        publicUrl: target.publicUrl,
        fileName: parsed.data.fileName,
        contentType: target.contentType,
        byteSize: target.byteSize
      },
      identity.identity,
      buildRequestAuditContext(request)
    );

    return buildJsonResponse({
      ok: true,
      upload: {
        ...target,
        mediaId
      }
    });
  } catch (error) {
    console.error("[admin blog] create upload failed", error);

    return buildJsonResponse(
      { ok: false, message: "Storage de imagens do blog nao esta configurado." },
      503
    );
  }
}
