import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

/** Focus Assist is single-user and self-hosted, so every request runs as this local user. */
export type User = {
  id: number;
  name: string;
  role: "admin";
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User;
};

const LOCAL_USER: User = { id: 1, name: "Local User", role: "admin" };

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  return {
    req: opts.req,
    res: opts.res,
    user: LOCAL_USER,
  };
}
