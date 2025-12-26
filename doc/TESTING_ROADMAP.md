# COI Calculator - Testing Implementation Roadmap

## Overview
This document outlines isolated testing tasks prioritized by complexity and risk. Each task includes refactoring, review, and test implementation phases to ensure quality coverage as the MVP evolves.

## Testing Tool Stack
- **Vitest** - Unit tests (pure functions, business logic) - Already configured
- **@testing-library/react** - Component tests (user interactions) - Needs setup
- **Playwright** - E2E smoke tests (critical paths only, 2-3 tests max) - Needs setup

## Time Estimate Legend

Each task shows two time estimates:
- **👤 Experienced Dev** - Developer familiar with codebase, tools, and testing patterns
- **🤖 AI Agent** - Agent with context about codebase but may need iteration/debugging

Multiplier: Agents typically take 1.5-3x longer due to:
- Need for validation/review cycles
- Tool learning (Playwright setup, testing-library patterns)
- Debugging without immediate feedback
- Conservative iteration (smaller changes, more verification)

---

## 🔴 CRITICAL TASK 1: Expand Solver Test Coverage

**Tool:** Vitest  
**Time:** 👤 2-4 hours | 🤖 4-8 hours  
**Dependencies:** None (extends existing `app/factory/solver/solver.test.tsx`)

### What This Covers
The linear programming solver is the core of the app. While basic tests exist, edge cases around circular dependencies, disconnected graphs, and constraint generation need coverage.

### Phase 1: Review Current Coverage
👤 30 min | 🤖 1 hour
- Run existing `solver.test.tsx` with coverage: `npm test -- --coverage`
- Identify gaps in:
  - Circular recipe dependencies
  - Disconnected graph components
  - Invalid/missing recipe data
  - Each scoring method (`infra`, `inputs`, `footprint`, `outputs`)
- Document findings in test file comments

### Phase 2: Add Test Fixtures
👤 1 hour | 🤖 2 hours
- Create `app/test/fixtures/graphs.ts` with pre-built graph configurations:
  - Simple chain (A → B → C)
  - Diamond (A → B+C → D)
  - Circular (A → B → A)
  - Disconnected (A → B, C → D with no connection)
  - Single node (no edges)
- Use real recipe IDs from `gameData.ts` (e.g., `ironSmeltingScrap`, `copperSmeltingScrap`)
- Follow existing `testFactories.json` structure for consistency

