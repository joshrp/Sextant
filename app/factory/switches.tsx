import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";
import useFactory from "./FactoryContext";


export function FactorySwitches() {
  const factory = useFactory();
  const store = factory.store;
  const forceSetNodesEdges = useStore(store, state => state.forceSetNodesEdges);
  
  const { past, future, tundo, tredo, tclear } = useStore(store.temporal, useShallow(state => ({
    tclear: state.clear,
    tundo: state.undo,
    tredo: state.redo,
    past: state.pastStates,
    future: state.futureStates
  })));

  // const [pastStates, setPastStates] = useState<Partial<GraphStore>[]>([])
  // const {past, future} = useStore.temporal.subscribe(state => ({past: state.pastStates, future: state.futureStates}))
  const clear = () => {
    tclear();
  }
  const undo = () => {
    tundo();
    forceSetNodesEdges();
  }
  const redo = () => {
    tredo();
    forceSetNodesEdges();
  }

  return <div>No Solution
    <div>
      <button className="mx-2 p-2 bg-blue-800 cursor-pointer" onClick={clear}>Clear</button>
      <button className="mx-2 p-2 bg-blue-800 cursor-pointer" onClick={undo}>Undo ({past.length})</button>
      <button className="mx-2 p-2 bg-blue-800 cursor-pointer" onClick={redo}>Redo ({future.length})</button>
    </div>
  </div>
}

// function ConstraintsSwitcher() {
//   const store = useFactory().store;
//   const model = useStore(store, state => state.graph);
//   // const solutionUpdateAction = useStore().solutionUpdateAction;
//   const { edges } = useStore();

//   if (!model) return <></>;
//   const constraintKeys = Object.keys(model.constraints);

//   const product = (id: ProductId) => {
//     return <img className="h-full" src={'/assets/products/' + productData[id].icon} />
//   }

//   return <div className="constraints flex gap-2 flex-rows h-10 justify-end">
//     {constraintKeys.map(k => {
//       const constraint = model.constraints[k];

//       // Skip this, there's a group later for it
//       // if (constraint.hasLargerGroup) return;

//       const products = {
//         inputs: new Set<string>(),
//         outputs: new Set<string>(),
//       }
//       Object.keys(constraint.edges).forEach(e => {
        
//         const edge = edges.find(x => x.id == e);
//         if (!edge) return
//         model.graph[edge.source].recipe.inputs.map(p => products.inputs.add(p.id));
//         model.graph[edge.target].recipe.outputs.map(p => products.outputs.add(p.id));
//       })
//       if (products.inputs.size == 0) return;
      
//       const inputs: JSX.Element[] = [];
//       const outputs: JSX.Element[] = [];
//       for (const i of products.inputs.values()) {
//         inputs.push(product(i));
//       }      
//       for (const o of products.outputs.values()) {
//         outputs.push(product(o));
//       }
      
//       return <div className="constraintLinks flex-1 " key={"switches-"+k}>
//         {/* <button className="h-10 cursor-pointer border-2 border-gray-600" onClick={()=>toggleConstraint(constraint)}>
//           {product(constraint.productId)} 
//         </button> */}
//           {/* <span>{Object.values(constraint.edges).length}</span> */}
//         {/* {/* {inputs.map(i => i)} */}
//         {"->"}
//         {/* {outputs.map(i => i)} */}
//       </div>

//     })}
//   </div>

// }
