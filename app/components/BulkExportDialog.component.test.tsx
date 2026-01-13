import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import 'fake-indexeddb/auto';
import '@ungap/compression-stream/poly';

import BulkExportDialog from './BulkExportDialog';
import type { ExportableZone } from '~/types/bulkOperations';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// Create mock exportable zones for testing
function createMockZones(): ExportableZone[] {
  return [
    {
      id: 'zone-1',
      name: 'Power Zone',
      icon: '/assets/products/electricity.png',
      factories: [
        {
          id: 'factory-1',
          zoneId: 'zone-1',
          zoneName: 'Power Zone',
          name: 'Steam Power',
          nodeCount: 5,
          edgeCount: 4,
          goalCount: 1,
          data: {
            name: 'Steam Power',
            nodes: [],
            edges: [],
            goals: [],
          },
        },
        {
          id: 'factory-2',
          zoneId: 'zone-1',
          zoneName: 'Power Zone',
          name: 'Solar Power',
          nodeCount: 3,
          edgeCount: 2,
          goalCount: 1,
          data: {
            name: 'Solar Power',
            nodes: [],
            edges: [],
            goals: [],
          },
        },
      ],
    },
    {
      id: 'zone-2',
      name: 'Metal Zone',
      factories: [
        {
          id: 'factory-3',
          zoneId: 'zone-2',
          zoneName: 'Metal Zone',
          name: 'Iron Smelting',
          nodeCount: 8,
          edgeCount: 7,
          goalCount: 2,
          data: {
            name: 'Iron Smelting',
            nodes: [],
            edges: [],
            goals: [],
          },
        },
      ],
    },
  ];
}

// Helper to get the first dialog element (handles React Strict Mode doubling)
function getFirstDialog() {
  const dialogs = screen.getAllByRole('dialog');
  return dialogs[0];
}

describe('BulkExportDialog Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders dialog with title', () => {
      render(
        <BulkExportDialog
          isOpen={true}
          onClose={mockOnClose}
          zones={createMockZones()}
        />
      );

      const dialog = getFirstDialog();
      expect(within(dialog).getByRole('heading', { name: 'Bulk Export' })).toBeInTheDocument();
    });

    test('displays all zones with their names', () => {
      render(
        <BulkExportDialog
          isOpen={true}
          onClose={mockOnClose}
          zones={createMockZones()}
        />
      );

      const dialog = getFirstDialog();
      expect(within(dialog).getByText('Power Zone')).toBeInTheDocument();
      expect(within(dialog).getByText('Metal Zone')).toBeInTheDocument();
    });

    test('displays factories', () => {
      render(
        <BulkExportDialog
          isOpen={true}
          onClose={mockOnClose}
          zones={createMockZones()}
        />
      );

      const dialog = getFirstDialog();
      expect(within(dialog).getByText('Steam Power')).toBeInTheDocument();
      expect(within(dialog).getByText('Solar Power')).toBeInTheDocument();
      expect(within(dialog).getByText('Iron Smelting')).toBeInTheDocument();
    });
  });

  describe('Selection behavior', () => {
    test('clicking Select All selects all factories', async () => {
      const user = userEvent.setup();
      render(
        <BulkExportDialog
          isOpen={true}
          onClose={mockOnClose}
          zones={createMockZones()}
        />
      );

      const dialog = getFirstDialog();
      
      // Find Select All button within the dialog
      const selectAllButton = within(dialog).getByRole('button', { name: 'Select All' });
      await user.click(selectAllButton);

      // All 3 factories should be selected
      expect(within(dialog).getByText(/3 of 3 factories selected/)).toBeInTheDocument();
    });

    test('clicking Deselect All deselects all factories', async () => {
      const user = userEvent.setup();
      render(
        <BulkExportDialog
          isOpen={true}
          onClose={mockOnClose}
          zones={createMockZones()}
        />
      );

      const dialog = getFirstDialog();
      
      // First select all
      const selectAllButton = within(dialog).getByRole('button', { name: 'Select All' });
      await user.click(selectAllButton);
      expect(within(dialog).getByText(/3 of 3 factories selected/)).toBeInTheDocument();

      // Then deselect all
      const deselectAllButton = within(dialog).getByRole('button', { name: 'Deselect All' });
      await user.click(deselectAllButton);
      expect(within(dialog).getByText(/0 of 3 factories selected/)).toBeInTheDocument();
    });
  });

  describe('Export generation', () => {
    test('generates export string when factories are selected', async () => {
      const user = userEvent.setup();
      render(
        <BulkExportDialog
          isOpen={true}
          onClose={mockOnClose}
          zones={createMockZones()}
        />
      );

      const dialog = getFirstDialog();
      
      // Select all factories
      const selectAllButton = within(dialog).getByRole('button', { name: 'Select All' });
      await user.click(selectAllButton);

      // Wait for export string to be generated
      await waitFor(() => {
        const textarea = within(dialog).getByRole('textbox');
        expect(textarea).not.toHaveValue('');
      }, { timeout: 3000 });
    });

    test('export buttons are disabled when no factories selected', () => {
      render(
        <BulkExportDialog
          isOpen={true}
          onClose={mockOnClose}
          zones={createMockZones()}
        />
      );

      const dialog = getFirstDialog();
      expect(within(dialog).getByRole('button', { name: /Download File/ })).toBeDisabled();
      expect(within(dialog).getByRole('button', { name: /Copy to Clipboard/ })).toBeDisabled();
    });

    test('export buttons are enabled when factories are selected', async () => {
      const user = userEvent.setup();
      render(
        <BulkExportDialog
          isOpen={true}
          onClose={mockOnClose}
          zones={createMockZones()}
        />
      );

      const dialog = getFirstDialog();
      
      // Select all factories
      await user.click(within(dialog).getByRole('button', { name: 'Select All' }));

      // Wait for export to be ready
      await waitFor(() => {
        expect(within(dialog).getByRole('button', { name: /Download File/ })).not.toBeDisabled();
        expect(within(dialog).getByRole('button', { name: /Copy to Clipboard/ })).not.toBeDisabled();
      }, { timeout: 3000 });
    });
  });

  describe('Empty state', () => {
    test('handles empty zones array', () => {
      render(
        <BulkExportDialog
          isOpen={true}
          onClose={mockOnClose}
          zones={[]}
        />
      );

      const dialog = getFirstDialog();
      expect(within(dialog).getByText(/0 of 0 factories selected/)).toBeInTheDocument();
    });
  });
});
