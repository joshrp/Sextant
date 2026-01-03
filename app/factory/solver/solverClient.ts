/**
 * Client interface for HiGHS solver
 * Uses web worker in browser, direct calls in Node/test environments
 */

import highsLoader, { type Highs, type HighsOptions, type HighsSolution } from "highs";
import type { SolverRequest, SolverResponse } from './highs.worker';

// Track if we're in browser or Node/test environment
const isBrowser = typeof window !== "undefined" && 
                  typeof Worker !== "undefined" && 
                  (typeof process === "undefined" || process.env?.NODE_ENV !== "test");

// For Node/test environments, load HiGHS directly
let directHighsProm: Promise<Highs> | null = null;
if (!isBrowser) {
  directHighsProm = highsLoader();
}

// For browser environments, create worker
let worker: Worker | null = null;
const pendingRequests = new Map<string, {
  resolve: (solution: HighsSolution | null) => void;
  reject: (error: Error) => void;
}>();

if (isBrowser) {
  // Create worker from the worker file
  worker = new Worker(new URL('./highs.worker.ts', import.meta.url), { type: 'module' });
  
  worker.addEventListener('message', (event: MessageEvent) => {
    // Handle ready signal
    if (event.data.type === 'ready') {
      return;
    }
    
    const response = event.data as SolverResponse;
    const pending = pendingRequests.get(response.requestId);
    
    if (pending) {
      pendingRequests.delete(response.requestId);
      
      if (response.error) {
        pending.reject(new Error(response.error));
      } else {
        pending.resolve(response.solution);
      }
    }
  });
  
  worker.addEventListener('error', (error) => {
    console.error('Worker error:', error);
    // Reject all pending requests
    for (const [requestId, pending] of pendingRequests.entries()) {
      pending.reject(new Error('Worker error: ' + error.message));
      pendingRequests.delete(requestId);
    }
  });
}

/**
 * Solve an LPP using HiGHS
 * Uses web worker in browser, direct call in Node/test
 */
export async function solveWithHighs(
  lpp: string, 
  options: HighsOptions
): Promise<HighsSolution | null> {
  if (isBrowser && worker) {
    // Use worker in browser
    return new Promise((resolve, reject) => {
      // Use crypto.randomUUID if available, fallback to timestamp + random
      const requestId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      pendingRequests.set(requestId, { resolve, reject });
      
      const request: SolverRequest = {
        lpp,
        options,
        requestId
      };
      
      worker!.postMessage(request);
    });
  } else {
    // Use direct call in Node/test
    if (!directHighsProm) {
      throw new Error('HiGHS not initialized for Node environment');
    }
    
    const highs = await directHighsProm;
    try {
      return highs.solve(lpp, options);
    } catch (error) {
      console.error('Error solving LPP:', error);
      return null;
    }
  }
}

/**
 * Cleanup function to terminate worker when no longer needed
 */
export function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
    pendingRequests.clear();
  }
}
