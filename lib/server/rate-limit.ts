import "server-only";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function takeRateLimitToken(
  key: string,
  options: {
    limit: number;
    windowMs: number;
  }
) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    const nextBucket = {
      count: 1,
      resetAt: now + options.windowMs
    };

    buckets.set(key, nextBucket);
    pruneRateLimitBuckets(now);

    return {
      ok: true,
      remaining: Math.max(0, options.limit - 1),
      resetAt: nextBucket.resetAt
    };
  }

  if (current.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: current.resetAt
    };
  }

  current.count += 1;
  buckets.set(key, current);

  return {
    ok: true,
    remaining: Math.max(0, options.limit - current.count),
    resetAt: current.resetAt
  };
}

function pruneRateLimitBuckets(now: number) {
  if (buckets.size < 500) {
    return;
  }

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
