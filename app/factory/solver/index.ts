import { useEffect, useRef, useState } from 'react';

import Highs, { type Highs as HighsType } from "highs";
import type { CustomNodeType } from '../graph/nodes';
import type { CustomEdgeType } from '../graph/edges';
import { loadProductData, loadRecipeData, type Product, type ProductId, type Recipe } from '../graph/loadJsonData';

export default class Solver {
  constructor(highs: HighsType) {
    // Initialize the solver here if needed
    console.log("Solver initialized with Highs", highs);
  }
}

const recipeData = loadRecipeData();

const defaultUrl = "https://lovasoa.github.io/highs-js/";
export const useHighs = () => {

  const url = useRef('');
  const [highs, setHighs] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async (url: string) => {
    console.log("Loading Highs from", url);
    return await Highs({ locateFile: (file: string) => url + file });
  }

  useEffect(() => {
    console.log("useHighs effect", url.current, defaultUrl);
    if (url.current !== defaultUrl) {
      setLoading(true);
      url.current = defaultUrl;
      load(defaultUrl)
        .then(exports => setHighs(exports))
        .finally(() => setLoading(false))
    }
  }, [defaultUrl]);
  return { highs, loading };
}


/** Hold a list of nodes this node connects to via edges
```
  nodeId: {
    recipe: Recipe Data
    inputs: {
      water: [{ sourceNodeId, edgeId }]
    },
    outputs: {
      steam: [{targetNodeId, edgeId}]
    }
  }
```
*/
export type NodeConnection = {
  recipe: Recipe,
  inputs: {
    [k in ProductId]?: { nodeId: string, edgeId?: string }[]
  },
  outputs: {
    [k in ProductId]?: { nodeId: string, edgeId?: string }[]
  }
};
export type NodeConnections = Record<string, NodeConnection>;
export type OpenConnections = {
  inputs: { [k in ProductId]?: string[] },
  outputs: { [k in ProductId]?: string[] }
}

export const buildNodeConnections = (nodes: CustomNodeType[], edges: CustomEdgeType[]) => {
  // TODO:: Graph walking to find seperate graphs. Not supported for now.

  let nodesById: Record<string, CustomNodeType> = {};

  const nodeRecipe = {} as Record<string, Recipe>;

  const nodeConnections: NodeConnections = {};
  const openConnections: OpenConnections = {
    inputs: {},
    outputs: {},
  };

  const nodeOrder = {} as Record<string, number>;
  nodes.forEach((node, index) => {
    nodesById[node.id] = node;
    nodeOrder[node.id] = index;
    nodeRecipe[node.id] = recipeData[node.data.recipeId];
    const inputs: NodeConnection["inputs"] = {};
    const outputs: NodeConnection["outputs"] = {};

    nodeRecipe[node.id].inputs.forEach(product => {
      inputs[product.id] = [];
      (openConnections.inputs[product.id] ||= []).push(node.id)
    });

    nodeRecipe[node.id].outputs.forEach(product => {
      outputs[product.id] = [];
      (openConnections.outputs[product.id] ||= []).push(node.id)
    });

    nodeConnections[node.id] = {
      recipe: recipeData[node.data.recipeId],
      inputs: inputs,
      outputs: outputs,
    };
  });

  edges.forEach(edge => {
    const productId = edge.targetHandle as ProductId;

    // Some sanity checks first
    if (!productId) {
      console.error("Item error on node", edge.target);
      throw new Error("No item found on node");
    }

    if (edge.targetHandle !== edge.sourceHandle) {
      console.error("Error matching source", edge.sourceHandle, "and target", edge.targetHandle);
      throw new Error("Source and Target type do not match, something is wrong");
    }

    (nodeConnections[edge.target].inputs[productId] ||= []).push({ nodeId: edge.source, edgeId: edge.id });
    (nodeConnections[edge.source].outputs[productId] ||= []).push({ nodeId: edge.target, edgeId: edge.id });

    // Update open connections list so we know this Product is connected to something
    if (openConnections.inputs[productId] !== undefined) {
      openConnections.inputs[productId] = openConnections.inputs[productId].filter(n => n != edge.target)
      if (openConnections.inputs[productId].length === 0)
        delete openConnections.inputs[productId];
    }
    if (openConnections.outputs[productId] !== undefined) {
      openConnections.outputs[productId] = openConnections.outputs[productId]?.filter(n => n != edge.source)
      if (openConnections.outputs[productId]?.length === 0)
        delete openConnections.outputs[productId];
    }
  });

  return { nodeConnections, openConnections };
}

