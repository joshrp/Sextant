import { useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";

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
  ProductId,
  RecipeId,
} from "./graph/loadJsonData";

import { initialNodes, type CustomNodeType } from "./graph/nodes";
import { initialEdges, type CustomEdgeType } from "./graph/edges";

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
  
  const addProduct = useCallback((id: ProductId) => {
    const product = productData[id];
    const newId = getId();
    const newNode = {  
      id: newId + "",  
      position: { x: newId*100, y: newId*100 },
      data: {
        label: formatProductData(id),
      },
    };
    
    setNodes(nds => nds.concat(newNode));
    console.log('edges', edges);
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
      </ReactFlowProvider>
  );
}
