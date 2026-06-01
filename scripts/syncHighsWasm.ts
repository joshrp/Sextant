/**
 * Build-time sync for the HiGHS WebAssembly module.
 *
 * The browser solver (app/factory/solver/highs.worker.ts) loads the wasm from
 * our own public/ folder instead of a CDN, so the wasm and the `highs` JS glue
 * stay pinned to the same version. This script keeps that file in sync:
 *
 *   1. Reads the installed version from package-lock.json (see highsVersion.ts).
 *   2. If public/highs-<version>.wasm already exists and matches the recorded
 *      checksum, it does nothing (no network access on repeat builds).
 *   3. Otherwise it downloads highs.wasm for that version from the lovasoa
 *      highs-js GitHub releases — GitHub only, no third-party mirrors — and
 *      writes both the versioned wasm and public/highs.meta.json.
 *
 * Wired into `prebuild` / `predev` so it runs automatically. Run directly with
 * `npm run syncHighsWasm`.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getHighsVersion } from "./highsVersion";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const metaPath = join(publicDir, "highs.meta.json");

const WASM_MAGIC = 0x0061736d; // "\0asm"

interface WasmMeta {
  file: string;
  version: string;
  source: string;
  sha256: string;
  bytes: number;
  fetchedAt: string;
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function alreadyCurrent(version: string, wasmFile: string, wasmPath: string): Promise<boolean> {
  if (!existsSync(wasmPath) || !existsSync(metaPath)) return false;
  try {
    const meta: WasmMeta = JSON.parse(await readFile(metaPath, "utf8"));
    if (meta.version !== version || meta.file !== wasmFile) return false;
    return sha256(await readFile(wasmPath)) === meta.sha256;
  } catch {
    return false;
  }
}

/** Remove any stale public/highs-*.wasm that isn't the version we want. */
async function removeStale(keep: string): Promise<void> {
  for (const name of await readdir(publicDir)) {
    if (/^highs-.*\.wasm$/.test(name) && name !== keep) {
      await rm(join(publicDir, name));
      console.log(`Removed stale public/${name}`);
    }
  }
}

async function main(): Promise<void> {
  const version = getHighsVersion();
  const wasmFile = `highs-${version}.wasm`;
  const wasmPath = join(publicDir, wasmFile);

  if (await alreadyCurrent(version, wasmFile, wasmPath)) {
    console.log(`highs.wasm ${version} already present in public/ and verified — skipping download.`);
    return;
  }

  const url = `https://github.com/lovasoa/highs-js/releases/download/v${version}/highs.wasm`;
  console.log(`Fetching HiGHS wasm ${version} from ${url}`);
  const res = await fetch(url); // follows GitHub's redirect to its release storage
  if (!res.ok) {
    throw new Error(
      `Failed to download highs.wasm v${version} from GitHub releases: ${res.status} ${res.statusText}.\n` +
        `Check that a release tagged v${version} exists at https://github.com/lovasoa/highs-js/releases ` +
        `and that the installed \`highs\` version (package-lock.json) matches a published release.`,
    );
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 8 || bytes.readUInt32BE(0) !== WASM_MAGIC) {
    throw new Error(`Downloaded file from ${url} is not a valid WebAssembly module.`);
  }

  await removeStale(wasmFile);
  await writeFile(wasmPath, bytes);

  const meta: WasmMeta = {
    file: wasmFile,
    version,
    source: url,
    sha256: sha256(bytes),
    bytes: bytes.length,
    fetchedAt: new Date().toISOString(),
  };
  await writeFile(metaPath, JSON.stringify(meta, null, 2) + "\n");

  console.log(`Saved public/${wasmFile} (${bytes.length} bytes, sha256 ${meta.sha256.slice(0, 12)}…) and public/highs.meta.json`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
