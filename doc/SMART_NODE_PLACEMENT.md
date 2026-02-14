# Smart Node Placement - Implementation Plan

# Key agent instructions
Use subagents to review after each phase, reviewing code, tests and the steps followed to make sure nothing was missed. 

Run `npm run typecheck`, `npm test`, and `npm run lint` after each stage to ensure code quality and correctness before proceeding.

## Purpose

Define the implementation for smart node placement in two independent flows that remain compatible:

1. **Button-placed nodes** (sidebar/controls): find an available slot in the visible viewport.
2. **Connection-drop nodes** (drag from handle to canvas): place and orient the new node so the connected handle lands at the drop point and faces the source handle.

## Scope

### In scope

- Keep button-placement behavior stable.
- Fix connection-drop behavior so it is geometry-correct and orientation-correct.
- Use shared pure helpers so both flows can be combined later.

### Out of scope (for now)

- Merging both flows into one UX path.
- Post-render correction for button-placed nodes.
- Broad refactors of `ReactFlowProvider` boundaries.

## Current Problems to Address

1. Connection-drop orientation currently relies on coarse node-position heuristics (comparing node positions in `shouldFlipNode`), not precise handle geometry.
2. Post-render alignment logic exists in `RecipeNode` (~110 lines), but the creation path in `factory.tsx:addProductToGraph` **never sets `alignToDrop`** on the new node — this is the root cause.
3. Orientation is computed twice and can conflict: once in `graph.tsx:onConnectEnd` (pre-render, node-position-based via `shouldFlipNode`) and again in `RecipeNode.tsx` alignment effect (post-render, handle-position-based via `sourceHandleX`).
4. The `AddRecipeNode` type lacks fields to carry drop intent metadata through the async recipe picker dialog.
5. Existing e2e connection-drop tests have variable-before-declaration bugs (`shouldFlipRight`/`shouldFlipLeft` reference `dropRight`/`dropLeft` before their `const` declarations).

## Design Principles

1. **Decoupled now, compatible later**.
2. **Geometry from handles, not node centers**.
3. **Pure logic first** (unit-testable), minimal React Flow glue.
4. **Opt-in alignment pass** only for connection-drop nodes.
5. **Single source of truth for orientation** — avoid computing flip in two places.

## Global Position Verification Rules (applies to all stages)

Because React Flow layout and node orientation can settle over multiple frames, visual correctness must be validated with deterministic geometry checks, not by screenshot-only/manual inspection.

1. **Always assert in coordinates, not appearance**.
   - Read node and handle centers from DOM (`getBoundingClientRect`) and compare against expected drop/target points.
   - Use explicit pixel tolerances (for example, handle-to-drop distance `< 20-25px`).

2. **Wait for orientation/position to stabilize before asserting**.
   - After node creation or flip, poll for a short stabilization window (e.g. 2-3 consecutive samples where position and transform are unchanged).
   - Do not assert immediately after `mouse.up()` or recipe selection.

3. **Normalize viewport state for every test**.
   - Set a deterministic viewport size.
   - Reset pan/zoom before each scenario so coordinate comparisons are consistent.

4. **Treat re-orientation as expected behavior**.
   - Assertions must allow an intermediate orientation and validate final orientation after settle.
   - Verify final handle side (input/output facing source) rather than relying on transient class changes.

5. **Prefer geometry helpers over ad-hoc test code**.
   - Keep reusable helpers for: node center, handle center, nearest-handle distance, orientation state, and stabilization wait.
   - Use the same helpers in all connection-drop and regression tests.

## Data Contract

### Existing type: `HandleDropAlignment` (`app/factory/graph/recipeNodeLogic.ts`)

The existing `HandleDropAlignment` type is already consumed by `RecipeNode.tsx`. Align new data to this shape:

```ts
type HandleDropAlignment = {
  x: number;              // drop position in flow coordinates
  y: number;
  productId: ProductId;   // which handle to align
  handleType: 'input' | 'output'; // target handle type on the new node
  sourceHandleX?: number; // source handle X in flow coords (for orientation)
  sourceHandleType?: 'input' | 'output';
};
```

### New fields on `AddRecipeNode` (`app/factory/factory.tsx`)

Add an optional field to carry drop intent through the recipe picker round-trip:

