import { createRouter } from "./context";
import { z } from "zod";

export const counterRouter = createRouter()
  .mutation("add", {
    input: z.object({
      name: z.string(),
    }),
    async resolve({ input, ctx }) {
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
