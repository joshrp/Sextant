import { createContext, useContext } from "react";

import { type FactoryStore } from "./store";

export type FactorySettings = {
  id: string; // Unique identifier for the factory
  name: string;
  icon?: string;
}

type FactoryContextType = {
  store: FactoryStore;
};

export const FactoryContext = createContext<FactoryContextType | undefined>(undefined);

export default function useFactory() {
  const context = useContext(FactoryContext);
  if (!context) {
    throw new Error("useFactory must be used within a FactoryProvider");
  }
  return context;
}
