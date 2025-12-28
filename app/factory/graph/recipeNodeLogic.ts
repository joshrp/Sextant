/**
 * Pure logic functions for RecipeNode component
 * Extracted for testability
 */
import { formatNumber } from '~/uiUtils';
import type { RecipeId } from './loadJsonData';

// RecipeNodeData type - defined here to avoid circular dependency
export type RecipeNodeData = {
  solution?: {
    solved: true,
    // Mult for the recipe
    runCount: number,
  } | {
    solved: false
  },
  recipeId: RecipeId; // Unique identifier for the recipe
  ltr?: boolean; // Left to right layout
};

/**
 * Calculates the display value for a product quantity
 */
export function getQuantityDisplay(quantity: number, runCount: number, unit: string): string {
  const amount = quantity * runCount;
  return formatNumber(amount, unit);
}

/**
 * Calculates the run count from solution data
 */
export function getRunCount(data: RecipeNodeData): number {
  return data.solution?.solved ? data.solution.runCount : 1;
}
