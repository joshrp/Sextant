import { useCallback, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { CloseButton, Description, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'

import {
  useNodesState,
  useEdgesState,
  addEdge,
  type OnConnect,
} from "@xyflow/react";

import Sidebar from "./graph/sidebar";
import Graph from "./graph/graph";
import {
  loadMachineData,
  loadProductData,
  loadRecipeData,
  type ProductId,
  type RecipeId,
} from "./graph/loadJsonData";

import { initialNodes, type CustomNodeType } from "./graph/nodes";
import { initialEdges, type CustomEdgeType } from "./graph/edges";
import RecipePicker from "./RecipePicker";

let id = 1;
const getId = () => id++;

const recipeData = loadRecipeData();
const machineData = loadMachineData();
const productData = loadProductData();

const formatRecipeData = (key: RecipeId) => {
  const machine = machineData[recipeData[key].machine];
  return `${machine.name} - ${recipeData[key].name}`;
}

const formatProductData = (key: ProductId) => {
  const product = productData[key];
  const recipes = product.recipes.output.length;
  return `${product.name} (${recipes})`;
}


export function Factory() {

  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeType>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CustomEdgeType>(initialEdges);

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((edges) => addEdge(connection, edges)),
    [setEdges]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [recipeSelectorProductId, setRecipeSelectorProduct] = useState<ProductId | null>(null);
  const recipeSelectorProduct = recipeSelectorProductId ? productData[recipeSelectorProductId] : null

  const addProduct = (id: ProductId) => {
    setRecipeSelectorProduct(id);
    setIsOpen(true);
    console.log('edges', edges, nodes);
  };

  const addRecipeNode = useCallback((id: RecipeId) => {
    const recipe = recipeData[id];
    const newId = getId();
    const newNode = {
      id: newId + "",
      position: { x: newId * 100, y: newId * 100 },
      data: {
        label: formatRecipeData(id),
      },
    };

    setNodes(nds => nds.concat(newNode));
  }, [setNodes, setEdges, formatRecipeData]);

  return (
    <ReactFlowProvider>
      <main className="flex items-center justify-center">
        <div className="flex-1 flex flex-col items-center h-full">
          <header className="flex flex-col items-center gap-3 h-[10vh]">
            <div className="max-w-[100vw] p-4">
              Factory
            </div>
          </header>

          <div className="h-[90vh] flex flex-row w-full" >
            <div className="h-full w-[30vw] resize-x overflow-x-hidden w-max-[50vw]">
              <Sidebar products={productData} addProduct={addProduct} />
            </div>
            <div className="flex-1 flex flex-col items-center gap-3 h-full">
              <Graph
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
              />
            </div>

          </div>
        </div>
      </main>
      
      <Dialog open={isOpen} onClose={setIsOpen} className="">
        <DialogBackdrop className="fixed inset-0 bg-gray-500/75 transition-opacity data-open:opacity-40 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in" />
        <div className="fixed flex inset-0 z-10">
          <DialogPanel className="m-auto max-h-[80vh] grid grid-rows-[min-content_1fr] min-w-20 w-[60vw] bg-gray-100 dark:bg-gray-800 transition-opacity data-open:opacity-100 data-closed:opacity-0 data-enter:duration-2000 data-enter:ease-out data-leave:duration-200 data-leave:ease-in text-center sm:items-center sm:p-0">
            {recipeSelectorProductId !== null && (<>
              <div className="w-full flex items-center justify-between mb-2 p-2 border-b-2 border-gray-300 dark:border-gray-700 relative">
                <div className="flex-1" />
                <DialogTitle className="flex-6">
                  Make {recipeSelectorProduct?.name}
                </DialogTitle>
                <CloseButton className="flex-1 text-right" onClick={() => setIsOpen(false)}>
                  <span className="sr-only">Close</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </CloseButton>
              </div>
              <div className="p-2 overflow-y-auto max-h-full">
                <RecipePicker
                  productId={recipeSelectorProductId}
                  selectRecipe={(id) => { addRecipeNode(id); setIsOpen(false); }}
                  productIs="output" />
              </div>
            </>
            )}
          </DialogPanel>
        </div>
      </Dialog>
      
    </ReactFlowProvider >
  );
}
