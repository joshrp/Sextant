import { createContext, useContext } from "react";
import { LocalStorageProvider } from "./LocalStorageProvider";

export type ProductionMatrixSettings = {
  factories: {
    id: string,
    order: number,
    name: string
  }[],
  selected: string
};

type ProductionMatrixContextType = LocalStorageProvider<ProductionMatrixSettings> & {

};

export const ProductionMatrixContext = createContext<ProductionMatrixContextType | undefined>(undefined);

export default function useProductionMatrix() {
  const context = useContext(ProductionMatrixContext);
  if (!context) {
    throw new Error("useProductionMatrix must be used within a ProductionMatrixProvider");
  }
  return context;
};