export type FactoryGoal = {
  productId: ProductId,
  qty: number,
  type: "eq" | "lt" | "gt",
  dir: "input" | "output"
};

const debugLog = true;
const debug = (...args: any[]) => {
  if (debugLog)
    console.debug(...args);
}

export const buildLpp = (nodeConnections: NodeConnections, openConnections: OpenConnections, goals: FactoryGoal[]) => {
  // To build a constrain for an item we need to know all the usages that are linked together. 
  // For simple a->b paths that is a - b = 0
  // For one to many paths a->[b,c] that is a - b - c = 0
  // For many to many we need to walk the tree, finding connections on either end and adding them to the constraint.

  // Every constraint needs to know what to add and subtract, what item it's for and which nodes they came from
  // The constraint "label" in LPP will be the item (+ a uniq), while the nodes will be the variables (the recipe / building)
  type Constraint = {
    id: string,
    productId: ProductId,
    edges: Set<string>,
    terms: ({
      nodeId?: string,
      id: string,
      term: string
    })[],
  };
  const constraints: Map<string, Constraint> = new Map();

  // Which edges ends (vertices) have already appeared in constraints (via walking)
  const vertexInConstraints: Record<string, string> = {};

  // Get an LPP appropriate label for a node ID. They can't be long or contain some chars
  // They need a consistent label among all terms though so it needs storing somewhere
  const nodeIdToLabels = {} as Record<string, string>;
  let nodeLabelInc = 0;
  const getNodeLabel = (node: string) => (nodeIdToLabels[node] ||= "n_" + nodeLabelInc++, nodeIdToLabels[node]);

  const walkConnections = (nodeId: string, productId: ProductId, isInput: boolean, constraintId: string): {
    terms: Constraint["terms"],
    edges: string[],
  } => {
    const response: ReturnType<typeof walkConnections> = { terms: [], edges: [] };
    const ioString = isInput ? "inputs" : "outputs";
    const connections = nodeConnections[nodeId][ioString][productId];

    const vertextId = `${nodeId}/${ioString}/${productId}`;

    if (vertexInConstraints[vertextId] !== undefined) return response;
    vertexInConstraints[vertextId] = constraintId;

    const recipeQty = nodeConnections[nodeId].recipe[ioString].find(p => productId == p.id)?.quantity
    if (!recipeQty) {
      console.error('Could not find recipe quantity for', productId, 'as', ioString, 'on', nodeId);
      return response;
    }

    response.terms.push({
      id: getNodeLabel(nodeId),
      nodeId: nodeId,
      term: (isInput ? "-" : "+") + recipeQty
    });

    connections?.forEach(conn => {
      if (conn.edgeId)
        response.edges.push(conn.edgeId);
      // Get all the connections on the otherside of this edge
      // If we're processing an input, we're getting all their outputs, and vice versa.
      const nextConnection = walkConnections(conn.nodeId, productId, !isInput, constraintId);
      response.terms.push(...nextConnection.terms);
      response.edges.push(...nextConnection.edges);
    })

    return response;
  }

  const itemConstraints: {
    [k in ProductId]?: string
  } = {};

  const openConstraintSinks: string[] = [];
  const closedConstraintSinks: string[] = [];

  /**
   * Open items in the graph need a meta constraint that binds all their inputs / outputs into one final variable.
   * This is build over time and stored in itemConstraints for reference later
   */
  const addItemConstraint = (productId: ProductId, isInput: boolean, parentConstraintId: string) => {
    const ioString = isInput ? "input" : "output";
    const itemConstraintId = productId + "_" + ioString + "_sink";

    if (!constraints.has(itemConstraintId)) {
      itemConstraints[productId] = itemConstraintId;
      constraints.set(itemConstraintId, {
        terms: [],
        id: itemConstraintId,
        edges: new Set<string>(), // These item "meta" constraints should never have edges, by definition.
        productId: productId
      })
      constraints.get(itemConstraintId)?.terms.push({
        id: itemConstraintId,
        term: "-"
      });
      debug('Added new item constraint for', productId, constraints.get(itemConstraintId))
      // If this product isn't a goal, it's free to vary 
      if (goals.findIndex(g => g.productId == productId) == -1)
        openConstraintSinks.push(itemConstraintId);
    }

    constraints.get(itemConstraintId)?.terms.push({
      id: parentConstraintId + "_sink",
      term: isInput ? "-" : "+"
    })
    openConstraintSinks.push(parentConstraintId + "_sink");
  }

  const newConstraint = (nodeId: string, productId: ProductId, isInput: boolean) => {
    const constraintId = `c${constraintIdInc++}`;

    const { terms, edges } = walkConnections(nodeId, productId, isInput, constraintId);
    if (terms.length) {
      // These terms are opposite so the sink can balance out the ins/outs of this constraint    
      terms.push({
        id: constraintId + "_sink",
        term: isInput ? "+" : "-"
      });

      constraints.set(constraintId, {
        id: constraintId,
        productId,
        edges: new Set(edges),
        terms
      });

      // If it's an open connection (nothing attached), 
      // it needs a meta constraint adding, for tracking across multiple nodes
      // if not, it needs bounding to 0 until we WANT it to be free
      const ioString = isInput ? "inputs" : "outputs";
      const connections = nodeConnections[nodeId]?.[ioString][productId];
      debug('Checking', nodeId, 'for', productId, 'as', ioString, nodeConnections[nodeId][ioString][productId]);

      if (connections && connections.length == 0)
        addItemConstraint(productId, isInput, constraintId)
      else
        closedConstraintSinks.push(constraintId);
    }
    debug("Constraint", constraintId, constraints.get(constraintId));
  }

  // Loop all the inputs and outputs found in nodeConnections 
  let constraintIdInc = 0;
  for (const nodeId of Object.keys(nodeConnections)) {
    for (const productId of Object.keys(nodeConnections[nodeId].inputs) as ProductId[]) {
      newConstraint(nodeId, productId, true);
    }

    for (const productId of Object.keys(nodeConnections[nodeId].outputs) as ProductId[]) {
      newConstraint(nodeId, productId, false);
    }
  }

  const objective = getKeysTyped(openConnections.inputs).map(i => itemConstraints[i]).join('+')
  let constraintsList = '';
  for (const con of constraints.values()) {
    constraintsList += `
      ${con.id}: ${con.terms.map(t => `${t.term} ${t.id}`).join(' ')} = 0`;
  };

  let boundsList = openConstraintSinks.map(c => `${c} free`).join('\n');

  // let boundsList = getKeysTyped(itemConstraints).map(id => {
  //   if (itemConstraints[id] === undefined) return;
  //   const constraint = constraints.get(itemConstraints[id]);
  //   return constraint?.terms.map(t => {
  //     return `  ${t.id} free`
  //   }).join('\n')
  // }).join('\n');

  boundsList += "\n" + closedConstraintSinks.map(b => `${b}_sink = 0`).join('\n');

  const missedGoals: string[] = [];
  boundsList += "\n" + goals.map(g => {
    if (itemConstraints[g.productId] === undefined) {
      missedGoals.push(g.productId);
      return
    }
    return `${itemConstraints[g.productId]} ${g.type == "lt" ? "<=" : g.type == "gt" ? ">=" : "="} ${g.qty}`
  }).join("\n");

  let lpp = `
max
  obj: ${objective}
subject to 
  ${constraintsList}
Bounds 
  ${boundsList}
end`;

  return { constraints, lpp, nodeIdToLabels, closedConstraintSinks, missedGoals };
}

function getKeysTyped<T extends {}>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof typeof obj)[];
}
