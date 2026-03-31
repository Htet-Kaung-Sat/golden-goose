import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

const RowActions = ({
  canEditRow,
  canEditAllRow,
  hasSelectedTwoOrMoreRow,
  canDeleteRow,
  canDeleteSelectRow,
  canDeleteAllRow,
  hasDeleteTwoOrMoreRow,
  onAllEdit,
  onSelectEdit,
  onSingleEdit,
  onAllDelete,
  onSelectDelete,
  onSingleDelete,
}: {
  canEditRow?: boolean;
  canEditAllRow?: boolean;
  hasSelectedTwoOrMoreRow?: boolean;
  canDeleteRow?: boolean;
  canDeleteSelectRow?: boolean;
  canDeleteAllRow?: boolean;
  hasDeleteTwoOrMoreRow?: boolean;
  onAllEdit?: () => void;
  onSelectEdit?: () => void;
  onSingleEdit?: () => void;
  onAllDelete?: () => void;
  onSelectDelete?: () => void;
  onSingleDelete?: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1 hover:bg-gray-200 rounded">
          <MoreVertical size={16} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        {onAllEdit && canEditAllRow && (
          <DropdownMenuItem onClick={onAllEdit}>
            {t("all_edit")}
          </DropdownMenuItem>
        )}
        {onSelectEdit && canEditRow && hasSelectedTwoOrMoreRow && (
          <DropdownMenuItem onClick={onSelectEdit}>
            {t("select_edit")}
          </DropdownMenuItem>
        )}
        {onSingleEdit && canEditRow && (
          <DropdownMenuItem onClick={onSingleEdit}>
            {t("single_edit")}
          </DropdownMenuItem>
        )}
        {onAllDelete && canDeleteAllRow && (
          <DropdownMenuItem className="text-red-600" onClick={onAllDelete}>
            {t("all_delete")}
          </DropdownMenuItem>
        )}
        {onSelectDelete && hasDeleteTwoOrMoreRow && canDeleteSelectRow && (
          <DropdownMenuItem className="text-red-600" onClick={onSelectDelete}>
            {t("select_delete")}
          </DropdownMenuItem>
        )}
        {onSingleDelete && canDeleteRow && (
          <DropdownMenuItem className="text-red-600" onClick={onSingleDelete}>
            {t("single_delete")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RowActions;
