import { getScanner } from "@/api/admin/scanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { useLoading } from "@/contexts/useLoading";
import { Scanner } from "@/types";
import { useValidatedIdParam } from "@/utils/routeParams";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Scanner detail: fetch single scanner by id (with desk), display and back.
 */
const Detail = () => {
  const validatedId = useValidatedIdParam("/admin/scanners");
  const [scanner, setScanner] = useState<Scanner>();
  const { setIsLoading } = useLoading();
  const navigate = useNavigate();

  useEffect(() => {
    if (!validatedId) return;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await getScanner(validatedId, { include: "desk" });
        setScanner(data);
      } catch (error) {
        console.error("Error fetching scanner", error);
        toast.error("Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [validatedId, setIsLoading]);

  if (!validatedId) return null;
  if (!scanner) {
    return <div>No scanner data found</div>;
  }

  return (
    <Card className="max-w-md">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Name</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">{scanner.name}</span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Desk</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">
              {scanner.desk?.name || "-"}
            </span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Communication Port</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">{scanner.com_port}</span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Serial Number</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">
              {scanner.serial_number}
            </span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Desk Position</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">{scanner.position}</span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Created Date</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">
              {new Date(scanner.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="grid grid-cols-5">
            <span className="text-left col-span-2">Updated Date</span>
            <span className="text-center">:</span>
            <span className="text-left col-span-2">
              {new Date(scanner.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="mt-6 flex gap-1">
          <Button variant="ghost" onClick={() => navigate("/admin/scanners")}>
            <Icons.arrowLeft />
            Back
          </Button>
          <Button
            variant="info"
            onClick={() => navigate(`/admin/scanners/edit/${scanner.id}`)}
          >
            <Icons.pencil />
            Edit Scanner
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Detail;
