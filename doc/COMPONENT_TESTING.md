# Component Testing

## Setup

Component testing uses a separate test suite with jsdom for slower but comprehensive testing:
- **Vitest** with jsdom environment (component tests only)
- **@testing-library/react** for rendering
- **@testing-library/user-event** for interactions
- **fake-indexeddb** for IndexedDB mocking

Configuration in `vitest.component.config.ts` for component tests:
```typescript
plugins: [tailwindcss(), !process.env.VITEST && reactRouter(), tsconfigPaths()]
test: {
  include: ['**/*.component.test.{ts,tsx}'],
  environment: 'jsdom',
}
```

Unit tests run in Node environment (faster) via `vite.config.ts`.

## Test Helpers

Located in `app/test/helpers/renderHelpers.tsx`:

```typescript
// Render with factory context
const { container, store } = renderWithFactory(<MyComponent />);

// With custom store
const store = createTestFactoryStore('id', 'name');
renderWithFactory(<MyComponent />, { store });

// With React Flow provider
renderWithFactory(<MyComponent />, { withReactFlow: true });
```

**IndexedDB:** fake-indexeddb is imported at top of renderHelpers. Auto-resets between tests.

## Testing Pattern

1. **Extract logic**: Move complex logic to pure functions (see `recipeNodeLogic.ts`)
2. **Test logic**: Unit test pure functions (fast, no mocking needed) - use `.test.ts` extension
3. **Test components**: Use React Testing Library with proper DOM assertions - use `.component.test.tsx` extension

### Example Component Test

File: `RecipeNode.component.test.tsx`

```typescript
it('renders machine name and title bar', () => {
  const props = createNodeProps({ recipeId: 'PowerGeneratorT2', ltr: true });
  const { container } = renderWithFactory(<RecipeNode {...props} />);

  // Validate DOM structure
  expect(container.querySelector('.recipe-node-title-bar')).toBeInTheDocument();
  expect(screen.getByText(/Power generator/i)).toBeInTheDocument();
});
```

### Mock React Flow

```typescript
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    useUpdateNodeInternals: () => vi.fn(),
    useStore: vi.fn(() => false),
    Handle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  };
});
```

## Examples

- `app/factory/graph/recipeNodeLogic.test.ts` - Pure logic tests (7 tests)
- `app/factory/graph/RecipeNode.component.test.tsx` - Component tests (17 tests)

## Running Tests

```bash
npm test                    # Fast unit tests only (Node environment)
npm run test:component      # Component tests (jsdom environment)
npm run test:all            # All tests (unit + component)

# Specific tests
npm test recipeNodeLogic              # Unit test
npm run test:component RecipeNode     # Component test

# Watch mode
npm test -- --watch
npm run test:component -- --watch
```
