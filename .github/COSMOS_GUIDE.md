# React Cosmos - Component Development Guide

React Cosmos is integrated into the project for isolated component development and visual testing. Use it to develop, test, and verify UI components in isolation without running the full application.

## Running Cosmos

Start the Cosmos development server:
```bash
npm run cosmos
```

This launches an interactive component explorer at `http://localhost:5000` (default port) where you can:
- View and interact with components in isolation
- Test different component states and props
- Verify visual changes without navigating through the full app
- Develop new components with hot reloading

## Creating Fixtures

Fixtures are files that define how components should be rendered in Cosmos. Create fixture files with the `.fixture.tsx` extension.

**Location**: Place fixtures next to the components they test (e.g., `app/components/MyComponent.fixture.tsx`)

**Fixture Philosophy**: Be conservative about states to include. Prop values can be changed in the UI easily, so include only key states that change large portions of the component, not details and small variations.

### Basic Pattern

```tsx
import MyComponent from './MyComponent';

export default {
  'Default State': () => <MyComponent />,
  'With Props': () => <MyComponent prop1="value" prop2={123} />,
  'Error State': () => <MyComponent error="Something went wrong" />
};
```

### Complex Example (with store/context setup)

```tsx
import RecipeNode from './factory/graph/RecipeNode';
import type { RecipeNodeData } from './factory/graph/recipeNodeLogic';
import { createTestFactoryStore, getFactoryWrapper } from './test/helpers/renderHelpers';

const factoryId = 'test-factory';
const testStore = createTestFactoryStore(factoryId, 'Test Factory');

export default {
  'Power Generator': () => getFactoryWrapper(
    <RecipeNode data={{ recipeId: 'PowerGeneratorT2', ltr: true }} />,
    { withReactFlow: true, store: testStore, factoryId }
  ),
  'Another Variant': () => getFactoryWrapper(
    <RecipeNode data={{ recipeId: 'FBR', ltr: false }} />,
    { withReactFlow: true, store: testStore, factoryId }
  )
};
```

## Verifying UI Changes

**When making UI component changes:**
1. Run `npm run cosmos` to start the development server
2. Navigate to the fixture for the component you're modifying
3. Verify the visual changes work correctly across all fixture states
4. Test interactions (clicks, hovers, etc.) in the Cosmos UI
5. Check multiple viewport sizes if the component is responsive
6. Take screenshots of the component states to document changes

**Benefits:**
- No need to navigate through the full app to reach the component
- Test edge cases and different prop combinations easily
- Fast feedback loop with hot reloading
- Catch visual regressions early in development

## Cosmos Configuration

Configuration is in `cosmos.config.json`:
- Uses the Vite plugin for fast builds
- Shares config with component tests (`vitest.component.config.ts`)
- Watches `./app` directory for changes
- Includes global styles from `app/app.css`
- Static assets served from `public/` directory

## Existing Fixtures

Current fixture files in the repository:
- `app/components/ProductSelector.fixture.tsx` - Basic component fixture example
- `app/RecipeNode.fixture.tsx` - Complex fixture with store and React Flow integration
- `app/components/FactoryOverlayBar.fixture.tsx` - Example with multiple states
- `app/components/SidebarPopover.fixture.tsx` - Popover component variants

Reference these files when creating new fixtures.
