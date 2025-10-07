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
