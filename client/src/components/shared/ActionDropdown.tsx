import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReactNode } from "react";
import { Icons } from "../ui/icons";

interface ActionDropdownProps {
  onDetail?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  disableEdit?: boolean;
  disableDelete?: boolean;
  customItems?: ReactNode;
}

const ActionDropdown = ({
  onDetail,
  onEdit,
  onDelete,
  disableEdit,
  disableDelete,
  customItems,
}: ActionDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <Icons.moreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onDetail && (
          <DropdownMenuItem className="cursor-pointer" onClick={onDetail}>
            Detail
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={!disableEdit ? onEdit : undefined}
            disabled={disableEdit}
          >
            Edit
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={!disableDelete ? onDelete : undefined}
            disabled={disableDelete}
          >
            Delete
          </DropdownMenuItem>
        )}
        {customItems}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ActionDropdown;
