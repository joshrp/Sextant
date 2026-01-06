import 'fake-indexeddb/auto';

import { describe, expect, test } from 'vitest';
import '@ungap/compression-stream/poly';
import * as imex from "./importexport";
import testFactories from "./testFactories.json";
import testExports from "./testExports.json";
import { default as FactoryStore, type GraphCoreData } from '../store';
import { openDB } from 'idb';
import {setDebugSolver} from '../solver/solver';

describe("Import Export", () => {
  describe.each(Object.entries(testFactories))('Exporting %s', (key, data) => {
    test(`Basic export`, async () => {
      const str = imex.getBasicB64(data);
      expect(str).toMatchSnapshot();
    });
    test('Minify', async () => {
      const min = imex.minify(data as GraphCoreData);
      expect(min).toMatchSnapshot();
    });
    test('Minify and compress, decompress', async () => {
      const min = imex.minify(data as GraphCoreData);
      const compressed = await imex.compress(min);
      expect(compressed).toMatchSnapshot();
      const decompressed = await imex.decompress(compressed);
      expect(decompressed).toEqual(min);
    });
  });

  describe.each(Object.entries(testExports['version-1']))('Importing %s', (key, data) => {
    test('Decompress and unminify', async () => {
      if (typeof data !== "string") throw new Error("Test data is not a string");
      const decompressed = await imex.decompress(data);
      expect(decompressed).toMatchSnapshot();
      const core = imex.unminify(decompressed);
      expect(core).toMatchSnapshot();
    });
  });

  describe('Full Store Export/Import', () => {
    test('Compress and decompress full store', async () => {

      setDebugSolver(false);
      const exportStr = testExports['version-1']['steam-large'];
      const min = await imex.decompress(exportStr)
      const core = imex.unminify(min);
      const idb = getIdb();
      const store = FactoryStore(idb, {id: "test", name: "Test Factory" });
      
      await (store.Graph.getState().importData(core));

      expect(store.Graph.getState().solution?.ObjectiveValue).toBeCloseTo(20375.7, 1);
      const newExport = imex.minify(store.Graph.getState());
      expect(newExport).toEqual(min);
      
      const recompressed = await imex.compress(newExport);
      expect(recompressed).toEqual(exportStr);
      
    });

  });

  describe('Icon Export/Import', () => {
    test('Export with icon and import preserves it', async () => {
      const testIcon = '/assets/products/Product_Iron.png';
      const testData: GraphCoreData = {
        name: "Test Factory with Icon",
        nodes: [],
        edges: [],
        goals: []
      };
      
      // Export with icon
      const minified = imex.minify(testData, testIcon);
      expect(minified[5]).toBe(testIcon);
      
      // Compress and decompress
      const compressed = await imex.compress(minified);
      const decompressed = await imex.decompress(compressed);
      
      // Import and verify icon is preserved
      const imported = imex.unminify(decompressed);
      expect(imported.icon).toBe(testIcon);
      expect(imported.name).toBe("Test Factory with Icon");
    });

    test('Export without icon works correctly', async () => {
      const testData: GraphCoreData = {
        name: "Test Factory without Icon",
        nodes: [],
        edges: [],
        goals: []
      };
      
      // Export without icon
      const minified = imex.minify(testData);
      expect(minified[5]).toBeUndefined();
      
      // Compress and decompress
      const compressed = await imex.compress(minified);
      const decompressed = await imex.decompress(compressed);
      
      // Import and verify icon is undefined
      const imported = imex.unminify(decompressed);
      expect(imported.icon).toBeUndefined();
      expect(imported.name).toBe("Test Factory without Icon");
    });
  });
});

const getIdb = () => {
  return openDB("TestFake_ImportExport", 1, {
    async upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        await db.createObjectStore("factories");
        await db.createObjectStore("factory-history");
      }
      else
        throw new Error("Database version not supported, please clear site data for this site.");
    }
  });
}
