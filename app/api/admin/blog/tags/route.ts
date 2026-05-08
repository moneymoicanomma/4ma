import { NextResponse } from "next/server";

import { canAccessBlogAdmin } from "@/lib/server/admin-access";
import { getCurrentAdminSessionIdentity } from "@/lib/server/admin-session";
import { listBlogTagSuggestions } from "@/lib/server/blog";
import { getServerEnv } from "@/lib/server/env";

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

export async function GET() {
  const identity = await getCurrentAdminSessionIdentity(getServerEnv());

  if (!identity) {
    return buildJsonResponse({ ok: false, message: "Sessao administrativa invalida." }, 401);
  }

  if (!canAccessBlogAdmin(identity.role)) {
    return buildJsonResponse({ ok: false, message: "Sem permissao para acessar tags." }, 403);
  }

  try {
    return buildJsonResponse({ ok: true, tags: await listBlogTagSuggestions() });
  } catch (error) {
    console.error("[admin blog] list tags failed", error);

    return buildJsonResponse(
      { ok: false, message: "Nao foi possivel carregar as tags agora." },
      503
    );
  }
}
