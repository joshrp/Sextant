/**
 * Generate a valid factory ID from a factory name.
 * Used for both ZoneProvider and PlannerProvider to ensure consistent ID generation.
 */
export function factoryIdFromName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * Generate a valid zone ID from a zone name.
 * Used for consistent zone ID generation across the app.
 * Strips all non-URL-safe characters.
 */
export function zoneIdFromName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
