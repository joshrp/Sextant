/**
 * Web Worker for running HiGHS solver in background
 * This worker receives LPP strings and HiGHS options, solves them, and returns solutions
 */

import highsLoader, { type Highs, type HighsOptions, type HighsSolution } from "highs";

// Load HiGHS in worker context - always use CDN in service worker
const highsProm: Promise<Highs> = highsLoader({ 
  locateFile: (file: string) => "https://lovasoa.github.io/highs-js/" + file 
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
