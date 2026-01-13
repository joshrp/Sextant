import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { PlannerStoreData, PlannerStore } from "./PlannerProvider";
import type { ExportableZone, BulkImportItem } from "~/types/bulkOperations";

export type { BulkImportItem } from "~/types/bulkOperations";

type PlannerContextType = {
  store: PlannerStore;
  /** Bulk import factories across zones */
  bulkImport: (items: BulkImportItem[]) => Promise<void>;
  /** Get all zones and factories for bulk export */
  getExportableData: () => Promise<ExportableZone[]>;
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
