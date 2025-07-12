import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ProductId } from "./graph/loadJsonData";
import { LocalStorageProvider } from "./LocalStorageProvider";

export type FactorySettings = {
  id: string; // Unique identifier for the factory
  name: string;
  icon?: string;
  desiredOutputs: {
    id: ProductId,
    qty: number,
    priority: number,
  }[],
  fixedInputs: {
    id: ProductId,
    qty: number,
  }[],  
}

const DEFAULT_SETTINGS: FactorySettings = {
  id: "default-factory",
  name: "Default",
  desiredOutputs: [],
  fixedInputs: [],
}

type FactoryContextType =  LocalStorageProvider<FactorySettings> & {
};

const FactoryContext = createContext<FactoryContextType | undefined>(undefined);

const localstoragePrefix = "Factory_settings_" ;

export const FactoryProvider = ({ children, id = "default-factory" }: { children: ReactNode, id: string }) => {
  console.log("FactoryProvider initialized for", id);

  const {settings, updateSettings, resetSettings} = LocalStorageProvider(localstoragePrefix + id, DEFAULT_SETTINGS);

  return (
    <FactoryContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </FactoryContext.Provider>
  );
};

export const useFactory = () => {
  const context = useContext(FactoryContext);
  if (!context) {
    throw new Error("useFactory must be used within a FactoryProvider");
  }
  return context;
};
