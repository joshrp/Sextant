import { useRef, type ReactNode } from "react";
import { ProductionZoneContext } from "./ZoneContext";
import { createStore } from "zustand";
import { devtools, persist, type StorageValue } from "zustand/middleware";
import hydration from "~/hydration";
import { openDB } from "idb";
import type { ProductId } from "../factory/graph/loadJsonData";

export const ProductionZoneProvider = ({ zoneId, children }: { zoneId: string, children: ReactNode }) => {
  const storeRef = useRef<ProductionZoneStore | null>(null);
  const idbRef = useRef<IDB | null>(null);
  if (!idbRef.current) {
    idbRef.current = getIdb(zoneId);
  }
  if (!storeRef.current) {
    // Initialize store only once
    storeRef.current = Store(idbRef.current!);
  }
  return (
    <ProductionZoneContext.Provider value={{ 
      idb: idbRef.current!, 
      store: storeRef.current,
      id: zoneId,
      name: zoneId, // TODO:: Allow changing this?
      
    }}>
      {children}
    </ProductionZoneContext.Provider>
  );
};

export type ProductionZoneStore = ReturnType<typeof Store>;
export interface ProductionZoneStoreData {
  factories: {
    id: string,
    order: number,
    name: string
  }[],
  weights: {
    base: "early" | "mid" | "late" | "end",
    products: Map<ProductId, number>,
    infrastructure: Map<string, number>,
  },
  newFactory(name: string): void;
};

const Store = (idb: IDB) => {
  return createStore<ProductionZoneStoreData>()(
    persist(
      devtools(
        (set, get) => ({
          factories: [{
            id: "default-factory",
            name: "Default Factory",
            order: 0,
          }],
          weights: {
            base: 1,
            products: new Map<ProductId, number>(),
            infrastructure: new Map<string, number>(),
          },
        
          newFactory: (name: string) => {
            const settings = get();
            const newId = name.trim().toLowerCase().replace(/\s+/g, "-");
            if (settings.factories.some(f => f.id === newId)) {
              alert("Factory with this name already exists.");
              return;
            }
            set({
              factories: [...settings.factories, {
                id: newId,
                name: name.trim(),
                order: settings.factories.length
              }]
            });
          }
        })
      ),
      {
        name: "current-state",
        storage: {
          getItem: async (name) => {
            // const str = localStorage.getItem('ProductionZone_settings');
            if (!idb) return null;
            const str = await (await idb).get(zoneObjectStore, name);

            if (!str) return null;
            return JSON.parse(str, hydration.reviver);
          },
          setItem: async (name, newValue: StorageValue<ProductionZoneStoreData>) => {
            if (!idb) return;
            const str = JSON.stringify(newValue, hydration.replacer);

            return (await idb).put(zoneObjectStore, str, name)
          },
          removeItem: (name) => localStorage.removeItem(name),

        },
        version: 2,
        migrate: (persistedState: unknown, currentVersion: number) => {
          if (!persistedState || !('factories' in (persistedState as ProductionZoneStoreData))) {
            console.log("No persisted state found, or invalid, something is weird in migrate.");
            return persistedState as ProductionZoneStoreData;
          }
          const newState = persistedState as ProductionZoneStoreData;

          if (currentVersion === 1) {
            newState.weights = {
              infrastructure: new Map<string, number>(),
              products: new Map<ProductId, number>(),
              base: "early",
            };
            console.log("Migrated ProductionZone_settings from version 1 to include weights", newState); 
          }

          return newState;
        }
      })

  );
}

const zoneObjectStore = 'zone-settings';
const isClient = typeof window !== "undefined";
const indexedDBVersion = 2;
export type IDB = ReturnType<typeof openDB>;
const getIdb = (zoneId: string) => {
  return isClient ? openDB("Zone_" + zoneId, indexedDBVersion, {
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
