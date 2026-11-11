import { createAuth } from "@math/auth";
import { createDb } from "@math/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
