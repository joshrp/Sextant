/**
 * Calculates viewport bounds in flow coordinates from React Flow viewport state.
 * Simple inline helper - no separate hook needed.
 */

import type { ViewportBounds } from "./nodePositioning";

/**
 * Converts React Flow viewport state to flow coordinate bounds.
 * @param viewport - Current viewport transformation (pan/zoom)
 * @param containerWidth - Width of the React Flow container in screen pixels
 * @param containerHeight - Height of the React Flow container in screen pixels
 * @returns Bounds in flow coordinates that represent the visible viewport
 */
export function getViewportBounds(
  viewport: { x: number; y: number; zoom: number },
  containerWidth: number,
  containerHeight: number
): ViewportBounds {
  return {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    width: containerWidth / viewport.zoom,
    height: containerHeight / viewport.zoom,
  };
}
