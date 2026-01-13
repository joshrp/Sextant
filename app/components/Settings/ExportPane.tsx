import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardIcon, FolderArrowDownIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

import usePlanner from '~/context/PlannerContext';
import { compressBulk, minifyBulk } from '~/factory/importexport/importexport';
import type { ExportableZone } from '~/types/bulkOperations';

export default function ExportPane() {
  const [exportableZones, setExportableZones] = useState<ExportableZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const planner = usePlanner();

  // Load exportable data on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await planner.getExportableData();
        if (!cancelled) {
          setExportableZones(data);
          setLoadError(null);
        }
      } catch (err) {
        console.error('Failed to load export data:', err);
        if (!cancelled) {
          setLoadError('Failed to load factory data for export');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [planner]);

  // Track selected factory IDs
  const [selectedFactoryIds, setSelectedFactoryIds] = useState<Set<string>>(new Set());
  const [exportString, setExportString] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Get all factories across all zones
  const allFactories = useMemo(() => {
    return exportableZones.flatMap(z => z.factories);
  }, [exportableZones]);

  // Check if a zone is fully selected
  const isZoneSelected = useCallback((zone: ExportableZone) => {
    return zone.factories.length > 0 && zone.factories.every(f => selectedFactoryIds.has(f.id));
  }, [selectedFactoryIds]);

  // Check if a zone is partially selected
  const isZonePartiallySelected = useCallback((zone: ExportableZone) => {
    const selectedCount = zone.factories.filter(f => selectedFactoryIds.has(f.id)).length;
    return selectedCount > 0 && selectedCount < zone.factories.length;
  }, [selectedFactoryIds]);

  // Toggle zone selection
  const toggleZoneSelection = useCallback((zone: ExportableZone) => {
    setSelectedFactoryIds(prev => {
      const next = new Set(prev);
      if (isZoneSelected(zone)) {
        zone.factories.forEach(f => next.delete(f.id));
      } else {
        zone.factories.forEach(f => next.add(f.id));
      }
      return next;
    });
  }, [isZoneSelected]);

  // Toggle individual factory selection
  const toggleFactorySelection = useCallback((factoryId: string) => {
    setSelectedFactoryIds(prev => {
      const next = new Set(prev);
      if (next.has(factoryId)) {
        next.delete(factoryId);
      } else {
        next.add(factoryId);
      }
      return next;
    });
  }, []);

  // Select all factories
  const selectAll = useCallback(() => {
    setSelectedFactoryIds(new Set(allFactories.map(f => f.id)));
  }, [allFactories]);

  // Deselect all factories
  const deselectAll = useCallback(() => {
    setSelectedFactoryIds(new Set());
  }, []);

  // Generate export string when selection changes
  useEffect(() => {
    if (selectedFactoryIds.size === 0) {
      setExportString('');
      return;
    }

    const selectedFactories = allFactories.filter(f => selectedFactoryIds.has(f.id));
    if (selectedFactories.length === 0) {
      setExportString('');
      return;
    }

    setIsExporting(true);

    const exportData = selectedFactories.map(f => ({
      state: f.data,
      zoneName: f.zoneName,
      icon: f.icon,
    }));

    const minified = minifyBulk(exportData);
    
    compressBulk(minified)
      .then(compressed => {
        setExportString(compressed);
        setIsExporting(false);
      })
      .catch(err => {
        console.error('Export compression failed:', err);
        setExportString('Error: ' + err.message);
        setIsExporting(false);
      });
  }, [selectedFactoryIds, allFactories]);

  // Copy to clipboard
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(exportString).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }, [exportString]);

  // Download as file
  const downloadFile = useCallback(() => {
    const selectedFactories = allFactories.filter(f => selectedFactoryIds.has(f.id));
    let filename = 'factory-export.txt';
    
    if (selectedFactories.length === 1) {
      filename = `${selectedFactories[0].name} Export.txt`;
    } else {
      const zoneNames = [...new Set(selectedFactories.map(f => f.zoneName))];
      if (zoneNames.length === 1) {
        filename = `${zoneNames[0]} Export.txt`;
      } else {
        filename = `Multi-Zone Export (${selectedFactories.length} factories).txt`;
      }
    }

    const blob = new Blob([exportString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportString, selectedFactoryIds, allFactories]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading factories...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
        {loadError}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Selection controls */}
      <div className="flex justify-between items-center px-2">
        <div className="text-sm text-gray-400">
          {selectedFactoryIds.size} of {allFactories.length} factories selected
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 rounded cursor-pointer"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded cursor-pointer"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Zone and factory selection */}
      <div className="flex-1 overflow-y-auto border border-gray-600 rounded min-h-[200px] max-h-[400px]">
        <div className="p-2 space-y-3">
          {exportableZones.map(zone => (
            <div key={zone.id} className="rounded border border-gray-600">
              {/* Zone header with checkbox */}
              <div
                className="flex items-center gap-2 p-2 bg-gray-700 rounded-t cursor-pointer hover:bg-gray-600"
                onClick={() => toggleZoneSelection(zone)}
              >
                <div className={`w-4 h-4 border-2 rounded flex items-center justify-center shrink-0 ${
                  isZoneSelected(zone) 
                    ? 'bg-blue-500 border-blue-500' 
                    : isZonePartiallySelected(zone)
                    ? 'bg-blue-500/50 border-blue-500'
                    : 'border-gray-500'
                }`}>
                  {(isZoneSelected(zone) || isZonePartiallySelected(zone)) && (
                    <CheckIcon className="w-3 h-3 text-white" />
                  )}
                </div>
                {zone.icon && <img src={zone.icon} alt="" className="w-5 h-5" />}
                <span className="font-medium">{zone.name}</span>
                <span className="text-xs text-gray-500 ml-auto">
                  {zone.factories.length} {zone.factories.length === 1 ? 'factory' : 'factories'}
                </span>
              </div>

              {/* Factories in zone */}
              <div className="p-2 space-y-1 bg-gray-800/50">
                {zone.factories.map(factory => (
                  <div
                    key={factory.id}
                    className="flex items-center gap-2 p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700"
                    onClick={() => toggleFactorySelection(factory.id)}
                  >
                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center shrink-0 ${
                      selectedFactoryIds.has(factory.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-500'
                    }`}>
                      {selectedFactoryIds.has(factory.id) && (
                        <CheckIcon className="w-3 h-3 text-white" />
                      )}
                    </div>
                    {factory.icon && <img src={factory.icon} alt="" className="w-5 h-5" />}
                    <span className="text-sm">{factory.name}</span>
                    <span className="text-xs text-gray-500 ml-auto shrink-0">
                      {factory.nodeCount} nodes
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export actions */}
      <div className="flex gap-2">
        <button
          onClick={downloadFile}
          disabled={selectedFactoryIds.size === 0 || isExporting}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded cursor-pointer flex items-center justify-center gap-2"
        >
          <FolderArrowDownIcon className="w-5 h-5" />
          Download File
        </button>
        <button
          onClick={copyToClipboard}
          disabled={selectedFactoryIds.size === 0 || isExporting}
          className={`flex-1 px-4 py-2 rounded cursor-pointer flex items-center justify-center gap-2 ${
            copySuccess
              ? 'bg-green-600'
              : 'bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed'
          }`}
        >
          <ClipboardIcon className="w-5 h-5" />
          {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
        </button>
      </div>
    </div>
  );
}
