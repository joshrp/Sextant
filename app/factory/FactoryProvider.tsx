import { type ReactNode } from "react";
import {FactoryContext} from "./FactoryContext";
import Store from "./store";

export const FactoryProvider = ({ children, id = "default-factory" }: { children: ReactNode, id: string }) => {
  console.log("FactoryProvider initialized for", id);
  
  // Init store with factory data
  const store = Store({
    id: id,
    edges: [], 
    nodes: [], 
    goals: [],
  });

  return (
    <FactoryContext.Provider value={{ store }}>
      {children}
    </FactoryContext.Provider>
  );
};
