import "server-only";

import { NextResponse } from "next/server";

import type { PublicMutationResponse } from "@/lib/contracts/newsletter";

export function publicApiResponse(
  payload: PublicMutationResponse,
  options?: {
    status?: number;
    headers?: HeadersInit;
  }
) {
  return NextResponse.json(payload, {
    status: options?.status ?? 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      ...options?.headers
    }
  });
}
