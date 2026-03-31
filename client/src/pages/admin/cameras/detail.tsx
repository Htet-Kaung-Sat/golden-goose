import { getCamera } from "@/api/admin/camera";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { useLoading } from "@/contexts/useLoading";
import { Camera } from "@/types";
import { useValidatedIdParam } from "@/utils/routeParams";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Camera detail: fetch single camera by id (with game), display and back.
 */
const Detail = () => {
  const validatedId = useValidatedIdParam("/admin/cameras");
  const [camera, setCamera] = useState<Camera>();
  const { setIsLoading } = useLoading();
  const navigate = useNavigate();
  const didFetch = useRef(false);

  useEffect(() => {
    if (!validatedId || didFetch.current) return;
    didFetch.current = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await getCamera(validatedId, { include: "game" });
        setCamera(data);
      } catch (error) {
        console.error("Error fetching camera", error);
        toast.error("Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [validatedId, setIsLoading]);

  if (!validatedId) return null;
  if (!camera) {
    return <div>No camera data found</div>;
  }

  return (
    <Card className="max-w-md">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Desk Name</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">
              {camera.desk?.name ?? "Main Page"}
            </span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Camera Number</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">{camera.camera_no}</span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Camera Position</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">{camera.position}</span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Camera URL</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">{camera.url}</span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Status</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">{camera.status}</span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Created Date</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">
              {new Date(camera.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Updated Date</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">
              {new Date(camera.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="mt-6 flex gap-1">
          <Button variant="ghost" onClick={() => navigate("/admin/cameras")}>
            <Icons.arrowLeft />
            Back
          </Button>
          <Button
            variant="info"
            onClick={() => navigate(`/admin/cameras/edit/${camera.id}`)}
          >
            <Icons.pencil />
            Edit Camera
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Detail;
