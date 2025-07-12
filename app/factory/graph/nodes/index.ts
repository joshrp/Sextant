import type { NodeTypes } from "@xyflow/react";
import RecipeNode, { type RecipeNode as RecipeNodeType} from "../RecipeNode";

export const initialNodes = [
  { 
    id: "lo-press_steam_condensation", 
    type: "recipe-node", 
    position: { x: -250, y: -300 }, 
    data: { recipeId: "lo-press_steam_condensation" } 
  },
  {
    id: "acid_mixing_1", 
    type: "recipe-node",
    position: { x: 50, y: 0 },
    data: { recipeId: "acid_mixing" },
  },
  { 
    id: "exhaust_filtering_1",  
    type: "recipe-node", 
    position: { x: -300, y: 0 }, 
    data: { recipeId: "exhaust_filtering" } 
  },
  {
    id: "turbinehighpress", 
    type: "recipe-node",
    position: { x: -550, y: -350 },
    data: { recipeId: "turbinehighpress" },
  },
] satisfies RecipeNodeType[];

export const nodeTypes = {
  "recipe-node": RecipeNode, 
} satisfies NodeTypes;

// Append the types of you custom edges to the BuiltInNode type
export type CustomNodeType = RecipeNodeType;
