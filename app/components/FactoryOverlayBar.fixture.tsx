import { FactoryOverlayBar } from "./FactoryOverlayBar";
import { createTestFactoryStore, getFactoryWrapper } from '../test/helpers/renderHelpers';
import { loadData, type ProductId } from "~/factory/graph/loadJsonData";
import { useFixtureInput, useFixtureSelect } from "react-cosmos/client";

export type FactoryOverlayBarProps = {
  open: boolean;
};

const {products } = loadData();

const testStore = createTestFactoryStore('test', 'Test Factory');
export default {
  ProductHighlight() {
    const states = {
      Visible: useFixtureInput("Visible", true),
      Inputs: useFixtureInput("Inputs", true),
      Outputs: useFixtureInput("Outputs", false),
      Connected: useFixtureInput("Connected", true),
      Unconnected: useFixtureInput("Unconnected", false),
      Edges: useFixtureInput("Lines", true),
      ProductId: useFixtureSelect("ProductId", {
        options: products.keys().toArray(),
        defaultValue: 'Product_Acid' as ProductId
      }),
    }
    
    testStore.Graph.getState().setHighlight({
      mode: states.Visible[0] ? "product" : "none",
      productId: states.ProductId[0],
      options: {
        connected: states.Connected[0],
        unconnected: states.Unconnected[0],
        inputs: states.Inputs[0],
        outputs: states.Outputs[0],
        edges: states.Edges[0],
      }
    });

    testStore.Graph.setState({
      getProductsInGraph: () => {
        console.log("Getting products in graph, returning", states.ProductId[0]);
        return new Set(products.keys().toArray());
      }
    })

    return getFactoryWrapper(<Wrapper><FactoryOverlayBar /></Wrapper>,
      {
        store: testStore,
        factoryId: 'test',
        factoryName: 'Test Factory',
      }
    );
  }
}

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
