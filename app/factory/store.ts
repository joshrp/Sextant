import { createStore } from "zustand";
import { devtools, persist } from "zustand/middleware";
import debounce from "just-debounce-it";

import { applyEdgeChanges, applyNodeChanges, getConnectedEdges, type OnEdgesChange, type OnNodesChange } from "@xyflow/react";
import {
  addEdge,
  type OnConnect,
} from "@xyflow/react";

import type { CustomNodeType, } from "./graph/nodes";
import type { CustomEdgeType } from "./graph/edges";
import type { ButtonEdge, ButtonEdgeData } from "./graph/edges/ButtonEdge";
import type { RecipeNodeData } from "./graph/RecipeNode";
import { createGraph, solve } from "./solver/solver";
import type { Constraint, FactoryGoal, GraphModel, ManifoldOptions, Solution } from "./solver/types";
import { temporal, type TemporalState } from "zundo";
import equal from "fast-deep-equal";
import type { StorageValue } from "zustand/middleware";

export interface GraphStore {
  name: string,
  nodes: CustomNodeType[];
  edges: CustomEdgeType[];
  throttledNodeUpdate: {
    nodes: CustomNodeType[],
    edges: CustomEdgeType[],
    updateTime: number,
    throttle: number,
  };
  graph?: GraphModel,
  goals: FactoryGoal[];
  manifoldOptions: ManifoldOptions[],
  solution?: Solution;
  graphUpdateAction: () => void;
  solutionUpdateAction: () => void;
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
}

// export type FactoryStore = UseBoundStore<StoreApi<GraphStore>>;
export type FactoryStore = ReturnType<typeof Store>;

export type GraphStoreProps = Pick<GraphStore, "nodes" | "edges" | "goals"> & {
  id: string
};