### Phase 3: Implement Tests
👤 1-2 hours | 🤖 2-4 hours
- Add snapshot tests for each fixture's LPP output (use `toMatchSnapshot()`)
- Test all four scoring methods on same graph - verify different solutions
- Verify constraint counts match expected (equality, inequality, loop closures)
- Test timeout behavior (graphs that can't solve in 2s)
- Test invalid inputs (missing recipes, null edges, empty graphs)
- Follow existing test patterns in `solver.test.tsx`

**Success Criteria:**
- 20+ test cases covering edge cases
- All scoring methods tested on multiple graphs
- Snapshot coverage of constraint generation
- All tests pass in < 5 seconds

**Agent Notes:**
- Run tests frequently: `npm test solver`
- Validate snapshots manually before committing
- If snapshot fails, check if change is expected or bug
- HiGHS solver timeout is 2000ms - don't change this

---

## 🔴 CRITICAL TASK 2: Import/Export Round-Trip Testing

**Tool:** Vitest  
**Time:** 👤 3-4 hours | 🤖 5-8 hours  
**Dependencies:** None

### What This Covers
Data loss prevention during factory save/load. Base85 encoding, compression, and version migration must be bulletproof.

### Phase 1: Refactor for Testability
👤 1 hour | 🤖 2 hours

Extract pure functions from `app/factory/importexport/importexport.ts`:

```typescript
// Create: app/factory/importexport/encoder.ts
export function encodeFactoryState(state: MinimalGraphState): string {
  // Move encoding logic from encodeFactory() - pure function
  // Input: MinimalGraphState, Output: base85 string
}

export function decodeFactoryState(encoded: string): MinimalGraphState {
  // Move decoding logic from decodeFactory() - pure function with error handling
  // Input: base85 string, Output: MinimalGraphState or throw error
}

// Update: app/factory/importexport/importexport.ts
// Use new functions, keeping existing public API unchanged
```

**Agent Notes:**
- Do NOT change `encodeFactory()` / `decodeFactory()` signatures
- Extract logic only - preserve exact behavior
- Test refactor doesn't break existing usage
- Run `npm test` to verify no regressions

### Phase 2: Create Test Fixtures
👤 1 hour | 🤖 2 hours

- Use existing `testExports.json` as baseline
- Add edge cases to `app/test/fixtures/exports.ts`:
  - Empty factory (no nodes/edges)
  - Large factory (100+ nodes) - stress test
  - Special characters in names/goals
  - All node types: `recipe`, `storage`, `byproduct`, `constant`
  - All edge types: normal, byproduct, different manifolds
  - Freed vs non-freed manifolds
  - Mix of all scoring methods

**Agent Notes:**
- Use real recipe IDs from `gameData.ts`
- Follow `MinimalGraphState` type exactly
- Validate fixtures can encode before adding to tests

### Phase 3: Implement Tests
👤 1-2 hours | 🤖 2-3 hours

Create `app/factory/importexport/encoder.test.ts`:
- Round-trip tests: `encode → decode → deepEqual(original, result)`
- Version migration: test old export formats still decode (use `testExports.json`)
- Malformed input: truncated strings, invalid base85, wrong version markers
- Data integrity: all node/edge properties preserved (IDs, positions, data)
- Compression ratio validation (encoded should be < original JSON length)
- Error messages are helpful (not just "decode failed")

**Success Criteria:**
- All existing exports from `testExports.json` decode successfully
- Round-trip preserves 100% of data (deep equality)
- Graceful error messages for invalid inputs
- Tests run in < 3 seconds

**Agent Notes:**
- Use `describe()` blocks to group related tests
- Test error cases with `expect(() => decode(bad)).toThrow()`
- Compare full state, not just length/shape
- Run individual test: `npm test encoder`

---

## 🟡 HIGH VALUE TASK 3: Graph Model Constraint Generation

**Tool:** Vitest  
**Time:** 👤 4-6 hours | 🤖 8-12 hours  
**Dependencies:** Task 1 fixtures can be reused

### What This Covers
The bridge between React Flow UI and solver constraints. Complex transformation logic that's currently hard to test due to tight coupling with React Flow types.

### Phase 1: Refactor for Pure Functions
👤 2 hours | 🤖 4 hours

Extract testable logic from `app/factory/solver/graphModel.ts`:

```typescript
// Create: app/factory/solver/constraintBuilder.ts

// Define minimal types without React Flow dependencies
export type MinimalNode = {
  id: string;
  data: { recipe: RecipeId; multiplier: number; orientation: string };
};

export type MinimalEdge = {
  id: string;
  source: string;
  target: string;
  data: { product: ProductId; isFreed?: boolean };
};

export function buildConstraintsFromGraph(
  nodes: MinimalNode[],
  edges: MinimalEdge[],
  manifolds: ManifoldOptions[]
): Constraint[] {
  // Pure constraint generation logic
  // Move from createGraphModel() - no React Flow types
}

export function groupManifolds(
  edges: MinimalEdge[],
  options: ManifoldOptions[]
): Map<string, MinimalEdge[]> {
  // Pure manifold grouping
  // Extract from createGraphModel()
}

export function generateLoopClosures(
  edges: MinimalEdge[],
  manifoldGroups: Map<string, MinimalEdge[]>
): Constraint[] {
  // Extract loop closure logic
}
```

Update `app/factory/solver/graphModel.ts` to use these functions - becomes thin wrapper over pure functions.

**Agent Notes:**
- Run `npm test solver` after each extraction to verify behavior
- Types should NOT import from `@xyflow/react`
- Keep existing `createGraphModel()` signature unchanged
- Test manually in UI after refactor (create factory, solve, verify results)

### Phase 2: Create Test Cases
👤 1 hour | 🤖 2 hours

- Reuse graph fixtures from Task 1 (`app/test/fixtures/graphs.ts`)
- Add manifold-specific scenarios:
  - No manifolds
  - All edges in one manifold
  - Multiple independent manifolds
  - Freed vs non-freed manifolds (test `isFreed` flag)
  - Disconnected manifolds (different graph components)
  - Complex: diamond with manifolds

**Agent Notes:**
- Each fixture needs nodes, edges, AND manifold options
- Manifolds reference edge IDs
- Follow `ManifoldOptions` type from `app/factory/store.ts`

### Phase 3: Implement Tests
👤 1-2 hours | 🤖 2-4 hours

Create `app/factory/solver/constraintBuilder.test.ts`:
- Test constraint count matches expected for each graph
- Verify equality constraints (normal edges) - should have `f: 0`
- Verify inequality constraints (freed manifolds) - should have `f: 1`
- Test loop closure constraints (freed manifolds create loops)
- Validate variable naming (no "inf" prefix - HiGHS parser error)
- Test edge cases: no edges, no manifolds, all freed, none freed
- Snapshot constraint structure for complex graphs

**Success Criteria:**
- Pure functions can be tested without React Flow
- 15+ test cases covering manifold scenarios
- All constraint types validated (equality, inequality, loop)
- Tests run in < 5 seconds

### Phase 4: Integration Test
👤 1 hour | 🤖 2 hours

- Test full `createGraphModel()` with React Flow types
- Ensure refactor doesn't break existing solver tests
- Manual UI test: create factory, add nodes/edges, solve
- Verify solution numbers match pre-refactor

**Agent Notes:**
- Integration test goes in `solver.test.tsx`
- Compare full `GraphModel` output, not just constraint count
- If UI breaks, check type conversions in `graphModel.ts` wrapper

---

## 🟡 HIGH VALUE TASK 4: Store Action Testing

**Tool:** Vitest + fake-indexeddb  
**Time:** 👤 6-8 hours | 🤖 12-18 hours  
**Dependencies:** None, but high effort due to scope

### What This Covers
Zustand store mutations and IndexedDB persistence. Critical for data integrity but currently untested. Three stores to cover: `PlannerStore`, `ProductionZoneStore`, `GraphStore`.

### Phase 1: Refactor Store Actions
👤 3 hours | 🤖 6 hours

Extract reducers from stores for easier testing:

```typescript
// Create: app/context/reducers/graphReducers.ts
export function addRecipeNode(
  state: GraphState,
  recipe: Recipe,
  position: XYPosition
): GraphState {
  // Pure state transformation - extract from GraphStore.addRecipeNode
  // Must return NEW state object (immutable)
}

export function removeNode(state: GraphState, nodeId: string): GraphState {
  // Extract from GraphStore.removeNode
  // Remove node AND connected edges
}

export function updateEdge(
  state: GraphState,
  edgeId: string,
  updates: Partial<CustomEdgeType['data']>
): GraphState {
  // Extract from GraphStore.updateEdge
}

// Similar files for:
// - app/context/reducers/zoneReducers.ts (ProductionZoneStore actions)
// - app/context/reducers/plannerReducers.ts (PlannerStore actions)

// Update stores to use reducers:
// app/factory/store.ts
const useGraphStore = create<GraphStore>((set) => ({
  // ...existing state
  addRecipeNode: (recipe, position) =>
    set((state) => addRecipeNode(state, recipe, position)),
}));
```

**Agent Notes:**
- Reducers MUST be pure - no side effects
- Return new state objects (spread operators)
- Keep existing store APIs unchanged
- Test each refactor: run app, add/remove nodes, verify state
- Focus on GraphStore first (most complex), then others

### Phase 2: Setup Test Infrastructure
👤 1 hour | 🤖 2 hours

```typescript
// Create: app/test/setup/indexeddb.ts
import 'fake-indexeddb/auto';
// Polyfills IndexedDB for Node test environment

// Create: app/test/helpers/storeHelpers.ts
export function createTestStore<T>(
  initialState: Partial<T>,
  storeName: string
): StoreApi<T> {
  // Helper to create isolated store instances for testing
  // Prevents test pollution
}

export async function waitForPersistence(): Promise<void> {
  // Helper to wait for IndexedDB writes in tests
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

Install dependencies:
```bash
npm install -D fake-indexeddb
```

**Agent Notes:**
- Add `setupFiles: ['./app/test/setup/indexeddb.ts']` to `vitest.config.ts`
- Test setup works: create simple test that writes to IndexedDB
- Check `node_modules/fake-indexeddb` installed correctly

### Phase 3: Implement Reducer Tests
👤 2 hours | 🤖 4 hours

Create test files:
- `app/context/reducers/graphReducers.test.ts`
- `app/context/reducers/zoneReducers.test.ts`
- `app/context/reducers/plannerReducers.test.ts`

Test pure reducer functions:
- Add/remove/update operations
- Edge cases: duplicate IDs, missing data, null inputs
- State immutability (use `toBe` to check references changed)
- Edge removal cascades (remove node → edges removed)
- Multiple updates in sequence

**Agent Notes:**
- Use `describe()` blocks per reducer function
- Test immutability: `expect(result).not.toBe(original)`
- Test edge cases first (they catch most bugs)
- Run specific test file: `npm test graphReducers`

### Phase 4: Implement Store Integration Tests
👤 2 hours | 🤖 4-6 hours

Test full stores with IndexedDB:
- Hydration from IndexedDB (create store, verify state loaded)
- Persistence after mutations (change state, wait, check IndexedDB)
- Cross-store interactions (PlannerStore → ProductionZoneStore → GraphStore)
- Store cleanup (remove zone → factories removed → graphs removed)

**Success Criteria:**
- All store actions have reducer tests
- IndexedDB persistence verified (write → reload → compare)
- State mutations are immutable (references change)
- Cross-store operations work (cascading deletes)
- Tests run in < 10 seconds

**Agent Notes:**
- Use `waitForPersistence()` helper after mutations
- Test stores in isolation first, then integration
- Check IndexedDB manually: Chrome DevTools → Application → IndexedDB
- If tests flaky, increase wait time in `waitForPersistence()`

---

## 🟡 HIGH VALUE TASK 5: Game Data Utility Testing

**Tool:** Vitest  
**Time:** 👤 2-3 hours | 🤖 3-5 hours  
**Dependencies:** None

### What This Covers
Recipe lookups, filtering, and relationship traversal in `gameData.ts`. These utilities are used throughout the app and need reliability.

### Phase 1: Extract Testable Helpers
👤 1 hour | 🤖 1.5 hours

Create `app/gameData/utils.ts`:

```typescript
export function getRecipesByProduct(productId: ProductId): Recipe[] {
  // Find all recipes that produce this product
  // Extract from inline usage in components
}

export function getRecipesByMachine(machineId: MachineId): Recipe[] {
  // Find all recipes that use this machine
}

export function getRecipeDependencies(
  recipeId: RecipeId,
  maxDepth = 10
): RecipeId[] {
  // Walk dependency tree (inputs → recipes that produce them)
  // Prevent infinite loops with maxDepth
}

export function findRecipes(
  query: string,
  filters?: {
    machine?: MachineId;
    product?: ProductId;
    category?: string;
  }
): Recipe[] {
  // Unified search function - name/description matching + filters
}

export function getRecipeInputs(recipeId: RecipeId): Product[] {
  // Get all input products for a recipe
}

export function getRecipeOutputs(recipeId: RecipeId): Product[] {
  // Get all output products (including byproducts)
}
```

**Agent Notes:**
- Extract logic currently scattered in components
- Handle missing data gracefully (return empty arrays, not crash)
- Use existing `recipes`, `products`, `machines` from `gameData.ts`
- Don't change `gameData.ts` structure

### Phase 2: Implement Tests
👤 1-2 hours | 🤖 2-3 hours

Create `app/gameData/utils.test.ts`:

Test with known recipes (pick stable examples):
- `getRecipesByProduct('IronOre')` → should include mining recipes
- `getRecipesByMachine('BlastFurnace')` → iron smelting recipes
- `findRecipes('iron')` → multiple results with 'iron' in name
- `findRecipes('iron', { machine: 'BlastFurnace' })` → filtered results
- `getRecipeDependencies('SteelProduction')` → iron, coal, etc.

Test edge cases:
- Recipes with no inputs (mining)
- Recipes with no outputs (shouldn't exist, but handle gracefully)
- Circular dependencies (A needs B, B needs A)
- Missing icons (product.icon undefined)
- Empty queries, null filters
- Very deep dependency chains (maxDepth limit)

Performance tests:
- Search across all recipes should be < 100ms
- Dependency traversal should be < 50ms

**Success Criteria:**
- All lookup functions tested with real recipe IDs
- Edge cases covered (empty, missing, circular)
- Performance acceptable (searches < 100ms)
- Tests run in < 2 seconds

**Agent Notes:**
- Use real IDs from `gameData.ts` - don't mock
- Test with multiple recipes to verify filtering
- Check performance: `console.time()` in test setup
- If slow, consider adding indexes/caching

---

## 🟢 FOUNDATIONAL TASK 6: Component Testing Setup

**Tool:** @testing-library/react + Vitest  
**Time:** 👤 4-6 hours | 🤖 8-12 hours  
**Dependencies:** None, but benefits from prior refactoring

### What This Covers
Foundation for testing React components with user interactions. Focuses on components with complex logic: search/filter, product selection, solution display.

### Phase 1: Setup Testing Infrastructure
👤 2 hours | 🤖 3-4 hours

Install dependencies:
```bash
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Create setup files:
```typescript
// Create: app/test/setup/componentTests.tsx
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { StoreApi } from 'zustand';

export function renderWithRouter(
  ui: React.ReactElement,
  { route = '/', ...options }: RenderOptions & { route?: string } = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[route]}>
        {children}
      </MemoryRouter>
    ),
    ...options,
  });
}

export function renderWithStore<T>(
  ui: React.ReactElement,
  store: StoreApi<T>,
  options?: RenderOptions
) {
  // Wrapper that provides Zustand store context
  // Use store.Provider if available, or context override
}

export function renderWithAll(
  ui: React.ReactElement,
  {
    route = '/',
    stores = {},
    ...options
  }: RenderOptions & {
    route?: string;
    stores?: Record<string, StoreApi<any>>;
  } = {}
) {
  // Combined router + stores wrapper
}
```

Update `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    setupFiles: [
      './app/test/setup/indexeddb.ts',
      './app/test/setup/componentTests.tsx'
    ],
    environment: 'jsdom', // Required for React components
  },
});
```

**Agent Notes:**
- Verify jsdom installed: `npm list jsdom`
- Test setup with simple component: `render(<div>test</div>)`
- Check `@testing-library/react` works with React 19
- Add `/// <reference types="@testing-library/jest-dom" />` to test files

### Phase 2: Refactor Components for Testability
👤 2 hours | 🤖 4-5 hours

Extract presentation logic from components:

```typescript
// Create: app/factory/graph/nodes/recipeNodeLogic.ts
export function calculateNodeDisplay(
  node: RecipeNodeData,
  solution: Solution | null
): {
  multiplier: string;
  buildingCount: number;
  inputs: { product: ProductId; amount: number }[];
  outputs: { product: ProductId; amount: number }[];
} {
  // Pure calculation logic - extract from RecipeNode component
  // Handles solution present/absent, multiplier formatting
}

// Create: app/factory/graph/edges/edgeLogic.ts
export function getAvailableProducts(
  sourceRecipe: Recipe,
  targetRecipe: Recipe
): Product[] {
  // Extract from ButtonEdge - which products can flow?
}

// Update components to use logic:
// app/factory/graph/nodes/RecipeNode.tsx
function RecipeNode({ data, solution }) {
  const display = calculateNodeDisplay(data, solution);
  return <div>{/* render display */}</div>;
}
```

Focus on these components (most complex):
- `RecipeNode` - Solution display logic
- `ButtonEdge` - Product selection logic
- `RecipeSelector` - Search/filter logic
- `MachineSelector` - Machine filtering logic

**Agent Notes:**
- Extract logic, don't rewrite components
- Keep component structure identical
- Test in UI after each extraction
- Run `npm run typecheck` to verify types

### Phase 3: Implement Sample Tests
👤 2 hours | 🤖 3-4 hours

Create test files for 2-3 components to establish patterns:

```typescript
// app/factory/graph/sidebar/RecipeSelector.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecipeSelector } from './RecipeSelector';

describe('RecipeSelector', () => {
  it('filters recipes by search query', async () => {
    render(<RecipeSelector />);
    const input = screen.getByPlaceholderText('Search recipes...');
    await userEvent.type(input, 'iron');
    expect(screen.getByText(/iron smelting/i)).toBeInTheDocument();
  });

  it('filters by machine selection', async () => {
    // Test machine filter dropdown
  });
});

// app/factory/graph/edges/ButtonEdge.test.tsx
// Test product selection dropdown

// app/factory/graph/nodes/RecipeNode.test.tsx
// Test solution data display
```

**Success Criteria:**
- Test infrastructure in place and working
- 3 components have basic coverage (render, interaction, display)
- Patterns documented for future tests
- Tests run in < 5 seconds

**Agent Notes:**
- Start with render tests (component doesn't crash)
- Then add interaction tests (clicks, typing)
- Use `screen.debug()` to see rendered output
- Run specific test: `npm test RecipeSelector`
- If async issues, use `waitFor()` from testing-library

---

## 🟢 FOUNDATIONAL TASK 7: Custom Hydration Testing

**Tool:** Vitest  
**Time:** 👤 2 hours | 🤖 3-4 hours  
**Dependencies:** None

### What This Covers
Map/Set serialization for IndexedDB (`app/hydration.ts`). Small but critical for data integrity - corrupt serialization = data loss.

### Phase 1: Review Current Implementation
👤 30 min | 🤖 1 hour

- Examine `app/hydration.ts` - understand replacer/reviver pattern
- Identify all types that need custom serialization:
  - Map<string, any>
  - Set<any>
  - Nested structures (Map<string, Set<number>>)
- Check usage in stores (`PlannerStore`, `ProductionZoneStore`, `GraphStore`)
- Verify stores use `hydration.replacer` and `hydration.reviver` with IndexedDB

**Agent Notes:**
- Maps/Sets don't serialize to JSON by default (become empty objects)
- Hydration marks them with `__type: 'Map'` or `__type: 'Set'`
- Check `app/context/PlannerProvider.tsx` for usage example

### Phase 2: Implement Tests
👤 1.5 hours | 🤖 2-3 hours

Create `app/hydration.test.ts`:

**Round-trip tests:**
```typescript
describe('Map serialization', () => {
  it('handles string keys', () => {
    const original = new Map([['key1', 'value1'], ['key2', 'value2']]);
    const json = JSON.stringify(original, hydration.replacer);
    const result = JSON.parse(json, hydration.reviver);
    expect(result).toEqual(original);
  });

  it('handles number keys', () => {
    // Maps can have non-string keys
  });

  it('handles object values', () => {
    // Complex values in Map
  });
});

describe('Set serialization', () => {
  it('handles primitives', () => {
    const original = new Set([1, 2, 3, 'a', 'b']);
    // Round-trip test
  });

  it('handles objects', () => {
    // Sets with object values
  });
});

describe('Nested structures', () => {
  it('handles Map<string, Set<number>>', () => {
    const original = new Map([
      ['key1', new Set([1, 2, 3])],
      ['key2', new Set([4, 5])],
    ]);
    // Round-trip test
  });

  it('handles Set<Map<string, any>>', () => {
    // Deeply nested structures
  });
});
```

**Edge cases:**
- Empty Map/Set
- Very large Map/Set (1000+ entries)
- Special values (undefined, null, NaN)
- Circular references (should handle gracefully or error clearly)

**Integration test:**
```typescript
describe('Store persistence', () => {
  it('persists Map/Set in store state', async () => {
    // Create store with Map/Set
    // Persist to IndexedDB (using fake-indexeddb)
    // Load from IndexedDB
    // Verify Map/Set restored correctly
  });
});
```

**Success Criteria:**
- All Map/Set types serialize correctly
- Nested structures work (Map<Set>, Set<Map>)
- Edge cases handled (empty, large, special values)
- Integration with IndexedDB verified
- Tests run in < 2 seconds

**Agent Notes:**
- Use `toEqual()` for deep equality (not `toBe()`)
- Test with real store data structures if possible
- If integration test fails, check fake-indexeddb setup
- Round-trip = serialize → deserialize → compare to original

---

## 🟢 FOUNDATIONAL TASK 8: E2E Smoke Tests

**Tool:** Playwright  
**Time:** 👤 4-6 hours | 🤖 8-12 hours  
**Dependencies:** Best done after Task 6 (component refactoring helps stability)

### What This Covers
Critical user paths only. Minimal E2E coverage for integration confidence. Heavy setup but high value for catching breaking changes.

### Phase 1: Setup Playwright
👤 1 hour | 🤖 2-3 hours

Install Playwright:
```bash
npm install -D @playwright/test
npx playwright install chromium
```

Create configuration:
```typescript
// Create: playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run sequentially (IndexedDB state issues)
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid state conflicts
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 min for slow starts
  },
});
```

Create directory structure:
```
e2e/
  fixtures/
    testFactory.ts      # Helper to create test data
  tests/
    1-create-factory.spec.ts
    2-import-factory.spec.ts
    3-navigation.spec.ts
```

**Agent Notes:**
- Run `npx playwright test --headed` to see browser
- Use `npx playwright codegen http://localhost:5173` to generate selectors
- Tests run against dev server (Vite)
- Single worker prevents IndexedDB conflicts between tests

### Phase 2: Implement Critical Path Tests
👤 3-4 hours | 🤖 5-7 hours

**Test 1: Create and Solve Factory** (`e2e/tests/1-create-factory.spec.ts`)
```typescript
import { test, expect } from '@playwright/test';

test('create factory and solve', async ({ page }) => {
  // Navigate to app
  await page.goto('/');
  
  // Create new zone
  await page.click('text=New Zone');
  await page.fill('input[name=zoneName]', 'Test Zone');
  await page.click('text=Create');
  
  // Create factory
  await page.click('text=New Factory');
  await page.fill('input[name=factoryName]', 'Test Factory');
  await page.click('text=Create');
  
  // Add recipe node (use sidebar search)
  await page.fill('input[placeholder*=Search]', 'iron smelting');
  await page.click('text=Iron Smelting'); // Drag to canvas
  
  // Solve factory
  await page.click('text=Solve');
  await expect(page.locator('text=Solution found')).toBeVisible();
  
  // Export factory
  await page.click('text=Export');
  const downloadPromise = page.waitForEvent('download');
  await page.click('text=Download');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.txt$/);
});
```

**Test 2: Import Factory** (`e2e/tests/2-import-factory.spec.ts`)
```typescript
test('import factory from export', async ({ page }) => {
  await page.goto('/');
  
  // Use test export from testExports.json
  const testExport = 'base85 encoded string from fixture';
  
  await page.click('text=Import');
  await page.fill('textarea', testExport);
  await page.click('text=Import Factory');
  
  // Verify nodes rendered
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  
  // Verify solution loaded
  await expect(page.locator('text=/buildings?/')).toBeVisible();
});
```

**Test 3: Navigation** (`e2e/tests/3-navigation.spec.ts`)
```typescript
test('navigate between zones and factories', async ({ page }) => {
  await page.goto('/');
  
  // Create 2 zones with factories
  // ... setup code ...
  
  // Navigate to zone 1
  await page.click('text=Test Zone 1');
  await expect(page).toHaveURL(/\/zones\/[^/]+$/);
  
  // Navigate to factory
  await page.click('text=Test Factory 1');
  await expect(page).toHaveURL(/\/zones\/[^/]+\/[^/]+$/);
  
  // Navigate back to zones list
  await page.click('text=All Zones');
  await expect(page).toHaveURL('/');
  
  // Verify state persisted (check IndexedDB)
  const zonesCount = await page.evaluate(() => {
    return new Promise((resolve) => {
      const request = indexedDB.open('planner-db');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('zones', 'readonly');
        const store = tx.objectStore('zones');
        const countRequest = store.count();
        countRequest.onsuccess = () => resolve(countRequest.result);
      };
    });
  });
  expect(zonesCount).toBe(2);
});
```

**Agent Notes:**
- Use `test.describe.serial()` for tests that depend on each other
- Clear IndexedDB between independent tests: `await page.evaluate(() => indexedDB.deleteDatabase('planner-db'))`
- Use `page.pause()` to debug interactively
- Selectors: prefer `text=` over CSS (more stable)
- Wait for navigation: `await expect(page).toHaveURL(...)`
- Run single test: `npx playwright test 1-create-factory`

### Phase 3: CI Integration
👤 1 hour | 🤖 2 hours

**If using GitHub Actions:**
```yaml
# Create: .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

**Local CI simulation:**
```bash
# Run in headless mode (like CI)
npx playwright test

# View report
npx playwright show-report
```

**Success Criteria:**
- 3 smoke tests pass (create, import, navigate)
- Tests run in < 2 minutes total
- Failures produce actionable screenshots
- CI integration working (if applicable)

**Agent Notes:**
- E2E tests are slowest - keep minimal
- Use `test.slow()` for tests that need more time
- Screenshots saved to `test-results/` on failure
- Trace viewer: `npx playwright show-trace trace.zip`

---

## Task Priority Matrix

| Task | Priority | Agent Time | Dev Time | Dependencies | ROI |
|------|----------|------------|----------|--------------|-----|
| 1. Solver Tests | 🔴 Critical | 4-8h | 2-4h | None | ⭐⭐⭐⭐⭐ |
| 2. Import/Export | 🔴 Critical | 5-8h | 3-4h | None | ⭐⭐⭐⭐⭐ |
| 3. Graph Model | 🟡 High | 8-12h | 4-6h | Task 1 | ⭐⭐⭐⭐ |
| 5. Game Data | 🟡 High | 3-5h | 2-3h | None | ⭐⭐⭐⭐ |
| 7. Hydration | 🟢 Foundation | 3-4h | 2h | None | ⭐⭐⭐ |
| 6. Components | 🟢 Foundation | 8-12h | 4-6h | None | ⭐⭐⭐ |
| 4. Store Actions | 🟡 High | 12-18h | 6-8h | None | ⭐⭐⭐ |
| 8. E2E | 🟢 Foundation | 8-12h | 4-6h | Task 6 | ⭐⭐ |

## Recommended Sequence

### For AI Agents (Conservative Path)

**Week 1-2:** Tasks 1, 2 (10-16h)
- Core safety net - critical path coverage
- Pure functions, minimal refactoring risk
- Immediate value, low complexity

**Week 3:** Tasks 5, 7 (6-9h)
- Quick wins, build confidence
- Small, isolated tasks
- Establishes testing patterns

**Week 4-5:** Task 3 (8-12h)
- Higher complexity refactor
- Requires careful validation
- High value payoff

**Week 6-7:** Task 6 (8-12h)
- Foundation for UI tests
- Moderate complexity
- Enables future development

**Week 8-10:** Task 4 (12-18h)
- Highest effort task
- Requires thorough testing
- Do after gaining experience

**Week 11-12:** Task 8 (8-12h)
- Final integration layer
- Benefits from all prior work
- Polish for release

**Total Agent Time:** 52-79 hours over 12 weeks (~5-7h/week)

### For Experienced Developer (Aggressive Path)

**Week 1:** Tasks 1, 2 (5-8h)  
**Week 2:** Tasks 5, 7 (4-5h)  
**Week 3:** Task 3 (4-6h)  
**Week 4:** Task 6 (4-6h)  
**Week 5-6:** Task 4 (6-8h)  
**Week 7:** Task 8 (4-6h)

**Total Dev Time:** 27-43 hours over 7 weeks (~4-6h/week)

---

## Agent-Specific Guidelines

### When Starting a Task

1. **Read the full task description** - Don't skip phases
2. **Check dependencies** - Ensure prerequisite tasks complete
3. **Run existing tests first** - `npm test` to establish baseline
4. **Review related files** - Understand current implementation
5. **Ask for clarification** - If task unclear, ask before coding

### During Implementation

1. **Make small changes** - Commit after each phase
2. **Test frequently** - After every logical change
3. **Verify in UI** - For refactoring, manually test app still works
4. **Document assumptions** - Add comments explaining non-obvious logic
5. **Run full test suite** - Before marking task complete

### Common Pitfalls

1. **Changing too much at once** - Refactor incrementally
2. **Skipping validation** - Always test refactor before adding tests
3. **Mock-happy testing** - Use real data (gameData.ts) when possible
4. **Flaky E2E tests** - Add explicit waits, don't rely on implicit timing
5. **Breaking existing functionality** - Run full app manually after refactoring

### When Stuck

1. **Run test in isolation** - `npm test <filename>`
2. **Use test debugging** - Add `console.log()`, use `test.only()`
3. **Check type errors** - `npm run typecheck`
4. **Review similar tests** - Look at existing test patterns
5. **Ask for help** - Provide specific error messages and context

---

## Success Metrics

After completing all tasks:

✅ **Core solver has 90%+ coverage** - Edge cases tested  
✅ **Zero data loss in import/export** - Round-trip verified  
✅ **Store actions are predictable** - All mutations tested  
✅ **Components have testable architecture** - Logic extracted  
✅ **E2E tests catch integration issues** - Critical paths covered  
✅ **Test suite runs in < 30 seconds** (excluding E2E < 2min)  
✅ **New features can be TDD'd** - Infrastructure in place  
✅ **Refactoring is safer** - Tests catch regressions  

**Test Metrics:**
- Unit tests: < 5 seconds total
- Component tests: < 10 seconds total  
- Integration tests: < 15 seconds total
- E2E tests: < 2 minutes total
- Total coverage: 60-70% (focusing on high-risk areas)

---

## Maintenance

### Adding New Tests

After initial implementation, maintain test quality:

1. **New solver features** → Add to Task 1 tests
2. **New store actions** → Add to Task 4 reducer tests
3. **New components** → Follow Task 6 patterns
4. **New import formats** → Add to Task 2 fixtures
5. **New critical paths** → Consider Task 8 E2E (sparingly)

### Running Tests

```bash
# All tests (quick)
npm test

# Watch mode (during development)
npm test -- --watch

# Coverage report
npm test -- --coverage

# Specific file
npm test solver

# E2E tests
npx playwright test

# E2E with UI
npx playwright test --headed

# Update snapshots (after intentional changes)
npm test -- -u
```

### CI Integration

Recommended GitHub Actions workflow:
```yaml
name: Tests
on: [push, pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test -- --coverage
  
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```
