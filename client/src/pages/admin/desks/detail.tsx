import { getDesk } from "@/api/admin/desk";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { useLoading } from "@/contexts/useLoading";
import { Desk } from "@/types";
import { useValidatedIdParam } from "@/utils/routeParams";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Desk detail: fetch single desk by id (with game), display and back.
 */
const Detail = () => {
  const validatedId = useValidatedIdParam("/admin/desks");
  const [desk, setDesk] = useState<Desk>();
  const { setIsLoading } = useLoading();
  const navigate = useNavigate();

  useEffect(() => {
    if (!validatedId) return;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await getDesk(validatedId, { include: "game" });
        setDesk(data);
      } catch (error) {
        console.error("Error fetching desk", error);
        toast.error("Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [validatedId, setIsLoading]);

  if (!validatedId) return null;
  if (!desk) {
    return <div>No desk data found</div>;
  }

  return (
    <Card className="max-w-md">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Name</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">{desk.name}</span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Game Type</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">{desk.game?.name}</span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Baccarat Type</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">{desk.baccarat_type}</span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Desk Number</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">{desk.desk_no}</span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Desk Position</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">{desk.position}</span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Created Date</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">
              {new Date(desk.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Updated Date</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">
              {new Date(desk.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="mt-6 flex gap-1">
          <Button variant="ghost" onClick={() => navigate("/admin/desks")}>
            <Icons.arrowLeft />
            Back
          </Button>
          <Button
            variant="info"
            onClick={() => navigate(`/admin/desks/edit/${desk.id}`)}
          >
            <Icons.pencil />
            Edit Desk
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Detail;
