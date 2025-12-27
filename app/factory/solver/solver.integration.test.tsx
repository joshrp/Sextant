import "fake-indexeddb/auto";

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { unminify } from '../importexport/importexport';
import Store from '../store';
import { setDebugSolver } from './solver';
import type { GraphScoringMethod, ManifoldOptions, Solution } from './types';
import { getIdb } from "~/context/idb";

/**
 * Test data format for solver tests using the import/export system
 */
export interface SolverTestFixture {
  /** Optional description of what this test fixture represents */
  description?: string;
  /** Minified factory data (same format as import/export) */
  factory: unknown; // MinifiedState
  /** Manifold options for the test */
  manifoldOptions?: ManifoldOptions[];
  /** Scoring method to use */
  scoringMethod: GraphScoringMethod;
  /** Objective value of previous solution for autosolving */
  previousSolutionObjectiveValue?: number;
  /** Expected solution outputs */
  expected?: {
    objectiveValue: number;
    nodeCounts?: Array<{ nodeId: string; count: number }>;
    infrastructure?: Partial<Solution["infrastructure"]>;
    products?: Solution["products"];
    manifolds?: Solution["manifolds"];
  };
}

/**
 * Load all test fixtures from the fixtures directory
 */
function loadTestFixtures(): Array<{ name: string; fixture: SolverTestFixture }> {
  const fixturesDir = join(__dirname, 'fixtures');

  try {
    const files = readdirSync(fixturesDir).filter(f => f.endsWith('.test.fixture.json'));

    return files.map(file => {
      const filePath = join(fixturesDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const fixture = JSON.parse(content) as SolverTestFixture;

      // Validate fixture structure
      if (!fixture.factory || !Array.isArray(fixture.factory)) {
        throw new Error(`Invalid fixture ${file}: factory must be an array`);
      }
      if (!fixture.scoringMethod) {
        throw new Error(`Invalid fixture ${file}: scoringMethod is required`);
      }

      return {
        name: file.replace('.test.fixture.json', ''),
        fixture,
      };
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Fixtures directory doesn't exist yet
      return [];
    }
    throw error;
  }
}

/**
 * Helper function to run a test case using a real store
 * @param fixture The test fixture with factory data and options
 */
export async function runTestCase(name: string, fixture: SolverTestFixture) {
  setDebugSolver(true);
  console.log('Starting test case:', name);
  // Create a mock IDB for testing
  const mockIDB = getIdb('test-zone');
  if (!mockIDB) {
    throw new Error("Failed to create mock IndexedDB for testing");
  }

  // Clear existing data
  await (await mockIDB)?.clear('factories');

  // Unminify the factory data
  const factoryData = unminify(fixture.factory);
  // Create a new store instance
  const store = Store(mockIDB, { id: 'test', name: factoryData.name }).Graph;
  
  store.setState({
    scoringMethod: fixture.scoringMethod,
    manifoldOptions: fixture.manifoldOptions ? fixture.manifoldOptions : undefined,
    solution: (fixture.previousSolutionObjectiveValue ? {
      ObjectiveValue: fixture.previousSolutionObjectiveValue,
      infrastructure: {
        workers: 0,
        electricity: 0,
        computing: 0,
        maintenance_1: 0,
        maintenance_2: 0,
        maintenance_3: 0,
        footprint: 0,
      },
      nodeCounts: [],
      products: { inputs: [], outputs: [] },
      goals: [],
      scoringMethod: fixture.scoringMethod,
      manifolds: {}
    } : undefined)
  }, false, 'set previous solution');
  
  // Import the factory data
  await store.getState().importData(factoryData);

  // Wait for solution to be computed
  await new Promise(resolve => setTimeout(resolve, 100));

  const state = store.getState();
  console.log('Starting expectations for test case', name);
  // Verify the solution was computed
  expect(state.solution).toBeDefined();

  if (state.solution && fixture.expected) {
    const solution = state.solution;

    // Verify objective value
    if (fixture.expected.objectiveValue !== undefined) {
      expect(solution.ObjectiveValue).toBeCloseTo(fixture.expected.objectiveValue, 2);
    }

    // Verify node counts
    if (fixture.expected.nodeCounts) {
      for (const expectedNode of fixture.expected.nodeCounts) {
        const actualNode = solution.nodeCounts?.find(
          n => n.nodeId === expectedNode.nodeId
        );
        expect(actualNode, `Could not find node with ID ${expectedNode.nodeId} in test case ${name}`).toBeDefined();
        if (actualNode) {
          expect(actualNode.count, `Node count mismatch for node ID ${expectedNode.nodeId} in test case ${name}`).toBeCloseTo(expectedNode.count, 2);
        }
      }
    }

    // Verify infrastructure if expected
    if (fixture.expected.infrastructure) {
      for (const [key, expectedValue] of Object.entries(fixture.expected.infrastructure)) {
        const actualValue = solution.infrastructure[key as keyof typeof solution.infrastructure];
        expect(actualValue, `Infrastructure mismatch for key ${key} in test case ${name}`).toBeCloseTo(expectedValue, 2);
      }
    }

    // Verify products if expected
    if (fixture.expected.products?.inputs) {
      for (const expectedProduct of fixture.expected.products.inputs) {
        const actualProduct = solution.products.inputs.find(
          p => p.productId === expectedProduct.productId
        );
        expect(actualProduct, `Product input mismatch for product ID ${expectedProduct.productId} in test case ${name}`).toBeDefined();
        if (actualProduct) {
          expect(actualProduct.amount, `Product input amount mismatch for product ID ${expectedProduct.productId} in test case ${name}`).toBeCloseTo(expectedProduct.amount, 2);
        }
      }
    }

    if (fixture.expected.products?.outputs) {
      for (const expectedProduct of fixture.expected.products.outputs) {
        const actualProduct = solution.products.outputs.find(
          p => p.productId === expectedProduct.productId
        );
        expect(actualProduct, `Product output mismatch for product ID ${expectedProduct.productId} in test case ${name}`).toBeDefined();
        if (actualProduct) {
          expect(actualProduct.amount, `Product output amount mismatch for product ID ${expectedProduct.productId} in test case ${name}`).toBeCloseTo(expectedProduct.amount, 2);
        }
      }
    }

    // Verify manifolds if expected
    if (fixture.expected.manifolds) {
      expect(solution.manifolds).toBeDefined();
      expect(solution.manifolds).toEqual(fixture.expected.manifolds);
    }
  }
  console.log('Finished test case:', name);
}

/**
 * Example test demonstrating how to use exported test data
 * 
 * To create test data:
 * 1. Build a factory in the UI
 * 2. Open Factory Settings > Debug tab
 * 3. Expand "Solver Test Data Export"
 * 4. Copy the JSON and paste it as a test fixture below
 */

describe("Store Solver Integration Tests", () => {
  // Load all test fixtures
  const testFixtures = loadTestFixtures();

  test("Test fixtures directory exists and contains valid fixtures", () => {
    // At minimum we should have at least one fixture
    expect(testFixtures.length).toBeGreaterThanOrEqual(0);

    // If fixtures exist, validate they all have required fields
    testFixtures.forEach(({ fixture }) => {
      expect(fixture).toHaveProperty("factory");
      expect(fixture).toHaveProperty("scoringMethod");
      expect(Array.isArray(fixture.factory)).toBe(true);
    });
  });

  /**
   * Run all fixtures as individual tests
   */
  test.each(testFixtures)(
    "$name",
    async ({ name, fixture }) => {
      await runTestCase(name, fixture);
    }
  );
});
