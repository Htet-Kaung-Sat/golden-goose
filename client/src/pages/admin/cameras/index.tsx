import { deleteCamera, getCameras } from "@/api/admin/camera";
import ActionDropdown from "@/components/shared/ActionDropdown";
import DataTable from "@/components/shared/DataTable";
import DeleteDialog from "@/components/shared/DeleteDialog";
import { Button } from "@/components/ui/button";
import { useLoading } from "@/contexts/useLoading";
import { Camera } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Camera list: fetch cameras with game, table with edit/delete/detail, delete confirm.
 */
const Index = () => {
  const location = useLocation();
  const message = location.state?.message;
  const [cameras, setCameras] = useState<Camera[]>([]);
  const { setIsLoading } = useLoading();
  const didFetch = useRef(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState<number | null>(null);

  const navigate = useNavigate();

  /** Fetches cameras with game include. */
  const fetchCameras = useCallback(async () => {
    if (!didFetch.current) {
      didFetch.current = true;
      const load = async () => {
        try {
          setIsLoading(true);
          const result = await getCameras({ include: "game" });
          setCameras(result.data.cameras);
        } catch (error) {
          console.error("Error fetching cameras", error);
          toast.error("Something went wrong.");
        } finally {
          setIsLoading(false);
        }
      };
      load();
    }
  }, [setIsLoading]);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  useEffect(() => {
    if (message) {
      toast.success(message);
      window.history.replaceState({}, document.title);
    }
  }, [message]);

  /** Deletes selected camera and refreshes list. */
  const handleConfirmDelete = async () => {
    if (selectedCameraId) {
      const res = await deleteCamera(selectedCameraId);
      toast.success(res.message);
      fetchCameras();
      setSelectedCameraId(null);
      setOpenDialog(false);
    }
  };

  const columns: ColumnDef<Camera>[] = [
    {
      id: "desk_name",
      header: "Desk Name",
      cell: ({ row }) => {
        const desk = row.original.desk;
        return desk?.name ?? "Main Page";
      },
    },
    {
      accessorKey: "camera_no",
      header: "Camera Number",
    },
    {
      accessorKey: "position",
      header: "Camera Position",
    },
    {
      accessorKey: "url",
      header: "Camera URL",
    },
    {
      accessorKey: "status",
      header: "Status",
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
        const camera = row.original;
        return (
          <ActionDropdown
            onDetail={() => navigate(`/admin/cameras/${camera.id}`)}
            onEdit={() => navigate(`/admin/cameras/edit/${camera.id}`)}
            onDelete={() => {
              setSelectedCameraId(camera.id);
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
          Create Camera
        </Button>
      </div>

      <DataTable columns={columns} data={cameras} />

      <DeleteDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default Index;
