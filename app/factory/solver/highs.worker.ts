/**
 * Web Worker for running HiGHS solver in background
 * This worker receives LPP strings and HiGHS options, solves them, and returns solutions
 */

import highsLoader, { type Highs, type HighsOptions, type HighsSolution } from "highs";

// Load the wasm from our own public/ folder rather than a CDN, so the JS glue
// and the wasm stay pinned to the same version. The file is fetched into public/
// at build time by scripts/syncHighsWasm.ts, versioned to match the `highs`
// dependency in package.json (__HIGHS_WASM_VERSION__ is injected by Vite from
// that same version). BASE_URL keeps the path correct under the GitHub Pages
// base ("/sextant/").
const wasmUrl = `${import.meta.env.BASE_URL}highs-${__HIGHS_WASM_VERSION__}.wasm`;
const highsProm: Promise<Highs> = highsLoader({
  locateFile: () => wasmUrl,
});

export interface SolverRequest {
  lpp: string;
  options: HighsOptions;
  requestId: string;
}

export interface SolverResponse {
  solution: HighsSolution | null;
  error?: string;
  requestId: string;
}

// Handle messages from the main thread
self.addEventListener('message', async (event: MessageEvent<SolverRequest>) => {
  const { lpp, options, requestId } = event.data;
  
  try {
    const highs = await highsProm;
    const solution = highs.solve(lpp, options);
    
    const response: SolverResponse = {
      solution,
      requestId
    };
    
    self.postMessage(response);
  } catch (error) {
    const response: SolverResponse = {
      solution: null,
      error: error instanceof Error ? error.message : String(error),
      requestId
    };
    
    self.postMessage(response);
  }
});

// Signal that the worker is ready
self.postMessage({ type: 'ready' });
