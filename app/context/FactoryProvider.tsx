import { useRef, type ReactNode } from "react";
import { FactoryContext } from "../factory/FactoryContext";
import type { IDB, ProductionZoneStoreData } from "./ZoneProvider";
import Store, { type FactoryStore } from "../factory/store";

interface FactoryProviderProps {
  idb: IDB;
  children: ReactNode;
  id: string;
  name: string;
  weights: ProductionZoneStoreData["weights"];
}

export const FactoryProvider = ({ children, idb, id = "default-factory", name, weights }: FactoryProviderProps) => {
  const storeRef = useRef<FactoryStore | null>(null);
  
  if (!storeRef.current || storeRef.current?.Graph.getInitialState().id !== id) {
    console.log("Factory Store initialized for", id);

    // Initialize store only once
    storeRef.current = Store(idb, { id, name });

    // Ignore persisted weights, always use provided weights from the user preferences  
    storeRef.current?.Graph.persist.onFinishHydration(state => state.setBaseWeights(weights));
  }  

  return (
    <FactoryContext.Provider value={{ 
      store: storeRef.current?.Graph, 
      historical: storeRef.current?.Historical,
      id, name
    }}>
      {children}
    </FactoryContext.Provider>
  );
};
