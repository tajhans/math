import type { Session } from "@math/auth";
import type { Database } from "@math/db";

export type Context = {
  session: Session | null;
  db: Database;
};
