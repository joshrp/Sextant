import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardIcon, FolderArrowDownIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

import { SelectorDialog } from './Dialog';
import { compressBulk, minifyBulk } from '~/factory/importexport/importexport';
import type { ExportableZone } from '~/types/bulkOperations';

export type { ExportableZone, ExportableFactory } from '~/types/bulkOperations';

interface BulkExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** All zones and factories available for export */
  zones: ExportableZone[];
}

export default function BulkExportDialog({ isOpen, onClose, zones }: BulkExportDialogProps) {
  // Track selected factory IDs (zone selection = all factories in that zone)
  const [selectedFactoryIds, setSelectedFactoryIds] = useState<Set<string>>(new Set());
  const [exportString, setExportString] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Get all factories across all zones
  const allFactories = useMemo(() => {
    return zones.flatMap(z => z.factories);
  }, [zones]);

  // Check if a zone is fully selected
  const isZoneSelected = useCallback((zone: ExportableZone) => {
    return zone.factories.length > 0 && zone.factories.every(f => selectedFactoryIds.has(f.id));
  }, [selectedFactoryIds]);

  // Check if a zone is partially selected
  const isZonePartiallySelected = useCallback((zone: ExportableZone) => {
    const selectedCount = zone.factories.filter(f => selectedFactoryIds.has(f.id)).length;
    return selectedCount > 0 && selectedCount < zone.factories.length;
  }, [selectedFactoryIds]);

  // Toggle zone selection (selects/deselects all factories in zone)
  const toggleZoneSelection = useCallback((zone: ExportableZone) => {
    setSelectedFactoryIds(prev => {
      const next = new Set(prev);
      if (isZoneSelected(zone)) {
        // Deselect all factories in zone
        zone.factories.forEach(f => next.delete(f.id));
      } else {
        // Select all factories in zone
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
    
    // Always export as array (flat array of factories as per requirements)
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

  return (
    <SelectorDialog
      isOpen={isOpen}
      setIsOpen={onClose}
      title="Bulk Export"
      widthClassName="w-[800px] max-w-[95vw]"
      heightClassName="h-[80vh]"
    >
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
        <div className="flex-1 overflow-y-auto border border-gray-700 rounded p-2">
          {zones.map(zone => (
            <div key={zone.id} className="mb-4">
              {/* Zone header with checkbox */}
              <div
                className="flex items-center gap-3 p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
                onClick={() => toggleZoneSelection(zone)}
              >
                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                  isZoneSelected(zone) 
                    ? 'bg-blue-500 border-blue-500' 
                    : isZonePartiallySelected(zone)
                    ? 'bg-blue-500/50 border-blue-500'
                    : 'border-gray-400'
                }`}>
                  {(isZoneSelected(zone) || isZonePartiallySelected(zone)) && (
                    <CheckIcon className="w-4 h-4 text-white" />
                  )}
                </div>
                {zone.icon && <img src={zone.icon} alt="" className="w-6 h-6" />}
                <span className="font-semibold">{zone.name}</span>
                <span className="text-sm text-gray-400 ml-auto">
                  {zone.factories.length} {zone.factories.length === 1 ? 'factory' : 'factories'}
                </span>
              </div>

              {/* Factories in zone */}
              <div className="ml-8 mt-2 space-y-1">
                {zone.factories.map(factory => (
                  <div
                    key={factory.id}
                    className="flex items-center gap-3 p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700"
                    onClick={() => toggleFactorySelection(factory.id)}
                  >
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                      selectedFactoryIds.has(factory.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-400'
                    }`}>
                      {selectedFactoryIds.has(factory.id) && (
                        <CheckIcon className="w-4 h-4 text-white" />
                      )}
                    </div>
                    {factory.icon && <img src={factory.icon} alt="" className="w-6 h-6" />}
                    <span>{factory.name}</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {factory.nodeCount} nodes • {factory.edgeCount} edges • {factory.goalCount} goals
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Export actions */}
        <div className="flex gap-2">
          <button
            onClick={downloadFile}
            disabled={selectedFactoryIds.size === 0 || isExporting}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded cursor-pointer flex items-center justify-center gap-2"
          >
            <FolderArrowDownIcon className="w-5 h-5" />
            Download File
          </button>
          <button
            onClick={copyToClipboard}
            disabled={selectedFactoryIds.size === 0 || isExporting}
            className={`flex-1 px-4 py-2 rounded cursor-pointer flex items-center justify-center gap-2 ${
              copySuccess
                ? 'bg-green-700'
                : 'bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed'
            }`}
          >
            <ClipboardIcon className="w-5 h-5" />
            {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>

        {/* Export preview */}
        {selectedFactoryIds.size > 0 && (
          <div className="mt-2">
            <div className="text-sm text-gray-400 mb-1">Export Preview:</div>
            <textarea
              value={isExporting ? 'Generating export...' : exportString}
              readOnly
              onClick={e => (e.target as HTMLTextAreaElement).select()}
              className="w-full h-24 p-2 bg-gray-700 rounded text-xs font-mono resize-none"
            />
          </div>
        )}
      </div>
    </SelectorDialog>
  );
}
