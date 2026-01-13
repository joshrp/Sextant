import { useCallback, useEffect, useState } from 'react';
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

import { SelectorDialog } from './Dialog';
import { decompressBulk, type BulkImportData } from '~/factory/importexport/importexport';
import type { GraphImportData } from '~/factory/store';

/**
 * Import configuration for a single factory
 */
export interface FactoryImportConfig {
  /** Original index in the import data */
  index: number;
  /** Whether to import this factory */
  selected: boolean;
  /** Factory name (can be edited) */
  name: string;
  /** Original zone name from import */
  originalZoneName: string;
  /** Target zone name (can be edited for new zones) */
  targetZoneName: string;
  /** Whether to create a new zone for this factory */
  createNewZone: boolean;
  /** Factory data */
  data: GraphImportData;
  /** Name collision warning */
  nameCollision?: string;
}

/**
 * Zone import configuration
 */
export interface ZoneImportConfig {
  /** Original zone name from import */
  originalName: string;
  /** Target zone name (can be edited) */
  targetName: string;
  /** Whether to create a new zone */
  createNew: boolean;
  /** Whether the zone is expanded in UI */
  expanded: boolean;
  /** Factory indices belonging to this zone */
  factoryIndices: number[];
}

interface BulkImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Existing zone names to check for collisions */
  existingZoneNames: string[];
  /** Existing zone IDs for mapping */
  existingZones: Array<{ id: string; name: string }>;
  /** Callback when import is confirmed */
  onImport: (
    factories: Array<{
      data: GraphImportData;
      targetZoneId: string;
      newZoneName?: string;
    }>
  ) => Promise<void>;
}

