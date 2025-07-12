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
const productData = loadProductData();

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


export const rebuildContraints = (nodes: CustomNodeType[], edges: CustomEdgeType[]) => {
  console.log("rebuildContraints", nodes, edges);
  // TODO:: Graph walking to find seperate graphs. Not supported for now.

  let nodesById: Record<string, CustomNodeType> = {};

  const nodeRecipe = {} as Record<string, Recipe>;

  /**
   * 
   * @param nodeId Node to fetch recipe from
   * @param itemId Which product
   * @param direction from the "inputs" or "outputs"
   * @returns 
   */
  const getRecipeQty = (nodeId: string, itemId: ProductId, direction: "inputs" | "outputs"): number | undefined => {
    return nodeRecipe[nodeId][direction].find(x => x.id == itemId)?.quantity;
  }

  type NodeConnections = {
    inputs: {
      [k in ProductId]?: [
        string, string
      ][]
    },
    outputs: {
      [k in ProductId]?: [
        string, string
      ][]
    }
  };
  /** Hold a list of nodes this node connects to via edges
      ```
      nodeId: {
        inputs: {
          water: [[
            sourceNodeId, edgeId
          ]]
        },
        outputs: {
          steam: [[
            targetNodeId, edgeId
          ]]
            
          }
        }
      }
        ```
     */
  const nodeConnections = {} as Record<string, NodeConnections>;
  const nodeOrder = {} as Record<string, number>;
  nodes.forEach((node, index) => {
    nodesById[node.id] = node;
    nodeOrder[node.id] = index;
    nodeRecipe[node.id] = recipeData[node.data.recipeId];
    const inputs: NodeConnections['inputs'] = {};
    const outputs: NodeConnections['outputs'] = {};

    nodeConnections[node.id] = {
      inputs: nodeRecipe[node.id].inputs.reduce((acc, curr) => (acc[curr.id] = [], acc), inputs),
      outputs: nodeRecipe[node.id].outputs.reduce((acc, curr) => (acc[curr.id] = [], acc), outputs)
    };
  });

  // Index all the edge connections by Node ID, listing which nodes they connect to for each of their products
  const edgesById: Record<string, CustomEdgeType> = {}
  edges.forEach(edge => {
    edgesById[edge.id] = edge;
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
    (nodeConnections[edge.target].inputs[productId] ||= []).push([edge.source, edge.id]);
    (nodeConnections[edge.source].outputs[productId] ||= []).push([edge.target, edge.id]);
  });

  const goals: {
    [k in ProductId]?: {
      qty: number
    }
  } = {
    "acid": {
      qty: 48
    }
  };


  // To build a constrain for an item we need to know all the usages that are linked together. 
  // For simple a->b paths that is a - b = 0
  // For one to many paths a->[b,c] that is a - b - c = 0
  // For many to many we need to walk the tree, finding connections on either end and adding them to the constraint.

  // Every constraint needs to know what to add and subtract, what item it's for and which nodes they came from
  // The constraint "label" in LPP will be the item (+ a uniq), while the nodes will be the variables (the recipe / building)
  type Constraint = {
    id: string,
    productId: ProductId,
    terms: {
      nodeId: string,
      id: string,
      term: string
    }[],
  };
  const constraints: Constraint[] = [];

  let openOutputs = [] as ProductId[];
  let openInputs = [] as ProductId[];

  // Which edges ends (vertices) have already appeared in constraints (via walking)
  const vertexInConstraints: Record<string, string> = {};

  const walkConnections = (connections: [string, string][], nodeId: string, productId: ProductId, isInput: boolean, constraintId: string): Constraint["terms"] => {
    const ioString = isInput ? "inputs" : "outputs";
    const vertextId = `${nodeId}/${ioString}/${productId}`;
    const terms: Constraint["terms"] = [];
    if (vertexInConstraints[vertextId] !== undefined) {
      console.log("Vertex", vertextId, "already present in constraint", vertexInConstraints[vertextId]);
    } else {
      vertexInConstraints[vertextId] = constraintId;
      const goal = goals[productId];

      let term = '';
      const recipeQty = getRecipeQty(nodeId, productId, ioString);
      if (!recipeQty) {
        console.error('Could not find recipe quantity for', productId,'on',nodeId);        
      } else {
        // Build up the term to add. This could be a single product or part of a long chain
        // Single dangling items could be input or output, or goals, all need different handling
        let negate = isInput;
        let prefix = '';
        if (goal || !connections?.length) {
          prefix = productId;
          negate = true;
          
          if (isInput)
            openInputs.push(productId);
          else
            openOutputs.push(productId);
        }

        term = prefix + (negate ? "-" : "+") + recipeQty;
      }
      
      if (term)
        terms.push({
          id: `n${nodeOrder[nodeId]}`,
          nodeId: nodeId,
          term
        });

      connections.forEach(conn => {
        // Get all the connections on the otherside of this edge
        // If we're processing an input, we're getting all their outputs, and vice versa.
        const otherSideId = conn[0];
        const otherSideConnections = nodeConnections[otherSideId][isInput ? "outputs" : "inputs"][productId];
        terms.push(...walkConnections(otherSideConnections || [], otherSideId, productId, !isInput, constraintId));
      })
    }

    return terms;
  }

  let constraintIdInc = 0;
  for (const nodeId of Object.keys(nodeConnections)) {
    for (const productId of Object.keys(nodeConnections[nodeId].inputs) as ProductId[]) {
      const sources = nodeConnections[nodeId].inputs[productId];
      const constraintId = `c${constraintIdInc++}`;
      console.log("New Constraint:", constraintId,"for", productId, "as input of", nodeId);
      const terms = walkConnections(sources || [], nodeId, productId, true, constraintId);
      if (terms.length)
        constraints.push({
          id: constraintId,
          productId,
          terms
        });
      console.log("Done constraint", constraintId, constraints[constraints.length -1]);
    }

    for (const productId of Object.keys(nodeConnections[nodeId].outputs) as ProductId[]) {
      const targets = nodeConnections[nodeId].outputs[productId];
      const constraintId = `c${constraintIdInc++}`;
      console.log("New Constraint:", constraintId,"for", productId, "as output of", nodeId);
      const terms = walkConnections(targets || [], nodeId, productId, false, constraintId);
      if (terms.length)
        constraints.push({
          id: constraintId,
          productId,
          terms
        });
      console.log("Done constraint", constraintId, constraints[constraints.length -1]);
    }
  }

  let lpp = `
minimize
  obj: ${openInputs.join('+')}
subject to
    ` + constraints.map(con => `
      \\${con.id}: ${con.productId}
      ${con.id}: ${con.terms.map(t => `${t.term} ${t.id}`).join(' ')} = 0
    `).join('') + `
${Object.keys(nodeOrder).map(n => `
      \\n${nodeOrder[n]}: ${n}`).join('\n')}
Bounds ${openInputs.map(o => `
  0 <= ${o}`).join('')}
  ${Object.keys(goals).map(g => `${g} = ${goals[g as ProductId]?.qty}`).join("\n")}
end`;
  console.log('LPP found: ', lpp)

  return { constraints, openOutputs, openInputs, lpp };
}
