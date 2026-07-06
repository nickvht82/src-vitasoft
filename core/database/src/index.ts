/**
 * @vitasoft/database — shared Prisma schema, generated client, and a
 * process-wide client singleton. Every backend imports the same client version
 * so the data model never drifts between products.
 *
 * @remarks
 * The generated Prisma client lives under `src/generated/client` and is
 * re-exported here so consumers never reach into internals of this package.
 */
export {
  createPrismaClient,
  getPrismaClient,
  PrismaClient,
  type PrismaClientOptions,
  type Organization,
  type User,
} from "./client.js";