export default function BulkImportDialog({
  isOpen,
  onClose,
  existingZoneNames,
  existingZones,
  onImport,
}: BulkImportDialogProps) {
  const [importString, setImportString] = useState('');
  const [importData, setImportData] = useState<BulkImportData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Factory configurations
  const [factoryConfigs, setFactoryConfigs] = useState<FactoryImportConfig[]>([]);
  
  // Zone configurations (for multi-zone imports)
  const [zoneConfigs, setZoneConfigs] = useState<ZoneImportConfig[]>([]);

  // Single zone mode: target zone selection
  const [singleZoneTarget, setSingleZoneTarget] = useState<string>('');
  const [newZoneName, setNewZoneName] = useState<string>('');
  const [createNewZone, setCreateNewZone] = useState(false);

  // Parse import string
  useEffect(() => {
    if (importString.length < 10) {
      setImportData(null);
      setParseError(null);
      return;
    }

    decompressBulk(importString)
      .then(data => {
        setImportData(data);
        setParseError(null);

        // Initialize factory configs
        const configs: FactoryImportConfig[] = data.factories.map((f, i) => ({
          index: i,
          selected: true,
          name: f.name,
          originalZoneName: f.zoneName || '',
          targetZoneName: f.zoneName || '',
          createNewZone: false,
          data: f,
        }));
        setFactoryConfigs(configs);

        // Initialize zone configs
        const zoneConfigsArray: ZoneImportConfig[] = [];
        data.zoneGroups.forEach((indices, zoneName) => {
          zoneConfigsArray.push({
            originalName: zoneName,
            targetName: zoneName,
            createNew: !existingZoneNames.includes(zoneName),
            expanded: true,
            factoryIndices: indices,
          });
        });
        setZoneConfigs(zoneConfigsArray);

        // Set default single zone target
        if (data.isSingleZone) {
          const firstZoneName = data.factories[0]?.zoneName || '';
          if (existingZones.some(z => z.name === firstZoneName)) {
            setSingleZoneTarget(firstZoneName);
            setCreateNewZone(false);
          } else if (existingZones.length > 0) {
            setSingleZoneTarget(existingZones[0].name);
            setCreateNewZone(false);
          } else {
            setCreateNewZone(true);
            setNewZoneName(firstZoneName || 'Imported Zone');
          }
        }
      })
      .catch(err => {
        console.error('Import parse error:', err);
        setParseError(err.message || 'Failed to parse import data');
        setImportData(null);
      });
  }, [importString, existingZoneNames, existingZones]);

  // Validate factory names for collisions
  useEffect(() => {
    if (!importData) return;

    // Check for name collisions within import
    const updatedConfigs = factoryConfigs.map(config => {
      const duplicates = factoryConfigs.filter(
        c => c.selected && c.index !== config.index && c.name === config.name
      );
      
      if (duplicates.length > 0) {
        return { ...config, nameCollision: 'Duplicate name in import' };
      }
      return { ...config, nameCollision: undefined };
    });

    // Only update if there are changes
    const hasChanges = updatedConfigs.some(
      (c, i) => c.nameCollision !== factoryConfigs[i].nameCollision
    );
    if (hasChanges) {
      setFactoryConfigs(updatedConfigs);
    }
  }, [factoryConfigs, importData]);

  // Toggle factory selection
  const toggleFactorySelection = useCallback((index: number) => {
    setFactoryConfigs(prev =>
      prev.map(c => (c.index === index ? { ...c, selected: !c.selected } : c))
    );
  }, []);

  // Update factory name
  const updateFactoryName = useCallback((index: number, name: string) => {
    setFactoryConfigs(prev =>
      prev.map(c => (c.index === index ? { ...c, name } : c))
    );
  }, []);

  // Toggle zone selection (selects/deselects all factories in zone)
  const toggleZoneSelection = useCallback((zoneName: string) => {
    const zoneConfig = zoneConfigs.find(z => z.originalName === zoneName);
    if (!zoneConfig) return;

    const allSelected = zoneConfig.factoryIndices.every(
      i => factoryConfigs[i]?.selected
    );

    setFactoryConfigs(prev =>
      prev.map(c =>
        zoneConfig.factoryIndices.includes(c.index)
          ? { ...c, selected: !allSelected }
          : c
      )
    );
  }, [zoneConfigs, factoryConfigs]);

  // Update zone target name
  const updateZoneTargetName = useCallback((originalName: string, targetName: string) => {
    setZoneConfigs(prev =>
      prev.map(z =>
        z.originalName === originalName ? { ...z, targetName } : z
      )
    );
  }, []);

  // Check if there are any validation errors
  const hasValidationErrors = factoryConfigs.some(
    c => c.selected && c.nameCollision
  );

  // Check for zone name collisions (only when creating new zones in multi-zone mode)
  const zoneNameCollisions = !importData?.isSingleZone
    ? zoneConfigs.filter(
        z => z.createNew && existingZoneNames.includes(z.targetName)
      )
    : [];

  // Handle import
  const handleImport = useCallback(async () => {
    if (!importData) return;

    setIsImporting(true);

    try {
      const selectedFactories = factoryConfigs.filter(c => c.selected);
      
      if (importData.isSingleZone) {
        // Single zone mode
        const targetZoneId = createNewZone
          ? '' // Will be created
          : existingZones.find(z => z.name === singleZoneTarget)?.id || '';

        await onImport(
          selectedFactories.map(c => ({
            data: { ...c.data, name: c.name },
            targetZoneId,
            newZoneName: createNewZone ? newZoneName : undefined,
          }))
        );
      } else {
        // Multi-zone mode
        const importItems: Array<{
          data: GraphImportData;
          targetZoneId: string;
          newZoneName?: string;
        }> = [];

        for (const config of selectedFactories) {
          const zoneConfig = zoneConfigs.find(
            z => z.originalName === config.originalZoneName
          );
          
          if (!zoneConfig) continue;

          const existingZone = existingZones.find(
            z => z.name === zoneConfig.targetName
          );

          importItems.push({
            data: { ...config.data, name: config.name },
            targetZoneId: existingZone?.id || '',
            newZoneName: zoneConfig.createNew ? zoneConfig.targetName : undefined,
          });
        }

        await onImport(importItems);
      }

      onClose();
    } catch (err) {
      console.error('Import failed:', err);
      setParseError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  }, [
    importData,
    factoryConfigs,
    zoneConfigs,
    createNewZone,
    newZoneName,
    singleZoneTarget,
    existingZones,
    onImport,
    onClose,
  ]);

  const selectedCount = factoryConfigs.filter(c => c.selected).length;
  const canImport =
    importData &&
    selectedCount > 0 &&
    !hasValidationErrors &&
    zoneNameCollisions.length === 0 &&
    (importData.isSingleZone ? (createNewZone ? newZoneName.trim() : singleZoneTarget) : true);

  return (
    <SelectorDialog
      isOpen={isOpen}
      setIsOpen={onClose}
      title="Bulk Import"
      widthClassName="w-[800px] max-w-[95vw]"
      heightClassName="h-[85vh]"
    >
      <div className="flex flex-col h-full gap-4">
        {/* Import string input */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Paste export string:
          </label>
          <textarea
            value={importString}
            onChange={e => setImportString(e.target.value)}
            placeholder="Paste your factory export string here..."
            className="w-full h-24 p-2 bg-gray-700 rounded text-xs font-mono resize-none"
          />
        </div>

        {/* Error message */}
        {parseError && (
          <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200">
            <ExclamationTriangleIcon className="w-5 h-5 inline mr-2" />
            {parseError}
          </div>
        )}

        {/* Import data parsed successfully */}
        {importData && (
          <>
            {/* Summary */}
            <div className="text-sm text-gray-400">
              Found {importData.factories.length}{' '}
              {importData.factories.length === 1 ? 'factory' : 'factories'} in{' '}
              {importData.zoneGroups.size}{' '}
              {importData.zoneGroups.size === 1 ? 'zone' : 'zones'}
            </div>

            {/* Single zone mode: zone selection */}
            {importData.isSingleZone && (
              <div className="p-4 bg-gray-700 rounded">
                <div className="font-medium mb-3">Import destination:</div>
                
                <div className="flex flex-col gap-2">
                  {/* Existing zone selection */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!createNewZone}
                      onChange={() => setCreateNewZone(false)}
                      className="w-4 h-4"
                    />
                    <span>Add to existing zone:</span>
                    <select
                      value={singleZoneTarget}
                      onChange={e => setSingleZoneTarget(e.target.value)}
                      disabled={createNewZone}
                      className="flex-1 p-2 bg-gray-600 rounded disabled:opacity-50"
                    >
                      {existingZones.map(z => (
                        <option key={z.id} value={z.name}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Create new zone */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={createNewZone}
                      onChange={() => setCreateNewZone(true)}
                      className="w-4 h-4"
                    />
                    <span>Create new zone:</span>
                    <input
                      type="text"
                      value={newZoneName}
                      onChange={e => setNewZoneName(e.target.value)}
                      disabled={!createNewZone}
                      placeholder="New zone name"
                      className="flex-1 p-2 bg-gray-600 rounded disabled:opacity-50"
                    />
                  </label>

                  {/* Zone name collision warning */}
                  {createNewZone && existingZoneNames.includes(newZoneName) && (
                    <div className="text-sm text-yellow-400">
                      <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />
                      A zone with this name already exists
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Factory selection list */}
            <div className="flex-1 overflow-y-auto border border-gray-700 rounded p-2">
              {importData.isSingleZone ? (
                // Single zone: show flat list of factories
                <div className="space-y-2">
                  {factoryConfigs.map(config => (
                    <FactoryImportRow
                      key={config.index}
                      config={config}
                      onToggle={() => toggleFactorySelection(config.index)}
                      onNameChange={name => updateFactoryName(config.index, name)}
                    />
                  ))}
                </div>
              ) : (
                // Multi-zone: show zones with factories
                zoneConfigs.map(zoneConfig => {
                  const zoneFactories = factoryConfigs.filter(c =>
                    zoneConfig.factoryIndices.includes(c.index)
                  );
                  const allSelected = zoneFactories.every(f => f.selected);
                  const someSelected = zoneFactories.some(f => f.selected);

                  return (
                    <div key={zoneConfig.originalName} className="mb-4">
                      {/* Zone header */}
                      <div className="flex items-center gap-3 p-2 bg-gray-700 rounded">
                        <div
                          className={`w-5 h-5 border-2 rounded flex items-center justify-center cursor-pointer ${
                            allSelected
                              ? 'bg-blue-500 border-blue-500'
                              : someSelected
                              ? 'bg-blue-500/50 border-blue-500'
                              : 'border-gray-400'
                          }`}
                          onClick={() => toggleZoneSelection(zoneConfig.originalName)}
                        >
                          {(allSelected || someSelected) && (
                            <CheckIcon className="w-4 h-4 text-white" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="text-sm text-gray-400">Zone:</div>
                          <input
                            type="text"
                            value={zoneConfig.targetName}
                            onChange={e =>
                              updateZoneTargetName(
                                zoneConfig.originalName,
                                e.target.value
                              )
                            }
                            className="w-full p-1 bg-gray-600 rounded text-sm"
                          />
                        </div>

                        <div className="text-sm text-gray-400">
                          {zoneConfig.createNew ? (
                            <span className="text-blue-400">(New)</span>
                          ) : (
                            <span className="text-green-400">(Existing)</span>
                          )}
                        </div>
                      </div>

                      {/* Zone name collision warning */}
                      {zoneConfig.createNew &&
                        existingZoneNames.includes(zoneConfig.targetName) && (
                          <div className="ml-8 mt-1 text-sm text-yellow-400">
                            <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />
                            A zone with this name already exists. Rename to continue.
                          </div>
                        )}

                      {/* Factories in zone */}
                      <div className="ml-8 mt-2 space-y-1">
                        {zoneFactories.map(config => (
                          <FactoryImportRow
                            key={config.index}
                            config={config}
                            onToggle={() => toggleFactorySelection(config.index)}
                            onNameChange={name => updateFactoryName(config.index, name)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Import button */}
            <button
              onClick={handleImport}
              disabled={!canImport || isImporting}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded cursor-pointer font-medium"
            >
              {isImporting
                ? 'Importing...'
                : `Import ${selectedCount} ${selectedCount === 1 ? 'Factory' : 'Factories'}`}
            </button>
          </>
        )}
      </div>
    </SelectorDialog>
  );
}

/**
 * Row component for factory import configuration
 */
function FactoryImportRow({
  config,
  onToggle,
  onNameChange,
}: {
  config: FactoryImportConfig;
  onToggle: () => void;
  onNameChange: (name: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2 bg-gray-800 rounded">
      <div
        className={`w-5 h-5 border-2 rounded flex items-center justify-center cursor-pointer ${
          config.selected ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
        }`}
        onClick={onToggle}
      >
        {config.selected && <CheckIcon className="w-4 h-4 text-white" />}
      </div>

      {config.data.icon && (
        <img src={config.data.icon} alt="" className="w-6 h-6" />
      )}

      <input
        type="text"
        value={config.name}
        onChange={e => onNameChange(e.target.value)}
        className={`flex-1 p-1 bg-gray-700 rounded ${
          config.nameCollision ? 'border border-red-500' : ''
        }`}
      />

      <span className="text-xs text-gray-500">
        {config.data.nodes.length} nodes
      </span>

      {config.nameCollision && (
        <span className="text-xs text-red-400">{config.nameCollision}</span>
      )}
    </div>
  );
}
