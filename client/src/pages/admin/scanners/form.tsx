import { getDesks } from "@/api/admin/desk";
import { createScanner, getScanner, updateScanner } from "@/api/admin/scanner";
import InputField from "@/components/shared/InputField";
import SelectField from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { useLoading } from "@/contexts/useLoading";
import { Desk } from "@/types";
import { AxiosError } from "axios";
import { useValidatedIdParam } from "@/utils/routeParams";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type FormValues = {
  name: string;
  desk_id: number;
  serial_number: string;
  com_port: string;
  position: number;
};

/**
 * Scanner form: create/edit scanner with desk selection.
 */
const ScannerForm = () => {
  const validatedId = useValidatedIdParam("/admin/scanners", {
    required: false,
  });
  const { isLoading, setIsLoading } = useLoading();
  const navigate = useNavigate();
  const [desks, setDesks] = useState<Desk[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const result = await getDesks();
        setDesks(result.data.desks);
      } catch (error) {
        toast.error("Failed to load desks.");
        console.error("Desks fetch error", error);
      }

      if (validatedId) {
        try {
          const data = await getScanner(validatedId);
          reset({
            name: data.name,
            desk_id: data.desk_id,
            serial_number: data.serial_number,
            com_port: data.com_port,
            position: data.position,
          });
        } catch (error) {
          toast.error("Failed to fetch scanner data.");
          console.error("Scanner fetch error", error);
        }
      }

      setIsLoading(false);
    };
    loadInitialData();
  }, [validatedId, reset, setIsLoading]);

  /** Creates or updates scanner. */
  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      let response;
      if (validatedId) {
        response = await updateScanner(validatedId, data);
      } else {
        response = await createScanner(data);
      }

      navigate("/admin/scanners", {
        state: { message: response.message },
      });
    } catch (err) {
      const error = err as AxiosError<{ errors: Record<string, string[]> }>;
      console.error("Error saving scanner", error);
      toast.error("Please review the problems below.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardContent className="py-6">
        <fieldset disabled={isLoading}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <InputField
              id="name"
              label="Scanner Name"
              type="text"
              registerProps={register("name", { required: "Name is required" })}
              error={errors.name?.message}
            />

            <SelectField
              id="desk_id"
              label="Desk"
              value={watch("desk_id")}
              options={desks.map((desk) => ({
                value: desk.id,
                label: desk.name,
              }))}
              register={register("desk_id", { required: "Desk is required" })}
              error={errors.desk_id?.message}
            />

            <InputField
              id="com_port"
              label="COM Port"
              type="text"
              registerProps={register("com_port", {
                required: "COM Port is required",
              })}
              error={errors.com_port?.message}
            />

            <InputField
              id="serial_number"
              label="Serial Number"
              type="text"
              registerProps={register("serial_number", {
                required: "Serial Number is required",
              })}
              error={errors.serial_number?.message}
            />

            <InputField
              id="position"
              label="Position"
              type="number"
              registerProps={register("position", {
                required: "Position is required",
              })}
              error={errors.position?.message}
            />

            <div className="flex gap-1">
              <Button
                variant="ghost"
                type="button"
                onClick={() => navigate("/admin/scanners")}
              >
                <Icons.arrowLeft />
                Back
              </Button>
              <Button variant="info" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Icons.loader2 className="animate-spin" />
                ) : (
                  <Icons.save />
                )}
                Save
              </Button>
            </div>
          </form>
        </fieldset>
      </CardContent>
    </Card>
  );
};

export default ScannerForm;
