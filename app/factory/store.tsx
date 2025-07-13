import { create, type StoreApi, type UseBoundStore } from "zustand";
import { type ProductId } from "./graph/loadJsonData";

import { applyEdgeChanges, applyNodeChanges, type OnEdgesChange, type OnNodesChange } from "@xyflow/react";
import {
  addEdge,
  type OnConnect,
} from "@xyflow/react";

import { buildNodeConnections, type NodeConnections } from "./solver";
import type { CustomNodeType, } from "./graph/nodes";
import type { CustomEdgeType } from "./graph/edges";

export interface GraphStore {
  nodes: CustomNodeType[];
  edges: CustomEdgeType[];
  nodeConnections: NodeConnections | null;
  throttledNodeUpdate: {
    nodes: CustomNodeType[],
    edges: CustomEdgeType[],
    updateTime: number,
    throttle: number,
  };
  constraints: {
    lpp: string;
    openOutputs: ProductId[];
    openInputs: ProductId[];
  };
  graphChangeAction: () => void;
  addNode: (node: CustomNodeType) => void;
  addEdge: (edge: CustomEdgeType) => void;
  onNodesChange: OnNodesChange<CustomNodeType>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  loadingHighs: boolean;
}

export type FactoryStore = UseBoundStore<StoreApi<GraphStore>>;

export type GraphStoreProps = {
  initialNodes: CustomNodeType[],
  initialEdges: CustomEdgeType[],
};

const useStore = ({initialNodes, initialEdges}: GraphStoreProps) => create<GraphStore>((set, get) => ({
  loadingHighs: true,
  nodes: initialNodes,
  edges: initialEdges,
  nodeConnections: null,
  constraints: {
    lpp: '',
    openOutputs: [],
    openInputs: [],
  },
  throttledNodeUpdate: {
    nodes: initialNodes,
    edges: initialEdges,
    updateTime: (new Date().getTime()),
    throttle: 1000,
  },
  addNode: (node) => set((state) => ({ nodes: state.nodes.concat(node) })),
  addEdge: (connection) => set((state) => ({ edges: addEdge(connection, state.edges) })),
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
    const nowTime = new Date().getTime();
    if (nowTime - get().throttledNodeUpdate.updateTime > get().throttledNodeUpdate.throttle)
      set({
        throttledNodeUpdate: {
          nodes: get().nodes,
          edges: get().edges,
          updateTime: nowTime,
          throttle: 1000
        }
      });
  },
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges) as CustomEdgeType[],
    });

    if (changes.filter(change => change.type === "remove").length > 0) {
      get().graphChangeAction();
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
      }, get().edges),
    });

    get().graphChangeAction();
  },
  graphChangeAction: () => {
    set({
      nodeConnections: buildNodeConnections(get().nodes, get().edges)
    });
  },
}));

export default useStore;
