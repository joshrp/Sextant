import { FactoryOverlayBar } from "./FactoryOverlayBar";
import { createTestFactoryStore, getFactoryWrapper } from '../test/helpers/renderHelpers';
import type { ProductId } from "~/factory/graph/loadJsonData";

export type FactoryOverlayBarProps = {
  open: boolean;
};

export function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-screen h-screen black flex overflow-hidden items-start justify-center">
      <div className="w-full h-1/2 overflow-auto border border-gray-600 bg-gray-900">
        <table className="table-auto w-full border-collapse border border-gray-600">
          <thead>
            <tr>
              <th className="border border-gray-600 px-4 py-2">Header 1</th>
              <th className="border border-gray-600 px-4 py-2">Header 2</th>
              <th className="border border-gray-600 px-4 py-2">Header 3</th>
              <th className="border border-gray-600 px-4 py-2">Header 4</th>
              <th className="border border-gray-600 px-4 py-2">Header 5</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 50 }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: 5 }).map((_, colIndex) => (
                  <td key={colIndex} className="border border-gray-600 px-4 py-2">
                    Row {rowIndex + 1}, Col {colIndex + 1}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {children}
    </div>
  );
}


export default {
  ProductHighlight() {
const testStore = createTestFactoryStore('test', 'Test Factory');
    testStore.Graph.getState().setHighlight({
      mode: "product",
      productId: 'Product_Acid' as ProductId,
      options: {
        imports: true,
        exports: false,
        inputs: true,
        outputs: false,
        connections: true,
      }
    }); 

    return getFactoryWrapper(<Wrapper><FactoryOverlayBar /></Wrapper>,
      {
        store: testStore,
        factoryId: 'test',
        factoryName: 'Test Factory',
      }
    );
  }
}
