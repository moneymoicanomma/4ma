import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  fetchInstagramFeed,
  type InstagramFeedFetch,
  type InstagramFeedServerEnv
} from "../lib/server/instagram";

const baseEnv: InstagramFeedServerEnv = {
  instagramAccessToken: "test-token",
  instagramCacheSeconds: 3600,
  instagramPostLimit: 4,
  instagramUserId: "17841400000000000",
  upstreamRequestTimeoutMs: 1000
};

function jsonResponse(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
    ...init
  });
}

describe("instagram feed server integration", () => {
  it("skips remote fetches when Instagram credentials are missing", async () => {
    let fetchCount = 0;
    const fetchImpl: InstagramFeedFetch = async () => {
      fetchCount += 1;
      return jsonResponse({ data: [] });
    };

    const result = await fetchInstagramFeed(
      {
        ...baseEnv,
        instagramAccessToken: null
      },
      { fetchImpl }
    );

    assert.equal(result.ok, false);
    assert.equal(result.reason, "not_configured");
    assert.equal(fetchCount, 0);
  });

  it("maps recent Instagram media into public feed posts", async () => {
    let requestedUrl = "";
    let requestedAuthorization = "";
    const fetchImpl: InstagramFeedFetch = async (url, init) => {
      requestedUrl = url.toString();
      requestedAuthorization = String(init?.headers?.authorization ?? "");

      return jsonResponse({
        data: [
          {
            id: "post-image",
            caption: "Pesagem liberada #MMMA",
            media_type: "IMAGE",
            media_url: "https://cdn.example.com/post-image.jpg",
            permalink: "https://www.instagram.com/p/post-image/",
            timestamp: "2026-05-08T12:30:00+0000"
          },
          {
            id: "post-video",
            caption: "Replay da porrada",
            media_type: "VIDEO",
            media_url: "https://cdn.example.com/post-video.mp4",
            thumbnail_url: "https://cdn.example.com/post-video.jpg",
            permalink: "https://www.instagram.com/reel/post-video/",
            timestamp: "2026-05-07T18:00:00+0000"
          },
          {
            id: "post-invalid",
            media_type: "IMAGE",
            media_url: "",
            permalink: "https://www.instagram.com/p/post-invalid/",
            timestamp: "2026-05-06T18:00:00+0000"
          }
        ]
      });
    };

    const result = await fetchInstagramFeed(baseEnv, { fetchImpl });

    assert.equal(result.ok, true);
    assert.equal(result.posts.length, 2);
    assert.deepEqual(result.posts[0], {
      id: "post-image",
      caption: "Pesagem liberada #MMMA",
      mediaType: "IMAGE",
      imageUrl: "https://cdn.example.com/post-image.jpg",
      permalink: "https://www.instagram.com/p/post-image/",
      timestamp: "2026-05-08T12:30:00+0000"
    });
    assert.equal(result.posts[1]?.imageUrl, "https://cdn.example.com/post-video.jpg");
    assert.match(requestedUrl, /^https:\/\/graph\.instagram\.com\/17841400000000000\/media/);
    assert.match(requestedUrl, /fields=id%2Ccaption%2Cmedia_type%2Cmedia_url%2Cthumbnail_url%2Cpermalink%2Ctimestamp/);
    assert.match(requestedUrl, /limit=4/);
    assert.equal(requestedUrl.includes("access_token"), false);
    assert.equal(requestedAuthorization, "Bearer test-token");
  });

  it("returns a recoverable result when Instagram responds with an error", async () => {
    const fetchImpl: InstagramFeedFetch = async () =>
      jsonResponse(
        { error: { message: "Expired token" } },
        {
          status: 400
        }
      );

    const result = await fetchInstagramFeed(baseEnv, { fetchImpl });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "request_failed");
  });
});
