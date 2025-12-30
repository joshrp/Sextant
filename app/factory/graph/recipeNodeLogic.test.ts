/**
 * Unit tests for recipeNodeLogic pure functions
 */
import { describe, expect, it } from 'vitest';
import { getQuantityDisplay } from './recipeNodeLogic';

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

});
