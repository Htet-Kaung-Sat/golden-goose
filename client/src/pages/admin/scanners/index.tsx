import { deleteScanner, getScanners } from "@/api/admin/scanner";
import ActionDropdown from "@/components/shared/ActionDropdown";
import DataTable from "@/components/shared/DataTable";
import DeleteDialog from "@/components/shared/DeleteDialog";
import { Button } from "@/components/ui/button";
import { useLoading } from "@/contexts/useLoading";
import { Scanner } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Scanner list: fetch scanners with desk, table with edit/delete/detail, delete confirm.
 */
const Index = () => {
  const location = useLocation();
  const message = location.state?.message;
  const [scanners, setScanner] = useState<Scanner[]>([]);
  const { setIsLoading } = useLoading();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedScannerId, setSelectedScannerId] = useState<number | null>(
    null,
  );

  const navigate = useNavigate();

  /** Fetches scanners with desk include. */
  const fetchScanners = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getScanners({ include: "desk" });
      setScanner(result.data.scanners);
    } catch (error) {
      console.error("Error fetching scanners", error);
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading]);

  useEffect(() => {
    fetchScanners();
  }, [fetchScanners]);

  useEffect(() => {
    if (message) {
      toast.success(message);
      window.history.replaceState({}, document.title);
    }
  }, [message]);

  /** Deletes selected scanner and refreshes list. */
  const handleConfirmDelete = async () => {
    if (selectedScannerId) {
      const res = await deleteScanner(selectedScannerId);
      toast.success(res.message);
      fetchScanners();
      setSelectedScannerId(null);
      setOpenDialog(false);
    }
  };

  const columns: ColumnDef<Scanner>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "desk.name",
      header: "Desk",
    },
    {
      accessorKey: "com_port",
      header: "Communication Port",
    },
    {
      accessorKey: "serial_number",
      header: "Serial Number",
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
        const scanner = row.original;
        return (
          <ActionDropdown
            onDetail={() => navigate(`/admin/scanners/${scanner.id}`)}
            onEdit={() => navigate(`/admin/scanners/edit/${scanner.id}`)}
            onDelete={() => {
              setSelectedScannerId(scanner.id);
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
          Create Scanner
        </Button>
      </div>

      <DataTable columns={columns} data={scanners} />

      <DeleteDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default Index;
