/**
 * Unit tests for recipeNodeLogic pure functions
 */
import { describe, expect, it } from 'vitest';
import { getQuantityDisplay, getRunCount, type RecipeNodeData } from './recipeNodeLogic';
import type { RecipeId } from './loadJsonData';

describe('recipeNodeLogic', () => {
  describe('getQuantityDisplay', () => {
    it('calculates product quantity with run count', () => {
      const result = getQuantityDisplay(10, 2, 't/month');
      expect(result).toBe('20 t/month');
    });

    it('handles decimal run counts', () => {
      const result = getQuantityDisplay(10, 2.5, 't/month');
      expect(result).toBe('25 t/month');
    });

    it('handles zero quantity', () => {
      const result = getQuantityDisplay(0, 5, 'kW');
      expect(result).toBe('0 kW');
    });

    it('handles zero run count', () => {
      const result = getQuantityDisplay(10, 0, 't/month');
      expect(result).toBe('0 t/month');
    });
  });

  describe('getRunCount', () => {
    it('returns 1 when no solution exists', () => {
      const data: RecipeNodeData = {
        recipeId: 'TestRecipe' as RecipeId,
        ltr: true,
      };
      expect(getRunCount(data)).toBe(1);
    });

    it('returns 1 when solution is not solved', () => {
      const data: RecipeNodeData = {
        recipeId: 'TestRecipe' as RecipeId,
        ltr: true,
        solution: { solved: false },
      };
      expect(getRunCount(data)).toBe(1);
    });

    it('returns run count when solution is solved', () => {
      const data: RecipeNodeData = {
        recipeId: 'TestRecipe' as RecipeId,
        ltr: true,
        solution: {
          solved: true,
          runCount: 5.5,
        },
      };
      expect(getRunCount(data)).toBe(5.5);
    });
  });
});
