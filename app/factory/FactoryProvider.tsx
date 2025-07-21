import { type ReactNode } from "react";
import {FactoryContext} from "./FactoryContext";
import useStore from "./store";

export const FactoryProvider = ({ children, id = "default-factory" }: { children: ReactNode, id: string }) => {
  console.log("FactoryProvider initialized for", id);

  // Init store with factory data
  const store = useStore({
    id: id,
    edges: [], 
    nodes: [], 
    goals: [],
  });

  return (
    <FactoryContext.Provider value={{ useStore: store }}>
      {children}
    </FactoryContext.Provider>
  );
};
