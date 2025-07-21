import { type ReactNode } from "react";
import { LocalStorageProvider } from "./LocalStorageProvider";
import { ProductionMatrixContext, type ProductionMatrixSettings } from "./MatrixContext";

const LOCAL_STORAGE_KEY = "ProductionMatrix_settings";

const DEFAULT_SETTINGS: ProductionMatrixSettings = {
  factories: [{
    id: "default-factory",
    order: 0,
  }]
};

export const ProductionMatrixProvider = ({ children }: { children: ReactNode }) => {
  console.log("ProductionMatrixProvider initialized");

  const {settings, updateSettings, resetSettings} = LocalStorageProvider(LOCAL_STORAGE_KEY, DEFAULT_SETTINGS);

  return (  
    <ProductionMatrixContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </ProductionMatrixContext.Provider>
  );
};
