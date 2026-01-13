import type { GraphCoreData, GraphImportData } from "~/factory/store";

/**
 * Factory data for export selection
 */
export interface ExportableFactory {
  id: string;
  zoneId: string;
  zoneName: string;
  zoneIcon?: string;
  name: string;
  icon?: string;
  nodeCount: number;
  edgeCount: number;
  goalCount: number;
  /** The actual factory data for export */
  data: GraphCoreData;
}

/**
 * Zone with its factories for display
 */
export interface ExportableZone {
  id: string;
  name: string;
  icon?: string;
  factories: ExportableFactory[];
}

/**
 * Bulk import configuration for a single factory
 */
export interface BulkImportItem {
  data: GraphImportData;
  /** Target zone ID - empty string if creating new zone */
  targetZoneId: string;
  /** New zone name if creating a new zone */
  newZoneName?: string;
}
