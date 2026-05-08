import type { ServerEnv } from "@/lib/server/env";

export type InstagramMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";

export type InstagramFeedPost = {
  id: string;
  caption: string;
  mediaType: InstagramMediaType;
  imageUrl: string;
  permalink: string;
  timestamp: string;
};

export type InstagramFeedResult =
  | {
      ok: true;
      posts: InstagramFeedPost[];
    }
  | {
      ok: false;
      reason: "not_configured" | "request_failed" | "invalid_response";
      posts: [];
    };

export type InstagramFeedServerEnv = Pick<
  ServerEnv,
  | "instagramAccessToken"
  | "instagramCacheSeconds"
  | "instagramPostLimit"
  | "instagramUserId"
  | "upstreamRequestTimeoutMs"
>;

export type InstagramFeedRequestInit = RequestInit & {
  headers?: {
    accept?: string;
    authorization?: string;
  };
};

export type InstagramFeedFetch = (
  input: string | URL,
  init?: InstagramFeedRequestInit
) => Promise<Response>;

type InstagramApiMedia = {
  id?: unknown;
  caption?: unknown;
  media_type?: unknown;
  media_url?: unknown;
  thumbnail_url?: unknown;
  permalink?: unknown;
  timestamp?: unknown;
};

type InstagramApiResponse = {
  data?: unknown;
};

const INSTAGRAM_MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_url",
  "thumbnail_url",
  "permalink",
  "timestamp"
].join(",");

function isInstagramMediaType(value: unknown): value is InstagramMediaType {
  return value === "IMAGE" || value === "VIDEO" || value === "CAROUSEL_ALBUM";
}

function normalizeMediaItem(item: InstagramApiMedia): InstagramFeedPost | null {
  if (
    typeof item.id !== "string" ||
    !isInstagramMediaType(item.media_type) ||
    typeof item.media_url !== "string" ||
    typeof item.permalink !== "string" ||
    typeof item.timestamp !== "string"
  ) {
    return null;
  }

  const imageUrl =
    item.media_type === "VIDEO" && typeof item.thumbnail_url === "string"
      ? item.thumbnail_url
      : item.media_url;

  if (!imageUrl || !item.permalink) {
    return null;
  }

  return {
    id: item.id,
    caption: typeof item.caption === "string" ? item.caption : "",
    mediaType: item.media_type,
    imageUrl,
    permalink: item.permalink,
    timestamp: item.timestamp
  };
}

function buildInstagramMediaUrl(env: InstagramFeedServerEnv) {
  const url = new URL(
    `https://graph.instagram.com/${encodeURIComponent(env.instagramUserId!)}/media`
  );

  url.searchParams.set("fields", INSTAGRAM_MEDIA_FIELDS);
  url.searchParams.set("limit", String(env.instagramPostLimit));

  return url;
}

export async function fetchInstagramFeed(
  env: InstagramFeedServerEnv,
  options: {
    fetchImpl?: InstagramFeedFetch;
  } = {}
): Promise<InstagramFeedResult> {
  if (!env.instagramAccessToken || !env.instagramUserId) {
    return {
      ok: false,
      reason: "not_configured",
      posts: []
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const abortController = new AbortController();
  const timeoutId = setTimeout(
    () => abortController.abort(),
    env.upstreamRequestTimeoutMs
  );

  try {
    const response = await fetchImpl(buildInstagramMediaUrl(env), {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${env.instagramAccessToken}`
      },
      next: {
        revalidate: env.instagramCacheSeconds
      },
      signal: abortController.signal
    });

    if (!response.ok) {
      return {
        ok: false,
        reason: "request_failed",
        posts: []
      };
    }

    const payload = (await response.json()) as InstagramApiResponse;

    if (!Array.isArray(payload.data)) {
      return {
        ok: false,
        reason: "invalid_response",
        posts: []
      };
    }

    return {
      ok: true,
      posts: payload.data
        .map((item) => normalizeMediaItem(item as InstagramApiMedia))
        .filter((post): post is InstagramFeedPost => Boolean(post))
        .slice(0, env.instagramPostLimit)
    };
  } catch {
    return {
      ok: false,
      reason: "request_failed",
      posts: []
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
