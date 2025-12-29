import { createStore } from "zustand";
import { devtools, persist } from "zustand/middleware";

import { addEdge, applyEdgeChanges, applyNodeChanges, getConnectedEdges, type OnConnect, type OnEdgesChange, type OnNodesChange } from "@xyflow/react";

import type { StorageValue } from "zustand/middleware";
import hydration from "~/hydration";
import type { ProductionZoneStoreData } from "../context/ZoneProvider";
import type { CustomEdgeType } from "./graph/edges";
import type { ButtonEdge, ButtonEdgeData } from "./graph/edges/ButtonEdge";
import type { ProductId, RecipeId } from "./graph/loadJsonData";
import type { CustomNodeType, } from "./graph/nodes";
import type { RecipeNodeData } from "./graph/RecipeNode";
import { createGraphModel, solve } from "./solver/solver";
import type { Constraint, FactoryGoal, GraphModel, GraphScoringMethod, ManifoldOptions, Solution, SolutionStatus } from "./solver/types";
import * as reducers from "~/context/reducers/graphReducers";
import { minify } from "./importexport/importexport";
import type { SolverTestFixture } from "./solver/solver.integration.test";
import type { IDB } from "~/context/idb";

export interface GraphCoreData {
  name: string,
  nodes: CustomNodeType[];
  edges: CustomEdgeType[];
  goals: FactoryGoal[];
}

export interface GraphSolutionState extends GraphCoreData {
  graph?: GraphModel,
  solution?: Solution;
  solutionStatus?: SolutionStatus;
  scoringMethod: GraphScoringMethod;
}

export interface GraphStoreActions {
  graphUpdateAction: () => Promise<void>;
  solutionUpdateAction: (autoSolve?: boolean) => Promise<void>;
  addNode: (node: CustomNodeType) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: CustomEdgeType) => void;
  onNodesChange: OnNodesChange<CustomNodeType>;
  onEdgesChange: OnEdgesChange;
  setNodeData: (nodeId: string, data: Partial<RecipeNodeData>) => void,
  setEdgeData: (edgeId: string, data: Partial<ButtonEdgeData>) => void,
  onConnect: OnConnect;
  forceSetNodesEdges: () => void,
  validateManifolds: () => void,
  setManifold: (constraints: Constraint[], on: boolean) => void;
  setScoreMethod: (method: GraphStore["scoringMethod"]) => void;
  setBaseWeights: (weights: ProductionZoneStoreData["weights"]) => void;
  importData: (data: GraphImportData) => Promise<void>;
  exportTestData: () => string;
  setHighlight: (highlight: GraphStore['highlight']) => void;
}

export type HighlightNone = {
  mode: "none";
}
export type HighlightProduct = {
  mode: "product";
  productId: ProductId;
  options: {
    imports: boolean;
    exports: boolean;
    inputs: boolean;
    outputs: boolean;
    connections: boolean;
  };
}
export type HighlightEdges = {
  mode: "edges";
  edgeIds: string[];
}

export interface GraphStore extends GraphSolutionState, GraphStoreActions {
  id: string,

  baseWeights: ProductionZoneStoreData["weights"];
  weights: Pick<ProductionZoneStoreData["weights"], "infrastructure" | "products">;
  manifoldOptions: ManifoldOptions[];
  highlight: HighlightNone | HighlightProduct | HighlightEdges;

}

// export type FactoryStore = UseBoundStore<StoreApi<GraphStore>>;
export type FactoryStore = ReturnType<typeof Store>;

export type GraphStoreProps = { id: string, name: string };