```ts
export type AddRecipeNode = {
  productId: ProductId;
  position: { x: number; y: number };
  produce: boolean;
  otherNode: string;
  ltr?: boolean;
  getSmartPosition?: (recipeId: RecipeId) => { x: number; y: number };
  dropIntent?: HandleDropAlignment;  // NEW — present only for connection-drop
};
```

This payload is **undefined for button-placement**.

### Orientation ownership

For connection-drop nodes, `graph.tsx:onConnectEnd` should **not** compute `ltr` via `shouldFlipNode`. Instead, pass `ltr: undefined` and let the `RecipeNode` alignment effect determine orientation from handle geometry. This eliminates the double-flip conflict.

## Implementation Plan

### Stage 0 - Build Positioning Verification Harness (required prerequisite)

Files:
- `e2e/node-placement.spec.ts`
- `e2e/helpers/connections.ts` (new)
- `e2e/helpers/geometry.ts` (new)

Actions:
1. Add a shared Playwright harness for position/orientation validation in React Flow:
   - `getNodeCenter(page, nodeId)`
   - `getHandleCenter(page, nodeId, productId, handleType)`
   - `getClosestHandleInfo(page, nodeId, point)`
   - `isNodeFlipped(page, nodeId)`
2. Add stabilization helpers for auto-reorient flows:
   - `waitForGraphStabilized(page, nodeId)` that samples node `transform` + center across frames and requires consecutive identical readings.
   - `waitForOrientationSettled(page, nodeId, expectedFlip)` with bounded timeout.
3. Add deterministic test setup helpers:
   - Standard viewport setup and zoom/pan reset before each test.
   - Optional `fitView`/known zoom utility if available in existing test helpers.
4. Convert at least one existing connection-drop test to use the harness and prove it catches final settled orientation/position.

Review:
- Run `npx playwright test e2e/node-placement.spec.ts`.
- Confirm assertions are geometry-based (distance/coordinates), not purely screenshot expectations.

Expected result:
- A reusable, deterministic harness exists before implementing placement/orientation logic.
- All later stages can rely on consistent verification even when React Flow re-orients over multiple frames.

### Stage 1 - Stabilize Button Placement (no behavior change)

Files:
- `app/factory/graph/graph.tsx`
- `app/factory/factory.tsx`
- `app/factory/graph/nodePositioning.ts`

Actions:
1. Keep sentinel-position (`{ x: 0, y: 0 }`) and smart slot lookup flow unchanged.
2. Keep smart position callback registration from graph to factory.
3. Ensure button-created nodes do not include connection-drop alignment metadata.

Clean-up:
- Remove the TODO comment block (lines 42–56 of `graph.tsx`) — the refactoring listed there is being addressed by this plan.
- Verify `isSentinelPosition` is not accidentally true for nodes at `(0, 0)` that were intentionally placed there. (Current sentinel is exactly `{ x: 0, y: 0 }` — this is fine because real nodes at origin are edge cases, but document the assumption.)

Review:
- Run `npm test` — all existing unit tests pass.
- Run `npm run typecheck` — no type errors.
- Run `npm run lint` — no new warnings.
- Manually verify button placement via Cosmos or dev server: add 3 nodes via sidebar, confirm non-overlapping viewport-aware positions.

Expected result:
- Button drops still calculate viewport-aware, non-overlapping positions.
- No functional changes — this stage is a clean baseline.

### Stage 2 - Capture Precise Drop Geometry in `onConnectEnd`

Files:
- `app/factory/graph/graph.tsx`
- `app/factory/factory.tsx` (type change only)
- `app/factory/graph/recipeNodeLogic.ts` (import only)

Actions:
1. Add `dropIntent?: HandleDropAlignment` to `AddRecipeNode` type.
2. In `onConnectEnd`:
   a. Compute `dropPosition` using `screenToFlowPosition` (already done).
   b. Resolve the source handle DOM element using `connectionState.fromHandle` metadata (node id + product id + handle type).
   c. Convert source handle's screen center to flow coordinates using `screenToFlowPosition`.
   d. Build a `HandleDropAlignment` object with: `{ x: dropPosition.x, y: dropPosition.y, productId, handleType: <opposite of source>, sourceHandleX: <flow X of source handle>, sourceHandleType }`.
   e. Pass `dropIntent` on the `AddRecipeNode` call.
