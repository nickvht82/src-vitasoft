import { defineConfig } from "prisma/config";

/**
 * Prisma 7 CLI configuration. The connection URL lives here (not in the schema)
 * and is used by `prisma migrate` / `prisma db` commands. The runtime client
 * gets its connection via a driver adapter — see `src/client.ts`.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
