/**
 * Pure utility functions for smart node placement on the factory graph.
 * No React or React Flow imports - all logic is pure and testable.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportBounds {
  x: number;      // top-left in flow coordinates
  y: number;
  width: number;
  height: number;
}

// Constants for node size estimation
const BASE_HEIGHT = 100;
const HEIGHT_PER_HANDLE = 40;
const DEFAULT_WIDTH = 220;
const DEFAULT_PADDING = 20;

/**
 * Sentinel position used to indicate a node needs smart positioning.
 * Sidebar and controls use this to signal that Graph should calculate the position.
 */
export const SENTINEL_POSITION = { x: 0, y: 0 } as const;

/**
 * Checks if a position is the sentinel value indicating smart positioning is needed.
 */
export function isSentinelPosition(position: { x: number; y: number }): boolean {
  return position.x === SENTINEL_POSITION.x && position.y === SENTINEL_POSITION.y;
}

/**
 * Estimates node dimensions based on handle count and existing node widths.
 * @param handleCount - Max of input/output handle counts
 * @param existingNodeWidths - Array of measured widths from existing nodes
 */
export function estimateNodeSize(
  handleCount: number,
  existingNodeWidths?: number[]
): { width: number; height: number } {
  const height = BASE_HEIGHT + handleCount * HEIGHT_PER_HANDLE;
  
  let width = DEFAULT_WIDTH;
  if (existingNodeWidths && existingNodeWidths.length > 0) {
    // Use median width from existing nodes
    const sorted = [...existingNodeWidths].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    width = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
  
  return { width, height };
}

/**
 * Extracts Rect array from React Flow nodes.
 * Uses measured dimensions when available, falls back to estimated dimensions.
 */
export function getExistingNodeRects(
  nodes: Array<{ position: { x: number; y: number }; measured?: { width?: number; height?: number } }>
): Rect[] {
  return nodes.map(node => ({
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width ?? DEFAULT_WIDTH,
    height: node.measured?.height ?? BASE_HEIGHT,
  }));
}

/**
 * Extracts measured widths from nodes for size estimation.
 */
export function getExistingNodeWidths(
  nodes: Array<{ measured?: { width?: number } }>
): number[] {
  return nodes
    .filter(node => node.measured?.width)
    .map(node => node.measured!.width!);
}

/**
 * Checks if two rectangles overlap with optional padding.
 */
export function rectsOverlap(a: Rect, b: Rect, padding: number = DEFAULT_PADDING): boolean {
  return !(
    a.x + a.width + padding <= b.x ||
    b.x + b.width + padding <= a.x ||
    a.y + a.height + padding <= b.y ||
    b.y + b.height + padding <= a.y
  );
}

/**
 * Finds an available slot for a new node within the viewport.
 * Uses a spiral search pattern from the preferred origin.
 * Falls back to viewport center if no free slot is found.
 */
export function findAvailableSlot(
  existingRects: Rect[],
  candidateSize: { width: number; height: number },
  viewportBounds: ViewportBounds,
  preferredOrigin?: { x: number; y: number }
): { x: number; y: number } {
  const padding = DEFAULT_PADDING;
  const stepX = candidateSize.width + padding;
  const stepY = candidateSize.height + padding;
  
  // Default to viewport center minus half candidate size
  const centerX = viewportBounds.x + viewportBounds.width / 2 - candidateSize.width / 2;
  const centerY = viewportBounds.y + viewportBounds.height / 2 - candidateSize.height / 2;
  
  const origin = preferredOrigin ?? { x: centerX, y: centerY };
  
  // Check if a candidate position is valid (no overlap with existing rects)
  const isValidPosition = (x: number, y: number): boolean => {
    const candidate: Rect = { x, y, width: candidateSize.width, height: candidateSize.height };
    return !existingRects.some(rect => rectsOverlap(candidate, rect, padding));
  };
  
  // Check if position is within viewport bounds
  const isInViewport = (x: number, y: number): boolean => {
    return (
      x >= viewportBounds.x &&
      y >= viewportBounds.y &&
      x + candidateSize.width <= viewportBounds.x + viewportBounds.width &&
      y + candidateSize.height <= viewportBounds.y + viewportBounds.height
    );
  };
  
  // Try preferred origin first
  if (isValidPosition(origin.x, origin.y)) {
    return origin;
  }
  
  // Spiral search outward - limit to 10 rings to prevent pathological cases
  const maxRings = Math.min(
    10,
    Math.max(
      Math.ceil(viewportBounds.width / stepX),
      Math.ceil(viewportBounds.height / stepY)
    )
  );
  
  for (let ring = 1; ring <= maxRings; ring++) {
    // Try positions in a ring around the origin
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        // Only check positions on the edge of the ring
        if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
        
        const x = origin.x + dx * stepX;
        const y = origin.y + dy * stepY;
        
        if (isInViewport(x, y) && isValidPosition(x, y)) {
          return { x, y };
        }
      }
    }
  }
  
  // Fallback: return viewport center (allow overlap, better than off-screen)
  return { x: centerX, y: centerY };
}

/**
 * Determines if a new node should be flipped (ltr: false) based on connection context.
 * 
 * When dragging from an output handle to create a new node:
 * - The new node needs an input to connect back
 * - If new node is LEFT of source → flip (ltr: false) so input faces right
 * - If new node is RIGHT of source → keep (ltr: true) so input faces left toward source
 * 
 * When dragging from an input handle:
 * - The new node needs an output to connect back
 * - If new node is RIGHT of source → flip (ltr: false) so output faces left
 * - If new node is LEFT of source → keep (ltr: true) so output faces right toward source
 * 
 * @param sourceHandleType - Whether dragging from 'input' or 'output' handle
 * @param sourceNodePosition - Position of the source node
 * @param newNodePosition - Position where the new node will be placed
 * @param sourceLtr - The ltr value of the source node (affects handle positions)
 * @returns true if the new node should be flipped (ltr: false)
 */
export function shouldFlipNode(
  sourceHandleType: 'input' | 'output',
  sourceNodePosition: { x: number; y: number },
  newNodePosition: { x: number; y: number },
  sourceLtr: boolean = true
): boolean {
  const isNewNodeToLeft = newNodePosition.x < sourceNodePosition.x;
  
  // When source node is flipped, the handle positions are mirrored
  // so we need to invert our logic
  const effectiveSourceHandleType = sourceLtr 
    ? sourceHandleType 
    : (sourceHandleType === 'input' ? 'output' : 'input');
  
  // For output handles: flip if new node is to the left
  // For input handles: flip if new node is to the right (i.e., NOT to the left)
  return effectiveSourceHandleType === 'output' ? isNewNodeToLeft : !isNewNodeToLeft;
}
