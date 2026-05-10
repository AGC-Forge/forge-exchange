// Prisma config for Traffick Exchange monorepo
// Points to the shared schema in packages/db/
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "packages/db/schema.prisma",
  migrations: {
    path: "packages/db/migrations",
    seed: "tsx packages/db/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
