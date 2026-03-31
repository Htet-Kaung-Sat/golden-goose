import { deleteDesk, getDesks } from "@/api/admin/desk";
import ActionDropdown from "@/components/shared/ActionDropdown";
import DataTable from "@/components/shared/DataTable";
import DeleteDialog from "@/components/shared/DeleteDialog";
import { Button } from "@/components/ui/button";
import { useLoading } from "@/contexts/useLoading";
import { Desk } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Desk list: fetch desks with game, table with edit/delete/detail, delete confirm.
 */
const Index = () => {
  const location = useLocation();
  const message = location.state?.message;
  const [desks, setDesks] = useState<Desk[]>([]);
  const { setIsLoading } = useLoading();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDeskId, setSelectedDeskId] = useState<number | null>(null);

  const navigate = useNavigate();

  /** Fetches desks with game include. */
  const fetchDesks = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getDesks({ include: "game" });
      setDesks(result.data.desks);
    } catch (error) {
      console.error("Error fetching desks", error);
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading]);

  useEffect(() => {
    fetchDesks();
  }, [fetchDesks]);

  useEffect(() => {
    if (message) {
      toast.success(message);
      window.history.replaceState({}, document.title);
    }
  }, [message]);

  /** Deletes selected desk and refreshes list. */
  const handleConfirmDelete = async () => {
    if (selectedDeskId) {
      const res = await deleteDesk(selectedDeskId);
      toast.success(res.message);
      fetchDesks();
      setSelectedDeskId(null);
      setOpenDialog(false);
    }
  };

  const columns: ColumnDef<Desk>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "game.name",
      header: "Game Type",
    },
    {
      accessorKey: "baccarat_type",
      header: "Baccarat Type",
    },
    {
      accessorKey: "desk_no",
      header: "Desk Number",
    },
    {
      accessorKey: "position",
      header: "Desk Position",
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => {
        const rawDate = row.original.createdAt;
        const date = new Date(rawDate);
        const formattedDate = `${date.toLocaleDateString()}`;
        return formattedDate;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const desk = row.original;
        return (
          <ActionDropdown
            onDetail={() => navigate(`/admin/desks/${desk.id}`)}
            onEdit={() => navigate(`/admin/desks/edit/${desk.id}`)}
            onDelete={() => {
              setSelectedDeskId(desk.id);
              setOpenDialog(true);
            }}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="info" onClick={() => navigate("create")}>
          Create Desk
        </Button>
      </div>

      <DataTable columns={columns} data={desks} />

      <DeleteDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default Index;
