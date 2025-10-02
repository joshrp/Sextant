import { useRef, type ReactNode } from "react";
import { FactoryContext } from "./FactoryContext";
import type { MatrixStoreData } from "./MatrixProvider";
import Store, { type FactoryStore } from "./store";

interface FactoryProviderProps {
  children: ReactNode;
  id: string;
  weights: MatrixStoreData["weights"];
}

export const FactoryProvider = ({ children, id = "default-factory", weights }: FactoryProviderProps) => {
  const storeRef = useRef<FactoryStore | null>(null);
  
  if (!storeRef.current || storeRef.current?.getInitialState().id !== id) {
    console.log("Factory Store initialized for", id);

    // Initialize store only once
    storeRef.current = Store({
      id: id,
      edges: [], 
      nodes: [], 
      goals: []
    });

    // Ignore persisted weights, always use provided weights from the user preferences  
    storeRef.current?.persist.onFinishHydration(state => state.setBaseWeights(weights));
  }  

  return (
    <FactoryContext.Provider value={{ store: storeRef.current }}>
      {children}
    </FactoryContext.Provider>
  );
};
