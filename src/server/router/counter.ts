import { createRouter } from "./context";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";
import * as trpc from "@trpc/server";

const redis = new Redis({
  url: String(process.env.UPSTASH_REDIS_REST_URL),
  token: String(process.env.UPSTASH_REDIS_REST_TOKEN),
});

// Create a new ratelimiter, that allows 5 requests per 5 seconds
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.fixedWindow(1, "100 s"),
});

export const counterRouter = createRouter()
  .mutation("add", {
    input: z.object({
      name: z.string(),
    }),
    async resolve({ input, ctx }) {
      console.log(ctx?.req.cookies);
      const identifier = ctx?.req.cookies["x-identifier-limit"]
        ? String(ctx?.req.cookies["x-identifier-limit"])
        : nanoid();

      console.log({ identifier });
      const result = await ratelimit.limit(identifier);

      ctx.res.setHeader("X-RateLimit-Limit", result.limit);
      ctx.res.setHeader("X-RateLimit-Remaining", result.remaining);

      if (!ctx.res.getHeader("x-identifier-limit")) {
        ctx.res.setHeader("Set-Cookie", [
          `x-identifier-limit=${identifier}; HttpOnly; Path=/`,
        ]);
      }

      if (!result.success) {
        throw new trpc.TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "The request has been rate limited.",
        });
      }
      const { name } = input;
      const counter = await ctx.prisma.counterTable.update({
        where: {
          name,
        },
        data: {
          counts: {
            increment: 1,
          },
        },
      });

      return counter;
    },
  })
  .query("get", {
    async resolve({ ctx }) {
      const counters = await ctx.prisma.counterTable.findMany();

      return counters;
    },
  });
