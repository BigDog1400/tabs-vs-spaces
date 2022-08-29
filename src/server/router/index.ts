// src/server/router/index.ts
import { createRouter } from "./context";
import superjson from "superjson";

import { counterRouter } from "./counter";

export const appRouter = createRouter()
  .transformer(superjson)
  .merge("counter.", counterRouter);

// export type definition of API
export type AppRouter = typeof appRouter;
