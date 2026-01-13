import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import 'fake-indexeddb/auto';
import '@ungap/compression-stream/poly';

import BulkImportDialog from './BulkImportDialog';
import { compressBulk, minifyBulk } from '~/factory/importexport/importexport';
import type { GraphCoreData } from '~/factory/store';

// Helper to create a valid export string for testing
async function createExportString(factories: Array<{ state: GraphCoreData; zoneName: string }>) {
  const minified = minifyBulk(factories);
  // Always export as array (flat array of factories)
  return compressBulk(minified);
}

// Helper to get the first dialog element (handles React Strict Mode doubling)
function getFirstDialog() {
  const dialogs = screen.getAllByRole('dialog');
  return dialogs[0];
}

describe('BulkImportDialog Component', () => {
  const mockOnClose = vi.fn();
  const mockOnImport = vi.fn().mockResolvedValue(undefined);
  const existingZones = [
    { id: 'main', name: 'Default' },
    { id: 'power', name: 'Power Zone' },
  ];
  const existingZoneNames = existingZones.map(z => z.name);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders dialog with title', () => {
      render(
        <BulkImportDialog
          isOpen={true}
          onClose={mockOnClose}
          existingZoneNames={existingZoneNames}
          existingZones={existingZones}
          onImport={mockOnImport}
        />
      );

      const dialog = getFirstDialog();
      expect(within(dialog).getByRole('heading', { name: 'Bulk Import' })).toBeInTheDocument();
    });

    test('shows paste instruction', () => {
      render(
        <BulkImportDialog
          isOpen={true}
          onClose={mockOnClose}
          existingZoneNames={existingZoneNames}
          existingZones={existingZones}
          onImport={mockOnImport}
        />
      );

      const dialog = getFirstDialog();
      expect(within(dialog).getByText('Paste export string:')).toBeInTheDocument();
    });
  });

  describe('Parsing import strings', () => {
    test('parses valid single-factory export', async () => {
      const user = userEvent.setup();
      const exportString = await createExportString([
        {
          state: { name: 'Test Factory', nodes: [], edges: [], goals: [] },
          zoneName: 'Test Zone',
        },
      ]);

      render(
        <BulkImportDialog
          isOpen={true}
          onClose={mockOnClose}
          existingZoneNames={existingZoneNames}
          existingZones={existingZones}
          onImport={mockOnImport}
        />
      );

      const dialog = getFirstDialog();
      const textarea = within(dialog).getByPlaceholderText('Paste your factory export string here...');
      await user.clear(textarea);
      await user.type(textarea, exportString);

      await waitFor(() => {
        expect(within(dialog).getByText(/Found 1 factory/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('parses valid multi-factory export', async () => {
      const user = userEvent.setup();
      const exportString = await createExportString([
        {
          state: { name: 'Factory 1', nodes: [], edges: [], goals: [] },
          zoneName: 'Zone A',
        },
        {
          state: { name: 'Factory 2', nodes: [], edges: [], goals: [] },
          zoneName: 'Zone B',
        },
      ]);

      render(
        <BulkImportDialog
          isOpen={true}
          onClose={mockOnClose}
          existingZoneNames={existingZoneNames}
          existingZones={existingZones}
          onImport={mockOnImport}
        />
      );

      const dialog = getFirstDialog();
      const textarea = within(dialog).getByPlaceholderText('Paste your factory export string here...');
      await user.clear(textarea);
      await user.type(textarea, exportString);

      await waitFor(() => {
        expect(within(dialog).getByText(/Found 2 factories/)).toBeInTheDocument();
        expect(within(dialog).getByText(/2 zones/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Import button', () => {
    test('import button shows selected count', async () => {
      const user = userEvent.setup();
      const exportString = await createExportString([
        {
          state: { name: 'Test Factory', nodes: [], edges: [], goals: [] },
          zoneName: 'Test Zone',
        },
      ]);

      render(
        <BulkImportDialog
          isOpen={true}
          onClose={mockOnClose}
          existingZoneNames={existingZoneNames}
          existingZones={existingZones}
          onImport={mockOnImport}
        />
      );

      const dialog = getFirstDialog();
      const textarea = within(dialog).getByPlaceholderText('Paste your factory export string here...');
      await user.clear(textarea);
      await user.type(textarea, exportString);

      await waitFor(() => {
        expect(within(dialog).getByRole('button', { name: /Import 1 Factory/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('calls onImport when import button clicked', async () => {
      const user = userEvent.setup();
      const exportString = await createExportString([
        {
          state: { name: 'Test Factory', nodes: [], edges: [], goals: [] },
          zoneName: 'Test Zone',
        },
      ]);

      render(
        <BulkImportDialog
          isOpen={true}
          onClose={mockOnClose}
          existingZoneNames={existingZoneNames}
          existingZones={existingZones}
          onImport={mockOnImport}
        />
      );

      const dialog = getFirstDialog();
      const textarea = within(dialog).getByPlaceholderText('Paste your factory export string here...');
      await user.clear(textarea);
      await user.type(textarea, exportString);

      await waitFor(() => {
        expect(within(dialog).getByRole('button', { name: /Import 1 Factory/i })).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click the import button
      await user.click(within(dialog).getByRole('button', { name: /Import 1 Factory/i }));

      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalled();
      });
    });
  });
});
