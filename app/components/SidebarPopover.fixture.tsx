import { PencilIcon } from "@heroicons/react/24/outline";
import { PopoverIconAction, PopoverIconActions, PopoverMenuItem, SidebarPopover } from "./SidebarPopover";
import { XMarkIcon } from "@heroicons/react/24/solid";

export default {
  'Button with Menu Items': <SidebarPopover
    trigger={
    <div className="p-2 bg-blue-600 text-white rounded-sm">Open Menu</div>
  }
  >
    <PopoverMenuItem onClick={() => alert('Item 1 clicked')}>
      Menu Item 1
    </PopoverMenuItem>
    <PopoverMenuItem onClick={() => alert('Item 2 clicked')}>
      Menu Item 2
    </PopoverMenuItem>
    <PopoverIconActions>
      <PopoverIconAction
        Icon={PencilIcon}
        label="Edit"
        onClick={() => alert('Edit action clicked')}
      />
      <PopoverIconAction
        Icon={XMarkIcon}
        label="Delete"
        onClick={() => alert('Delete action clicked')}
      />
    </PopoverIconActions>
  </SidebarPopover>,
}
