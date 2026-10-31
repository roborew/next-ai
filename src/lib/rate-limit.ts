import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const limiters = {
  chat: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
    prefix: "ratelimit:chat",
  }),
  cards: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 card generations per minute
    prefix: "ratelimit:cards",
  }),
};

export type RateLimitBucket = keyof typeof limiters;

// Keyed by the signed-in user id, so callers must require a session first.
export const enforceRateLimit = async (
  bucket: RateLimitBucket,
  identifier: string,
): Promise<Response | null> => {
  const { success, reset } = await limiters[bucket].limit(identifier);

  if (success) {
    return null;
  }

  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

  return Response.json(
    { error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    },
  );
};
