import 'fake-indexeddb/auto';
import { describe, expect, test } from 'vitest';
import { openDB } from 'idb';
import { deleteFactoryFromIdb } from './idb';

describe('deleteFactoryFromIdb', () => {
  test('removes both factoryId and factoryId_historical from IDB', async () => {
    // Create a test IDB with the same schema as production
    const idb = openDB("Test_Zone_DeleteFactory", 1, {
      upgrade(db) {
        db.createObjectStore("factories");
      }
    });

    const db = await idb;
    const factoryId = "test-factory-123";
    
    // Write stub entries for both keys
    await db.put("factories", { data: "factory data" }, factoryId);
    await db.put("factories", { timestamp: Date.now() }, factoryId + "_historical");
    
    // Verify entries exist
    expect(await db.get("factories", factoryId)).toBeDefined();
    expect(await db.get("factories", factoryId + "_historical")).toBeDefined();
    
    // Call deleteFactoryFromIdb
    await deleteFactoryFromIdb(idb, factoryId);
    
    // Assert both keys no longer exist
    expect(await db.get("factories", factoryId)).toBeUndefined();
    expect(await db.get("factories", factoryId + "_historical")).toBeUndefined();
    
    // Clean up
    db.close();
  });
});