const Store = ({ id, nodes, edges, goals }: GraphStoreProps) => createStore<GraphStore>()(
  persist(
    devtools(
      temporal(
        (set, get) => ({
          name: 'Default Factory',
          nodes,
          edges,
          goals,
          manifoldOptions: [],
          graph: undefined,
          solution: undefined,
          throttledNodeUpdate: {
            nodes,
            edges,
            updateTime: (new Date().getTime()),
            throttle: 1000,
          },
          addNode: (node) => {
            // console.log("Add node", node, get().nodes.concat(node));
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
                animated: true,
                type: "button-edge",
              } as ButtonEdge, get().edges),
            });
            get().graphUpdateAction();

          },
          graphUpdateAction: () => {
            try {
              console.log('graph update', get().nodes);
              set({
                graph: createGraph(get().nodes, get().edges),
              }, false, "graphUpdateAction");
              console.log("Graph created", get().graph);
              get().validateManifolds();
            } catch (e) {
              console.error("Error in solver", e);
              return;
            }

            get().solutionUpdateAction();
          },
          solutionUpdateAction: async () => {
            const graph = get().graph
            if (!graph) return

            const solution = await solve(graph, get().goals, get().manifoldOptions);

            if (solution.status == "Solved") {
              set({ solution: solution }, false, "solutionUpdateAction");
              const setNode = get().setNodeData;
              const solved = solution.status == "Solved"
              solution.nodeCounts?.forEach(res => setNode(res.nodeId, {
                solution: {
                  solved: true,
                  runCount: solved ? res.count : 0
                }
              }));
            } else if (solution.status == "Error") {
              console.log("Solution Error", solution);
            } else {
              console.log("Infeasible", solution);
              const current = get().solution
              if (current) {
                set({
                  solution: { ...current, status: solution.status }
                })
              }
            }
          },
          validateManifolds: () => {
            set({
              manifoldOptions: get().manifoldOptions.map(man => {
                if (man.free == false) return false;
                const constraint = get().graph?.constraints[man.constraintId]
                if (constraint === undefined) return false;
                const constraintEdges = new Set(Object.keys(constraint.edges));
                const manifoldEdges = new Set(Object.keys(man.edges))
                if (constraintEdges.symmetricDifference(manifoldEdges).size === 0) return man;

                // Have a search across the other constraints and see if we can find a match.
                const otherMatch = Object.keys(get().graph?.constraints || {}).find(id => {
                  const edges = get().graph?.constraints[id].edges;
                  return edges && new Set(Object.keys(edges)).symmetricDifference(manifoldEdges).size == 0
                });
                if (otherMatch) {
                  return {
                    constraintId: otherMatch,
                    edges: man.edges,
                    free: man.free
                  }
                }
                return false;
              }).filter(x => x !== false)
            }, false, "validateManifolds");
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
            get().solutionUpdateAction();
          },
          setNodeData: (nodeId: string, data: Partial<RecipeNodeData>) => {
            set({
              nodes: get().nodes.map(node => {
                if (node.id === nodeId)
                  return { ...node, data: { ...node.data, ...data } };
                return node;
              })
            }, false, "setNodeData");
          },
          setEdgeData: (edgeId: string, data: Partial<ButtonEdgeData>) => {
            set({
              edges: get().edges.map(edge => {
                if (edge.id === edgeId)
                  return { ...edge, data: { ...edge.data, ...data } };
                return edge;
              })
            }, false, "setEdgeData");
          },
          // Sometimes ReactFlow just needs a kick
          forceSetNodesEdges: () => {
            console.log('Forcing set nodes and edges', get().nodes.length, get().edges.length);
            set({
              nodes: [...get().nodes],
              edges: [...get().edges]
            }, false, "forceSetNodesEdges");
          }
        }),
        {
          wrapTemporal: (storeInitializer) => {
            return persist(storeInitializer, {
              name: id + '_temporal_persist',
              storage: {
                getItem: (name) => {
                  const str = localStorage.getItem(name);
                  if (!str) return null;
                  return JSON.parse(str, hydration.reviver);                  
                },
                setItem: (name, newValue: StorageValue<TemporalState<GraphStore>>) => {
                  const str = JSON.stringify(newValue, hydration.replacer);

                  localStorage.setItem(name, str)
                },
                removeItem: (name) => localStorage.removeItem(name),
              },
            })
          },

          equality(pastState, currentState) {
            // Only save an undo state if the goals change,
            // or if the solver is recreated, becuase that only happens
            // when something significant in the graph changes 
            // recipes, edge connections, goals etc.
            let changed = false;
            try {
              changed ||= !equal(pastState.goals, currentState.goals);
              changed ||= !equal(pastState.graph, currentState.graph);
              changed ||= !equal(pastState.edges, currentState.edges);
              changed ||= pastState.nodes.reduce((hasChanged, pastNode, i) =>
                hasChanged || !equal(pastNode.data, currentState.nodes[i]?.data),
                changed as boolean
              );
            } catch (e) {
              console.error('Error checking equality', e)
            }

            return !changed;
          },
          handleSet: (handleSet) => {
            const myDebouncedFunction = debounce<typeof handleSet>(s => handleSet(s), 1000, false);

            return (state) => state && myDebouncedFunction(state, true);
          },
          limit: 1000,


        }
      ),
      {

      }
    ),
    {
      name: id + "_zustand",
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str, hydration.reviver);
        },
        setItem: (name, newValue: StorageValue<GraphStore>) => {
          const str = JSON.stringify(newValue, hydration.replacer);

          localStorage.setItem(name, str)
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

const hydration = {
  reviver: (_: string, value: unknown) => {
    // Check it's an object at all
    if (value && typeof value === 'object') {
      // These are mostly for TS checks
      if (!Object.hasOwn(value, '_dataType')) return value;
      if (!("data" in value && "_dataType" in value)) return value;

      if (value._dataType === 'Map') {
        return new Map(value.data as [unknown, unknown][]);
      } else if (value._dataType === 'Set') {
        return new Set(value.data as [unknown, unknown][]);
      }
      console.error('Unknown data type in localStorage', value._dataType);
    }

    return value;
  },
  replacer: (_:string, value: unknown) => {
    if (value instanceof Map) {
      return {
        _dataType: 'Map',
        data: Array.from(value.entries()),
      };
    } else if (value instanceof Set) {
      return {
        _dataType: 'Set',
        data: Array.from(value.values()),
      };
    }
    return value;
  }
}
export default Store;