const Store = (idb: IDB, { id, name }: GraphStoreProps) => {
  const Historical = createStore<{ lastUpdated: number | null }>()(
    devtools(
      persist(
        (set) => ({
          lastUpdated: null,
          setLastUpdated: (time: number) => set({ lastUpdated: time }, false, "setLastUpdated")
        }),
        {
          name: id + "_historical",
          version: 1,
          storage: {
            getItem: async (name) => {
              const str = await (await idb).get("factories", name);

              if (!str) return null;
              const data = JSON.parse(str, hydration.reviver);
              return data;
            },
            setItem: async (name, newValue: StorageValue<{ lastUpdated: number | null }>) => {
              const str = JSON.stringify(newValue, hydration.replacer);

              return (await idb).put("factories", str, name)
            },
            removeItem: () => { },
          },
        }
      )
    )
  );
  const Graph = createStore<GraphStore>()(
    devtools(
      persist(
        (set, get) => ({
          id,
          name,
          nodes: [],
          edges: [],
          goals: [],
          graph: undefined,
          solution: undefined,
          solutionStatus: undefined,
          scoringMethod: "infra",

          baseWeights: {
            infrastructure: new Map<string, number>(),
            products: new Map<ProductId, number>(),
            base: "early",
          },
          weights: {
            infrastructure: new Map<string, number>(),
            products: new Map<ProductId, number>(),
          },
          manifoldOptions: [],

          highlight: { mode: "none" },

          addNode: (node) => {
            set({ nodes: [...get().nodes.concat(node)] }, false, "addNode");
            get().graphUpdateAction();
          },
          addEdge: (connection) => {
            set(state => ({ edges: addEdge(connection, state.edges) }), false, "addEdge");
            get().graphUpdateAction();
          },
          removeNode: (nodeId: string) => {
            const node = get().nodes.filter(n => n.id == nodeId);
            const edges = getConnectedEdges(node, get().edges);
            get().onNodesChange([{
              id: nodeId,
              type: "remove"
            }]);
            get().onEdgesChange(edges.map(e => ({
              type: "remove",
              id: e.id
            })));
            get().graphUpdateAction();
          },
          onNodesChange: (changes) => {
            set({
              nodes: applyNodeChanges(changes, get().nodes),
            }, false, "onNodesChange");
          },
          onEdgesChange: (changes) => {
            set({
              edges: applyEdgeChanges(changes, get().edges) as CustomEdgeType[],
            }, false, "onEdgesChange");

            if (changes.filter(change => change.type === "remove").length > 0) {
              get().graphUpdateAction();
            }
          },
          onConnect: (connection) => {
            if (connection.sourceHandle !== connection.targetHandle) {
              console.warn("Source and target handles do not match, connection ignored.");
              return;
            }

            set({
              edges: addEdge({
                ...connection,
                type: "button-edge",
              } as ButtonEdge, get().edges),
            });
            get().graphUpdateAction();

          },
          graphUpdateAction: async () => {
            try {
              set({
                graph: createGraphModel(get().nodes, get().edges),
              }, false, "graphUpdateAction");
              // console.log("Graph created", get().graph);
              get().validateManifolds();
            } catch (e) {
              console.error("Error in solver", e);
              return;
            }

            return get().solutionUpdateAction(true);
          },
          solutionUpdateAction: async (autoSolve: boolean = false) => {
            set({ solutionStatus: "Running" }, false, "solutionRunning");

            const solutionUpdate = await reducers.solutionUpdateAction({
              state: get(),
              solver: solve,
              autoSolve
            });

            set(solutionUpdate, false, "solutionUpdateAction");
            
            const setNode = get().setNodeData;
            solutionUpdate.solution?.nodeCounts?.forEach(res => setNode(res.nodeId, {
              solution: {
                solved: true,
                runCount: res.count
              }
            }));
          },
          validateManifolds: () => {
            const result = reducers.validateManifolds({
              manifoldOptions: get().manifoldOptions,
              graph: get().graph,
            });
            set({ manifoldOptions: result.manifoldOptions }, false, "validateManifolds");
          },
          setManifold: (constraints: Constraint[], on: boolean) => {
            if (on) {
              set({
                manifoldOptions: [...get().manifoldOptions, ...constraints.map(constraint => ({
                  constraintId: constraint.id,
                  edges: constraint.edges,
                  free: true
                }))]
              })
            } else {
              set({
                manifoldOptions: get().manifoldOptions.filter(m => constraints.findIndex(c => c.id == m.constraintId) == -1)
              });
            }

            return get().solutionUpdateAction();
          },
          setScoreMethod: (method: "infra" | "inputs" | "outputs" | "footprint") => {
            set(state => reducers.updateScoringMethod(state, method), false, "setScoreMethod");
            get().solutionUpdateAction(false);
          },
          setNodeData: (nodeId: string, data: Partial<RecipeNodeData>) => {
            set(state => reducers.updateNodeData(state, nodeId, data), false, "setNodeData");
          },
          setEdgeData: (edgeId: string, data: Partial<ButtonEdgeData>) => {
            set(state => reducers.updateEdgeData(state, edgeId, data), false, "setEdgeData");
          },
          // Sometimes ReactFlow just needs a kick
          forceSetNodesEdges: () => {
            console.log('Forcing set nodes and edges', get().nodes.length, get().edges.length);
            set(state => reducers.cloneNodesEdges(state), false, "forceSetNodesEdges");
          },
          setBaseWeights: (weights: ProductionZoneStoreData["weights"]) => {
            const newState = reducers.updateBaseWeights(get(), weights);
            if (newState !== get()) {
              set(newState, false, "setWeights");
              get().solutionUpdateAction(false);
            }
          },
          setHighlight: (highlight) => set({ highlight }, false, "setHighlight"),
          importData: async (data: GraphImportData) => {
            const newNodes: GraphCoreData["nodes"] = data.nodes.map(n => ({
              id: n.id,
              type: n.type,
              position: n.position,
              data: n.data,
            }));

            const newEdges: GraphCoreData["edges"] = data.edges.map(e => ({
              id: `${e.source}-${e.target}-${e.product}`,
              source: e.source,
              target: e.target,
              sourceHandle: e.product,
              targetHandle: e.product,
              type: "button-edge",
            }))

            const newGoals: GraphCoreData["goals"] = data.goals.map(g => ({
              productId: g.productId,
              qty: g.qty,
              type: g.type,
              dir: g.dir,
            }));

            set({
              name: data.name,
              nodes: newNodes,
              edges: newEdges,
              goals: newGoals,
            }, false, "importData");

            await get().graphUpdateAction();
          },
          
          exportTestData: () => {
            const state = get();
            
            // Use minify to get the factory data in the same format as import/export
            const minifiedFactory = minify(state);
            
            // Gather additional test inputs
            const testData: SolverTestFixture = {
              factory: minifiedFactory,
              manifoldOptions: state.manifoldOptions,
              scoringMethod: state.scoringMethod,
              previousSolutionObjectiveValue: state.solution?.ObjectiveValue,
              expected: state.solution ? {
                objectiveValue: state.solution.ObjectiveValue,
                nodeCounts: state.solution.nodeCounts,
                infrastructure: state.solution.infrastructure,
                products: state.solution.products,
                manifolds: state.solution.manifolds,
              } : undefined,
            };
            
            return JSON.stringify(testData, null, 2);
          },
        }),
        { // Persisted state options
          name: id,
          version: 2,
          storage: {
            getItem: async (name) => {
              const str = await (await idb).get("factories", name);

              if (!str) return null;
              const data = JSON.parse(str, hydration.reviver);
              return data;
            },
            setItem: async (name, newValue: StorageValue<GraphStore>) => {
              const str = JSON.stringify(newValue, hydration.replacer);
              return (await idb).put("factories", str, name)
            },
            removeItem: () => { },
          },
          migrate: (persistedState: unknown, currentVersion: number) => {
            if (!persistedState || !('id' in (persistedState as GraphStore))) {
              console.log("No persisted state found, or invalid, something is weird in migrate.");
              return persistedState as GraphStore;
            }
            const newState = persistedState as GraphStore;

            if (currentVersion === 1) {
              newState.weights = {
                infrastructure: new Map<string, number>(),
                products: new Map<ProductId, number>(),
              };
              console.log("Migrated FactoryStore from version 1 to include weights");
            }
            console.log("Migrated FactoryStore to new version from", currentVersion, newState);
            return newState;
          }
        }
      )
    )
  );

  return {
    Graph,
    Historical
  }
}

export default Store;

export type GraphImportData = {
  name: string;
  nodes: {
    id: string;
    type: string;
    position: { x: number; y: number; };
    data: { recipeId: RecipeId, ltr?: boolean };
  }[],
  edges: {
    type: string;
    source: string;
    target: string;
    product: ProductId;
  }[],
  goals: {
    productId: ProductId;
    qty: number;
    type: "eq" | "lt" | "gt";
    dir: "input" | "output";
  }[]
};
