/**
 * Refuses to ship a production build that is missing its public configuration.
 *
 * NEXT_PUBLIC_* variables are inlined at build time, so a deployment that was
 * built before they were added carries none of them — and nothing at runtime
 * can tell you which. The symptom is a site that loads, looks correct, and
 * quietly cannot reach its own backend. That happened; this is so it cannot
 * happen silently again.
 *
 * Only production deploys fail. Local work and previews warn, because being
 * able to run the app without credentials is useful.
 */
import { readFileSync, existsSync } from "node:fs";

// This runs before Next loads .env.local, so read it here too — otherwise a
// correctly configured machine gets warned at every build.
for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] === undefined) {
      process.env[key] = raw.trim().replace(/^["']|["']$/g, "");
    }
  }
}

const REQUIRED = [
  ["NEXT_PUBLIC_SUPABASE_URL", "Supabase project URL"],
  [
    "NEXT_PUBLIC_SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "Supabase publishable (anon) key — either name is accepted",
  ],
  ["NEXT_PUBLIC_API_URL", "Processing API base URL"],
];

const missing = REQUIRED.filter(([names]) =>
  !names.split("|").some((name) => (process.env[name] ?? "").trim()),
);

if (missing.length === 0) {
  console.log("✓ public environment complete");
  process.exit(0);
}

const isProductionDeploy = process.env.VERCEL_ENV === "production";
const lines = missing.map(([names, why]) => `  ${names.split("|")[0]} — ${why}`);

if (isProductionDeploy) {
  console.error(
    [
      "",
      "✗ Production build refused: public environment is incomplete.",
      ...lines,
      "",
      "Set these in Vercel → Settings → Environment Variables (Production),",
      "then redeploy WITHOUT the build cache — a cached build keeps the old",
      "inlined values even after the variables are added.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

console.warn(["", "⚠ Public environment incomplete (not a production deploy):", ...lines, ""].join("\n"));
