import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The exact installed `highs` version, read from package-lock.json.
 *
 * We deliberately use the lockfile rather than the semver range in package.json
 * (e.g. "^1.8.0"): the range is not the version that's actually installed, and
 * the wasm we ship must match the exact `highs` JS glue that Vite bundles from
 * node_modules. The lockfile records that resolved version.
 *
 * Shared by scripts/syncHighsWasm.ts (which fetch + version the wasm) and
 * vite.config.ts (which injects the version into the solver worker), so there
 * is a single source of truth.
 */
export function getHighsVersion(): string {
  const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
  // lockfileVersion 2/3 keep the resolved version under `packages`; fall back to
  // the legacy `dependencies` map just in case.
  const version: string | undefined =
    lock.packages?.["node_modules/highs"]?.version ?? lock.dependencies?.highs?.version;
  if (!version) {
    throw new Error(
      "Could not find the installed `highs` version in package-lock.json. Run `npm install` first.",
    );
  }
  if (!/^\d+\.\d+\.\d+/.test(version)) {
    throw new Error(`Unexpected highs version "${version}" in package-lock.json`);
  }
  return version;
}
