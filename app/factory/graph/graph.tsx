import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProps,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { nodeTypes, type CustomNodeType } from "./nodes";
import { edgeTypes, type CustomEdgeType } from "./edges";

export interface GraphProps extends ReactFlowProps<CustomNodeType, CustomEdgeType> {

}

export default function Graph({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
}: GraphProps) {
  return (
    <ReactFlow<CustomNodeType, CustomEdgeType>
      nodes={nodes}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      edges={edges}
      edgeTypes={edgeTypes}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      colorMode="dark"
    >
      <Background />
      <MiniMap />
      <Controls />
    </ReactFlow>
  );
}
