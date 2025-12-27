import { openDB } from "idb";

export type IDB = ReturnType<typeof openDB>;
const isClient = typeof window !== "undefined";
const isTests = typeof process !== "undefined" && process.env.NODE_ENV === "test";
const indexedDBVersion = 2;
export const zoneObjectStore = 'zone-settings';

/**
 * Note, do not use outside this module
 * Exported for testing only
 * @param zoneId 
 * @returns 
 */
export const getIdb = (zoneId: string) => {
  return isClient || isTests ? openDB("Zone_" + zoneId, indexedDBVersion, {
    async upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        await db.createObjectStore(zoneObjectStore);
        await db.createObjectStore("factories");
        await db.createObjectStore("factory-history");
      }
      else
        throw new Error("Database version not supported, please clear site data for this site.");
    }
  }) : null;
}
