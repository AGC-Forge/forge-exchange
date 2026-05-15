import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

const hasSchema = existsSync("packages/db/schema.prisma");
if (!hasSchema) {
  process.exit(0);
}

execSync("pnpm db:generate && pnpm --filter @forge-exchange/db build", {
  stdio: "inherit",
});

