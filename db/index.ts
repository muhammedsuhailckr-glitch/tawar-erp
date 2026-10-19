import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Database binding DB is unavailable. Check config/runtime.json."
    );
  }

  return drizzle(env.DB, { schema });
}