3. **Remove** the `shouldFlipNode` call and hardcoded `ltr` calculation from `onConnectEnd`. Pass `ltr: undefined` — let the alignment effect handle orientation.
4. Simplify the provisional position calculation — use `dropPosition` directly (the alignment effect will correct it). Remove the `x + 30 * (addingSource ? -10 : 1)` offset hack.

Clean-up:
- Remove the now-unused `shouldFlipNode` import from `graph.tsx` if no other call sites remain in this file.
- Remove `sourceNodePos` and `sourceLtr` variables if no longer needed.
- Verify `shouldFlipNode` in `nodePositioning.ts` is still exported (it may be used by the orientation utility in Stage 4 or other callers).

Review:
- Run `npm run typecheck` — confirm `AddRecipeNode` type change compiles.
- Run `npm test` — existing tests still pass.
- Manually test: drag from a handle to canvas → recipe picker should still appear. The new node's position may be rough at this stage (alignment wiring happens in Stage 3).

### Stage 3 - Persist Alignment Intent on New Node

File:
- `app/factory/factory.tsx`

This is the **critical wiring step** — without it, the existing `RecipeNode` alignment effect never fires.

Actions:
1. In `addProductToGraph`, when `recipeAdd.dropIntent` is defined:
   a. Set `data.alignToDrop = recipeAdd.dropIntent` on the new node object.
   b. Use `dropIntent.x` / `dropIntent.y` as the provisional position (rough placement near drop point).
   c. Skip smart positioning for connection-drop nodes (they are not sentinel-positioned).
2. When `recipeAdd.dropIntent` is **not** defined, keep existing sentinel/smart-position logic unchanged.
3. Apply to **both** node creation branches:
   - The settlement node branch (`recipe.type === "settlement"`) must also include `alignToDrop` in its data.
   - The standard recipe/balancer node branch must include `alignToDrop`.

Clean-up:
- Ensure `alignToDrop` does not leak into IndexedDB persistence long-term. The `RecipeNode` alignment effect already clears it after use, but verify there's no race with store persistence. If `alignToDrop` is present when serialized, it will re-trigger alignment on next hydration — this is acceptable (idempotent) but worth noting.

Review:
- Run `npm run typecheck`.
- Run `npm test`.
- Manually test connection-drop end-to-end: drag handle → pick recipe → verify the new node appears near cursor with correct handle alignment. The alignment should now work because `alignToDrop` is set and the existing `RecipeNode` effect processes it.

### Stage 4 - Orientation Utility Based on Handle Geometry

Files:
- `app/factory/graph/nodePositioning.ts`
- `app/factory/graph/nodePositioning.test.ts`

Actions:
1. Add a **new** pure helper `shouldFlipFromHandleGeometry` (or similar) that determines orientation from:
   - `sourceHandleType: 'input' | 'output'`
   - `sourceHandleX: number` (flow coordinate of source handle center)
   - `dropX: number` (flow coordinate of drop point)
2. This is simpler than `shouldFlipNode` — no source `ltr` parameter needed because we're using actual handle positions, not node positions.
3. Keep the existing `shouldFlipNode` function as-is for backward compatibility.
4. Unit-test the new helper:
   - Dragging from output handle, drop to the right → `ltr: true` (input faces left toward source).
   - Dragging from output handle, drop to the left → `ltr: false` (input faces right toward source).
   - Dragging from input handle, drop to the left → `ltr: true` (output faces right toward source).
   - Dragging from input handle, drop to the right → `ltr: false` (output faces left toward source).
   - Edge case: drop at same X as source → default to `ltr: true`.

Clean-up:
- Add JSDoc explaining the difference between `shouldFlipNode` (node-position-based, used in button-placement flow) and `shouldFlipFromHandleGeometry` (handle-position-based, used in connection-drop alignment).
- Review whether `shouldFlipNode` is still called anywhere after Stage 2 removed it from `onConnectEnd`. If not, consider marking it `@deprecated` but do not remove it yet.

Review:
- Run `npm test` — all unit tests including new ones pass.
- Run `npm run typecheck`.

Expected result:
- Orientation decision is deterministic and test-covered.
- Both `shouldFlipNode` (legacy) and `shouldFlipFromHandleGeometry` (new) coexist.

### Stage 5 - Verify and Fix Post-Render Alignment in `RecipeNode` (connection-drop only)

File:
- `app/factory/graph/RecipeNode.tsx`

