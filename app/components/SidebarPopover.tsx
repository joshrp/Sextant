import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import type { PencilIcon } from '@heroicons/react/24/outline';

type HeroIcon = React.FC<Parameters<typeof PencilIcon>[0]>
type SidebarPopoverProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  anchor?: "bottom" | "bottom start" | "bottom end" | "top" | "top start" | "top end";
  className?: string;
};

/**
 * A reusable popover component for Sidebar-related UI elements in the sidebar.
 * Uses Headless UI Popover which can persist and contain arbitrary content.
 * 
 * Unlike Menu components, Popovers:
 * - Can stay open while user navigates
 * - Support arbitrary content (not just menu items)
 * - Can be toggled open/closed by clicking the trigger
 */
export function SidebarPopover({ 
  trigger, 
  children, 
  anchor = "bottom start",
  className = ""
}: SidebarPopoverProps) {
  return (
    <Popover>
      <PopoverButton as="div" className="cursor-pointer">
        {trigger}
      </PopoverButton>
      <PopoverPanel 
        anchor={anchor}
        className={`bg-gray-800 border-2 border-gray-500 rounded-sm shadow-lg z-50 texture-embossed ${className}`}
      >
        {children}
      </PopoverPanel>
    </Popover>
  );
}

type PopoverMenuItemProps = {
  onClick: () => void;
  children: React.ReactNode;
};

/**
 * A menu item component for use inside SidebarPopover.
 * Maintains the same styling as the original MenuItem components.
 */
export function PopoverMenuItem({ onClick, children }: PopoverMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 px-4 w-full block text-left border-b-1 border-gray-500 border-dotted cursor-pointer data-focus:bg-blue-900 hover:bg-blue-900"
    >
      {children}
    </button>
  );
}

export function PopoverIconActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-row justify-between gap-1 border-t-2 border-gray-500 texture-embossed">
      {children}
    </div>
  );
}

type PopoverIconActionProps = {
  Icon: HeroIcon; // Assuming icon is a string representing the icon name
  label: string;
  onClick: () => void;
};

/**
 * An icon action button for use inside PopoverIconActions.
 */
export function PopoverIconAction({ Icon, label, onClick }: PopoverIconActionProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center py-1 px-2 hover:bg-blue-900 cursor-pointer"
      title={label}
    >
      <Icon className="w-5 h-5 mb-1" />
      <span className="text-sm">{label}</span>
    </button>
  );
}
