import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { dataRouter } from "./dataRouter";

export const appRouter = router({
  // All API routes live under /api/ (see server/_core/index.ts)
  system: systemRouter,
  data: dataRouter,
});

export type AppRouter = typeof appRouter;