**Note:** The alignment effect already exists (~110 lines, `useLayoutEffect` with `alignToDrop`). This stage is about verifying it works correctly with the new data flow and fixing any issues — not a rewrite.

Actions:
1. Verify the existing alignment effect handles all cases:
   - Orientation flip via `sourceHandleX` / `sourceHandleType` comparison.
   - Handle lookup by `productId` and `handleType`, with fallback to closest handle.
   - Position shift so handle center aligns with drop point.
   - Cleanup of `alignToDrop` after success or failure.
2. Update the orientation flip logic (lines 95–103 of `RecipeNode.tsx`) to use the new `shouldFlipFromHandleGeometry` helper from Stage 4 instead of inline comparisons.
3. Verify retry logic: the `requestAnimationFrame` retry loop (up to 6 attempts) handles the case where the DOM hasn't rendered the node yet.
4. Verify that flipping `ltr` mid-alignment (`setNodeData(props.id, { ltr: desiredLtr })`) correctly triggers a re-render and the next `tryAlign` frame sees the updated handle layout.

Clean-up:
- Extract the alignment coordinate math (screen ↔ flow transformations at lines 84–92) into a named helper or add clear comments. This code parses CSS transforms directly and is fragile.
- Remove any dead code paths that are now unreachable.

Review:
- Run `npm test`.
- Run `npm run typecheck`.
- Test manually in dev server:
  - Drag from output handle, drop to the right → new node's input handle aligns to drop point, node faces left.
  - Drag from output handle, drop to the left → new node's input handle aligns to drop point, node faces right.
  - Drag from input handle, drop to the left → new node's output handle aligns to drop point, node faces right.
  - Drag from input handle, drop to the right → new node's output handle aligns to drop point, node faces left.
  - Verify button-placement still works correctly (regression check).

Expected result:
- The connected handle of the new node is under/near cursor and faces source.
- Orientation logic uses the shared pure helper from Stage 4.

### Stage 6 - E2E + Regression Coverage

Files:
- `e2e/node-placement.spec.ts`
- `e2e/helpers/connections.ts` (new)
- `e2e/helpers/goals.ts` (if needed)

#### Fix Existing Bugs First

The existing connection-drop e2e tests have compile-time bugs that must be fixed before anything else:

1. **Variable-before-declaration in "handle drop right" test** (around line 302–306):
   `shouldFlipRight` references `dropRight` before its `const` declaration. Fix by moving `dropRight` declaration above `shouldFlipRight`.

2. **Same bug in "handle drop left" test** (around line 331–334):
   `shouldFlipLeft` references `dropLeft` before declaration. Same fix.

3. After fixing, run `npx tsc --noEmit` on the e2e files to confirm they compile.

#### Connection-Drop Test Implementation

The existing handle-drop tests use `page.mouse.down/move/up` to simulate a connection drag. This may not reliably trigger React Flow's `onConnectEnd` because React Flow requires the drag to originate from a handle element specifically. Verify and fix the interaction:

1. **Initiate from handle element:** Instead of `page.mouse.move(sourceCenter.x, sourceCenter.y); page.mouse.down()`, locate the actual handle element and start the drag from its bounding box center:
   ```ts
   const handleLocator = page.locator(
     `.react-flow__node[data-id="${sourceNodeId}"] .react-flow__handle[data-handleid="${productId}"]`
   ).first();
   const handleBox = await handleLocator.boundingBox();
   const startX = handleBox.x + handleBox.width / 2;
   const startY = handleBox.y + handleBox.height / 2;
   await page.mouse.move(startX, startY);
   await page.mouse.down();
   ```

2. **Drag to drop point with intermediate moves:** React Flow needs mouse-move events to register the connection:
   ```ts
   await page.mouse.move(dropX, dropY, { steps: 5 });
   await page.mouse.up();
   ```

3. **Wait for recipe picker and select:**
   ```ts
   await pickFirstRecipe(page);
   await waitForNodeCount(page, 2);
   ```

4. **Assert handle alignment:**
   ```ts
   const newNodeId = (await getNodeIds(page)).find(id => !initialNodeIds.includes(id));
   const closestHandle = await getClosestHandleInfo(page, newNodeId, { x: dropX, y: dropY });
   expect(closestHandle.distance).toBeLessThan(25); // 25px tolerance
   ```

