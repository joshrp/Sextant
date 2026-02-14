import { describe, it, expect } from 'vitest';
import {
  estimateNodeSize,
  getExistingNodeRects,
  getExistingNodeWidths,
  rectsOverlap,
  findAvailableSlot,
  shouldFlipNode,
  type Rect,
  type ViewportBounds,
} from './nodePositioning';

describe('nodePositioning', () => {
  describe('estimateNodeSize', () => {
    it('returns base dimensions with 0 handles', () => {
      const result = estimateNodeSize(0);
      expect(result.height).toBe(100); // BASE_HEIGHT
      expect(result.width).toBe(220);  // DEFAULT_WIDTH
    });

    it('increases height by 40px per handle', () => {
      const result = estimateNodeSize(5);
      expect(result.height).toBe(100 + 5 * 40); // 300
      expect(result.width).toBe(220);
    });

    it('uses median width from existing nodes', () => {
      const result = estimateNodeSize(3, [200, 250, 300]);
      expect(result.width).toBe(250); // median of odd-length array
    });

    it('uses average of middle two for even-length array', () => {
      const result = estimateNodeSize(3, [200, 250, 300, 350]);
      expect(result.width).toBe(275); // (250 + 300) / 2
    });

    it('ignores empty existing widths array', () => {
      const result = estimateNodeSize(2, []);
      expect(result.width).toBe(220); // DEFAULT_WIDTH
    });
  });

  describe('getExistingNodeRects', () => {
    it('extracts rects from nodes with measured dimensions', () => {
      const nodes = [
        { position: { x: 0, y: 0 }, measured: { width: 200, height: 150 } },
        { position: { x: 300, y: 100 }, measured: { width: 220, height: 180 } },
      ];
      const rects = getExistingNodeRects(nodes);
      expect(rects).toHaveLength(2);
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 200, height: 150 });
      expect(rects[1]).toEqual({ x: 300, y: 100, width: 220, height: 180 });
    });

    it('uses default dimensions for nodes without measured dimensions', () => {
      const nodes = [
        { position: { x: 0, y: 0 }, measured: { width: 200, height: 150 } },
        { position: { x: 100, y: 100 } }, // no measured → defaults
        { position: { x: 200, y: 200 }, measured: {} }, // empty measured → defaults
        { position: { x: 300, y: 300 }, measured: { width: 200 } }, // missing height → default height
      ];
      const rects = getExistingNodeRects(nodes);
      expect(rects).toHaveLength(4);
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 200, height: 150 });
      // Unmeasured nodes get default width (220) and height (100)
      expect(rects[1]).toEqual({ x: 100, y: 100, width: 220, height: 100 });
      expect(rects[2]).toEqual({ x: 200, y: 200, width: 220, height: 100 });
      expect(rects[3]).toEqual({ x: 300, y: 300, width: 200, height: 100 });
    });
  });

  describe('getExistingNodeWidths', () => {
    it('extracts widths from nodes with measured width', () => {
      const nodes = [
        { measured: { width: 200 } },
        { measured: { width: 250 } },
        { measured: {} },
        {},
      ];
      const widths = getExistingNodeWidths(nodes);
      expect(widths).toEqual([200, 250]);
    });
  });

  describe('rectsOverlap', () => {
    it('returns true for overlapping rects', () => {
      const a: Rect = { x: 0, y: 0, width: 100, height: 100 };
      const b: Rect = { x: 50, y: 50, width: 100, height: 100 };
      expect(rectsOverlap(a, b, 0)).toBe(true);
    });

    it('returns true for adjacent rects with padding', () => {
      const a: Rect = { x: 0, y: 0, width: 100, height: 100 };
      const b: Rect = { x: 110, y: 0, width: 100, height: 100 }; // 10px gap
      expect(rectsOverlap(a, b, 20)).toBe(true); // 20px padding catches 10px gap
    });

    it('returns false for separated rects', () => {
      const a: Rect = { x: 0, y: 0, width: 100, height: 100 };
      const b: Rect = { x: 200, y: 200, width: 100, height: 100 };
      expect(rectsOverlap(a, b, 20)).toBe(false);
    });

    it('returns false for adjacent rects without enough padding', () => {
      const a: Rect = { x: 0, y: 0, width: 100, height: 100 };
      const b: Rect = { x: 150, y: 0, width: 100, height: 100 }; // 50px gap
      expect(rectsOverlap(a, b, 20)).toBe(false);
    });
  });

  describe('findAvailableSlot', () => {
    const viewport: ViewportBounds = { x: 0, y: 0, width: 1000, height: 800 };
    const size = { width: 200, height: 150 };

    it('returns preferred origin on empty graph', () => {
      const result = findAvailableSlot([], size, viewport, { x: 100, y: 100 });
      expect(result).toEqual({ x: 100, y: 100 });
    });

    it('returns viewport center when no origin specified and graph is empty', () => {
      const result = findAvailableSlot([], size, viewport);
      // Center: (1000/2 - 200/2, 800/2 - 150/2) = (400, 325)
      expect(result).toEqual({ x: 400, y: 325 });
    });

    it('returns adjacent slot when origin is blocked', () => {
      const existingRects: Rect[] = [
        { x: 100, y: 100, width: 200, height: 150 },
      ];
      const result = findAvailableSlot(existingRects, size, viewport, { x: 100, y: 100 });
      // Should find a slot that doesn't overlap with existing rect
      const candidate: Rect = { ...result, ...size };
      expect(rectsOverlap(candidate, existingRects[0], 20)).toBe(false);
      // New position should be offset from original by at least one step
      const stepped = result.x !== 100 || result.y !== 100;
      expect(stepped).toBe(true);
    });

    it('falls back to center in dense viewport', () => {
      // Fill viewport with rects so no slot is available
      const existingRects: Rect[] = [];
      for (let x = 0; x < 1000; x += 240) { // size.width + padding
        for (let y = 0; y < 800; y += 170) { // size.height + padding
          existingRects.push({ x, y, width: 200, height: 150 });
        }
      }
      const result = findAvailableSlot(existingRects, size, viewport);
      // Should return viewport center as fallback
      expect(result).toEqual({ x: 400, y: 325 });
    });
  });

  describe('shouldFlipNode', () => {
    const sourcePos = { x: 500, y: 300 };

    describe('with sourceLtr = true', () => {
      it('returns false when dragging from output to the right', () => {
        const newPos = { x: 700, y: 300 }; // to the right
        expect(shouldFlipNode('output', sourcePos, newPos, true)).toBe(false);
      });

      it('returns true when dragging from output to the left', () => {
        const newPos = { x: 200, y: 300 }; // to the left
        expect(shouldFlipNode('output', sourcePos, newPos, true)).toBe(true);
      });

      it('returns false when dragging from input to the left', () => {
        const newPos = { x: 200, y: 300 }; // to the left
        expect(shouldFlipNode('input', sourcePos, newPos, true)).toBe(false);
      });

      it('returns true when dragging from input to the right', () => {
        const newPos = { x: 700, y: 300 }; // to the right
        expect(shouldFlipNode('input', sourcePos, newPos, true)).toBe(true);
      });
    });

    describe('with sourceLtr = false (source node is flipped)', () => {
      // When source node is flipped, handles are mirrored:
      // - output is now on the LEFT
      // - input is now on the RIGHT
      // So the logic inverts

      it('returns true when dragging from output to the right (inverted)', () => {
        const newPos = { x: 700, y: 300 };
        expect(shouldFlipNode('output', sourcePos, newPos, false)).toBe(true);
      });

      it('returns false when dragging from output to the left (inverted)', () => {
        const newPos = { x: 200, y: 300 };
        expect(shouldFlipNode('output', sourcePos, newPos, false)).toBe(false);
      });

      it('returns true when dragging from input to the left (inverted)', () => {
        const newPos = { x: 200, y: 300 };
        expect(shouldFlipNode('input', sourcePos, newPos, false)).toBe(true);
      });

      it('returns false when dragging from input to the right (inverted)', () => {
        const newPos = { x: 700, y: 300 };
        expect(shouldFlipNode('input', sourcePos, newPos, false)).toBe(false);
      });
    });

    it('defaults sourceLtr to true if not provided', () => {
      const newPos = { x: 200, y: 300 };
      expect(shouldFlipNode('output', sourcePos, newPos)).toBe(true);
    });
  });
});
