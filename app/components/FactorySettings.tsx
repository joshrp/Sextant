import { InformationCircleIcon } from "@heroicons/react/24/solid";
import { useMatches, useNavigate } from "react-router";
import useFactory, { useFactoryStore } from "~/factory/FactoryContext";
import { loadData, type ProductId } from "~/factory/graph/loadJsonData";
import useProductionMatrix from "~/factory/MatrixContext";
import type { MatrixStoreData } from "~/factory/MatrixProvider";
import { productIcon } from "~/uiUtils";
import { SelectorDialog } from "./Dialog";

const { products } = loadData();

export default function FactorySettings() {
  console.log("Rendering FactorySettings");
  const navigate = useNavigate();
  const matches = useMatches();
  const parentUrl = matches[matches.length - 2]?.pathname || "/factories/default";
  const matrixStore = useProductionMatrix().store;

  const factoryStore = useFactory().store;
  const matrixWeights = useFactoryStore(state => state.baseWeights);
  const weights = useFactoryStore(state => state.weights);

  const baseWeights: Map<ProductId, number> = new Map();

  const setPreset = (preset: MatrixStoreData["weights"]["base"]) => {
    matrixStore.setState(state => ({ weights: { ...state.weights, base: preset } }), false);
    factoryStore.setState(state => ({ baseWeights: { ...state.weights, base: preset } }), false);
  };

  /**
   *  TODO:: Presets save but don't do anything. Weights don't save.
   *       - Need a save button up top that saves to both stores
   *       - Need to hide non-changed weights unless "show all" is toggled
   */
  
  return (
    <SelectorDialog isOpen={true} setIsOpen={() => { navigate(parentUrl); }} title="Settings"
      heightClassName="h-[90vh]"
      widthClassName="w-7/8"
    >
      <div className="product-weighgts">
        <div className="presets">
          <h2>Presets - {matrixWeights.base}</h2>
          <div className="flex space-x-2">
            <button onClick={() => setPreset('early')} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Early Game</button>
            <button onClick={() => setPreset('mid')} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Mid Game</button>
            <button onClick={() => setPreset('late')} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Late Game</button>
            <button onClick={() => setPreset('end')} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">End Game</button>
          </div>
        </div>
        <hr className="my-4 border-t border-gray-300" />
        <h2></h2>
        <table className="w-full">
          <thead>
            <tr>
              <th>Product</th>
              <th>Default <InformationCircleIcon className="inline-block w-5" /></th>
              <th>User <InformationCircleIcon className="inline-block w-5" /></th>
              <th>Factory <InformationCircleIcon className="inline-block w-5" /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from(products.values()).map(p => (
              <tr key={p.id}>
                <td>
                  <img src={productIcon(p.icon)} alt={p.name} className="inline w-6 h-6 mr-2 align-middle" />
                  {p.name}
                </td>
                <td>
                  <span>{baseWeights.get(p.id) ?? 0}</span>
                </td>
                <td>
                  <input type="number" className="w-20 p-1 bg-gray-700 m-1 rounded" value={matrixWeights.products.get(p.id)} />
                </td>
                <td>
                  <input type="number" className="w-20 p-1 bg-gray-700 m-1  rounded" value={weights.products.get(p.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SelectorDialog>
  );
}