5. **Assert orientation:**
   ```ts
   const flipped = await isNodeFlipped(page, newNodeId);
   // For output-handle drag to the right: new node should NOT be flipped
   // For output-handle drag to the left: new node SHOULD be flipped
   expect(flipped).toBe(expectedFlip);
   ```

#### Test Cases to Cover

**Connection-drop tests:**
- `handle drop to the right of source output handle` — new node input faces left, handle near drop point.
- `handle drop to the left of source output handle` — new node input faces right, handle near drop point.
- `handle drop to the right of source input handle` — new node output faces left, handle near drop point.
- `handle drop to the left of source input handle` — new node output faces right, handle near drop point.

**Button-placement regression tests (existing, keep as-is):**
- `multiple nodes added sequentially from sidebar do not overlap`
- `sidebar-placed node is within the visible viewport`
- `five nodes added sequentially all avoid overlap`

#### Helper Additions

Consider extracting shared drag helpers into a new `e2e/helpers/connections.ts`:
- `dragFromHandle(page, nodeId, productId, handleType, dropPoint)` — encapsulates handle lookup, drag start, intermediate moves, and drop.
- `getNewNodeAfterAction(page, beforeIds, action)` — runs `action`, waits for new node, returns its ID.

Review:
- Run `npx playwright test e2e/node-placement.spec.ts` — all tests pass.
- Run the full e2e suite: `npx playwright test` — no regressions.
- Check test output screenshots/videos for visual correctness if Playwright is configured to capture them.

Expected result:
- Both flows are validated independently.
- Connection-drop tests use reliable handle-initiated drags.
- No variable-before-declaration or compile errors.

## Compatibility Plan (Future)

When combining both methods later:
1. Use button smart-slot as primary placement.
2. Optionally pass a preferred connection anchor as alignment intent.
3. Reuse the same orientation and post-render alignment utilities.

This enables “place near predefined connection and face correctly” without regressing current behavior.

## Edge Cases to Consider

1. **Stale `alignToDrop` on reload:** If the app crashes between node creation and alignment completion, `alignToDrop` persists in IndexedDB. On next load it re-triggers alignment. This is acceptable (idempotent) but may cause a brief visual jump.
2. **Settlement / Balancer nodes:** Both branches in `addProductToGraph` must set `alignToDrop`. The alignment effect in `RecipeNode` handles all node sub-types (they all render through the same component).
3. **Handle not found after all retries:** The existing cleanup code clears `alignToDrop` after 6 failed `requestAnimationFrame` attempts — node stays at provisional position.
4. **Position (0, 0) ambiguity:** `isSentinelPosition` returns true for any node at exact origin. Connection-drop nodes should never have sentinel position since `dropIntent` flow bypasses sentinel logic.

## Acceptance Criteria

1. **Connection-drop**
   - New node's connected handle aligns to the drop point within tolerance.
   - Orientation always faces source handle.
   - `alignToDrop` is cleared from node data after alignment completes.
2. **Button placement**
   - Existing sentinel/smart-slot behavior remains unchanged.
   - No `alignToDrop` metadata on button-placed nodes.
3. **Architecture**
   - Shared pure helpers are used for orientation/alignment math.
   - No hard dependency from button flow to connection-drop metadata.
   - Single source of truth for orientation: `graph.tsx` does not compute `ltr` for connection-drop nodes; `RecipeNode` alignment effect owns that decision.
   - `AddRecipeNode.dropIntent` carries data through the recipe picker round-trip.
4. **Quality**
   - All unit tests pass (`npm test`).
   - All e2e tests pass (`npx playwright test`).
   - Type checking passes (`npm run typecheck`).
   - Linting passes (`npm run lint`).

## Notes for Agents

- Implement incrementally by stage and keep each stage buildable.
- Prefer minimal edits to existing APIs.
- Do not remove button-placement fallback behavior while implementing connection-drop fixes.
- At each stage: run `npm run typecheck`, `npm test`, and `npm run lint` before proceeding to the next stage.
- The RecipeNode alignment effect already exists and works — Stage 5 is verification and cleanup, not a rewrite.
- The critical missing wiring is in Stage 3: `addProductToGraph` must set `data.alignToDrop` from `recipeAdd.dropIntent`.
- If a file you change has a Cosmos fixture, run `npm run cosmos` and verify the fixture still renders correctly.
