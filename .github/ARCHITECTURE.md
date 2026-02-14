# COI Calculator - Architecture Details

## State Management Hierarchy

Three-level Zustand store hierarchy persisted to IndexedDB:

1. **PlannerStore** (`app/context/PlannerProvider.tsx`) - Global zones management
2. **ProductionZoneStore** (`app/context/ZoneProvider.tsx`) - Zone-level factories and weights
3. **GraphStore** (`app/factory/store.ts`) - Individual factory graph state (nodes/edges/solution)

Stores are cached and reused across navigations. Access via context hooks:
- `useFactory()` - Current factory's GraphStore
- `useProductionZone()` - Current zone's ProductionZoneStore
- `usePlanner()` - Global PlannerStore

### Custom Hydration for IndexedDB

Map and Set types require custom serialization (`app/hydration.ts`). Always use `hydration.replacer` and `hydration.reviver` when storing to IndexedDB or localStorage.

## Game Data Pipeline

Static game data (`app/gameData.ts`, 32K+ lines) sourced from Captain of Industry mod exports:
- Parsed via `data/reformat.ts` from `data/raw/` JSON files
- Products, recipes, machines with complex relationships (inputs/outputs/dependencies)
- Run `npm run formatData` to regenerate `gameData.ts` from raw sources
- Icons extracted from Unity asset bundles (see `data/README.md`)

## Type System

- `ProductId`, `RecipeId`, `MachineId` are branded string types (not real keyof due to large size)
- `CustomNodeType` and `CustomEdgeType` extend React Flow types with game-specific data
- `RecipeNodeData` contains: `{ recipeId, ltr, multiplier? }`

## Routing Convention

Nested routes use React Router v7 layout pattern:
- `/zones/:zone/:factory?` - Main factory view
- `/zones/:zone/:factory/settings/:tab?` - Modal overlay settings
- Use `useStableParam()` helper (in `app/routes.ts`) to memoize route params

## Linear Programming Solver

Core constraint-based optimization in `app/factory/solver/solver.ts`:

1. User builds factory graph with `@xyflow/react` (`app/factory/graph/graph.tsx`)
2. `createGraphModel()` builds constraint system from nodes/edges
3. `solve()` generates LPP, runs HiGHS solver (2s timeout), returns `Solution` with node counts
4. Solution drives UI updates (manifolds, summaries, node decorations)

**Constraint types:**
- Equality constraints (=0) - exact balance requirements
- Loose constraints (>=0) - minimum requirements
- Tight loop closures - for manifold constraints

**Scoring methods:**
- `infra` - minimize infrastructure cost
- `inputs` - minimize input resources
- `footprint` - minimize building footprint
- `outputs` - maximize output production

## Import/Export System

Factory states compressed via base85 encoding (`app/factory/importexport/importexport.ts`):
- Custom minification of node/edge/goal data structures
- Version-aware deserialization with type mappings
- Test fixtures in `testFactories.json` and `testExports.json`

## Manifold Constraints

User-togglable edge groups that can be "freed" (unconstrained) in solver:
- Stored as `ManifoldOptions[]` in GraphStore
- UI shows manifold selectors on edges (`app/factory/graph/edges/ButtonEdge.tsx`)
- Affects which constraints are included in LPP generation

## File Organization

- `app/context/` - Zustand stores and React context providers
- `app/factory/` - Factory graph, solver, and import/export logic
- `app/factory/graph/` - React Flow components (nodes, edges, sidebar)
- `app/components/` - Shared UI components
- `data/` - Game data processing and raw source files
- `public/assets/` - Static game icons and images
