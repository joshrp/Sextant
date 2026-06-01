/**
 * Version of the HiGHS wasm shipped in public/, injected by Vite `define` from
 * the `highs` dependency in package.json. Used to build the wasm URL in
 * app/factory/solver/highs.worker.ts. See scripts/syncHighsWasm.ts.
 */
declare const __HIGHS_WASM_VERSION__: string;
