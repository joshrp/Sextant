/**
 * Test helpers for rendering React components with proper context
 */
import 'fake-indexeddb/auto';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { FactoryContext } from '~/factory/FactoryContext';
import Store, { type FactoryStore } from '~/factory/store';
import { getIdb } from '~/context/idb';
import { ReactFlowProvider } from '@xyflow/react';

/**
 * Creates a test factory store with default values
 */
export function createTestFactoryStore(
  id = 'test-factory',
  name = 'Test Factory'
): FactoryStore {
  const idb = getIdb(id);
  if (!idb) {
    throw new Error('Failed to create IndexedDB instance for test factory store');
  }
  return Store(idb, { id, name });
}

interface RenderWithFactoryOptions extends Omit<RenderOptions, 'wrapper'> {
  store?: FactoryStore;
  factoryId?: string;
  factoryName?: string;
  withReactFlow?: boolean;
}

/**
 * Renders a component with FactoryContext provider
 * Useful for testing components that use useFactory or useFactoryStore hooks
 * 
 * @param ui - The component to render
 * @param options.store - Optional pre-configured store
 * @param options.factoryId - Factory ID for the context
 * @param options.factoryName - Factory name for the context
 * @param options.withReactFlow - Whether to wrap with ReactFlowProvider (default: false)
 * @returns Render result with store reference
 */
export function renderWithFactory(
  ui: ReactElement,
  {
    store,
    factoryId = 'test-factory',
    factoryName = 'Test Factory',
    withReactFlow = false,
    ...options
  }: RenderWithFactoryOptions = {}
) {
  const testStore = store || createTestFactoryStore(factoryId, factoryName);

  function Wrapper({ children }: { children: ReactNode }) {
    const content = (
      <FactoryContext.Provider
        value={{
          store: testStore.Graph,
          historical: testStore.Historical,
          id: factoryId,
          name: factoryName,
        }}
      >
        {children}
      </FactoryContext.Provider>
    );

    // Optionally wrap with ReactFlowProvider for components that need it
    if (withReactFlow) {
      return <ReactFlowProvider>{content}</ReactFlowProvider>;
    }

    return content;
  }

  return { ...render(ui, { wrapper: Wrapper, ...options }), store: testStore };
}
