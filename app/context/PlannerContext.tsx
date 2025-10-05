import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { PlannerStoreData, PlannerStore } from "./PlannerProvider";

type PlannerContextType = {
  store: PlannerStore;
};

export const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

export default function usePlanner() {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error("usePlanner must be used within a PlannerProvider");
  }
  return context;
};

export function usePlannerStore<U>(selector: (state: PlannerStoreData) => U): U {
  return useStore(usePlanner().store, selector);
}
