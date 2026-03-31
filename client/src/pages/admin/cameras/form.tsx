import { createCamera, getCamera, updateCamera } from "@/api/admin/camera";
import { getDesks } from "@/api/admin/desk";
import InputField from "@/components/shared/InputField";
import SelectField from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { useLoading } from "@/contexts/useLoading";
import { Desk } from "@/types";
import { AxiosError } from "axios";
import { useValidatedIdParam } from "@/utils/routeParams";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type FormValues = {
  desk_id: number | null;
  camera_no: string;
  position: string;
  url: string;
  status: string;
};

/**
 * Camera form: create/edit camera with desk selection.
 */
const Form = () => {
  const validatedId = useValidatedIdParam("/admin/cameras", {
    required: false,
  });
  const { isLoading, setIsLoading } = useLoading();
  const navigate = useNavigate();
  const [desks, setDesks] = useState<Desk[]>([]);
  const didFetch = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>();

  useEffect(() => {
    if (!didFetch.current) {
      didFetch.current = true;
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
            const data = await getCamera(validatedId);
            reset({
              desk_id: data.desk_id ?? 0,
              camera_no: data.camera_no,
              position: data.position,
              url: data.url,
              status: data.status,
            });
          } catch (error) {
            toast.error("Something went wrong.");
            console.error("Failed to fetch camera", error);
          }
        }

        setIsLoading(false);
      };
      loadInitialData();
    }
  }, [validatedId, reset, setIsLoading]);

  /** Creates or updates camera. */
  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        desk_id:
          Number(data.desk_id) === 0
            ? null
            : data.desk_id
              ? Number(data.desk_id)
              : null,
      };

      let response;
      if (validatedId) {
        response = await updateCamera(String(validatedId), payload);
      } else {
        response = await createCamera(payload);
      }

      navigate("/admin/cameras", {
        state: { message: response.message },
      });
    } catch (err) {
      const error = err as AxiosError<{ errors: Record<string, string[]> }>;
      console.error("Error creating cameras", error);
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
            <SelectField
              id="desk_id"
              label="Desk"
              value={watch("desk_id") ?? ""}
              placeholder="Select a desk"
              selectClassName="w-50"
              options={[
                { value: 0, label: "Home Page" },
                ...desks.map((desk) => ({
                  value: String(desk.id),
                  label: desk.name,
                })),
              ]}
              register={register("desk_id")}
            />

            <InputField
              id="camera_no"
              label="Camera Number"
              type="text"
              inputClassName="w-50"
              registerProps={register("camera_no", {
                required: "Camera Number is required",
              })}
              error={errors.camera_no?.message}
            />

            <SelectField
              id="position"
              label="Camera Position"
              value={watch("position")}
              selectClassName="w-50"
              required={true}
              placeholder="Select a position"
              options={[
                { value: "MAIN", label: "MAIN" },
                { value: "SIDE", label: "SIDE" },
                { value: "OVERHEAD", label: "OVERHEAD" },
                { value: "DEALER", label: "DEALER" },
              ]}
              register={register("position", {
                required: "Camera Position is required",
              })}
              error={errors.position?.message}
            />

            <InputField
              id="url"
              label="Camera URL"
              type="text"
              inputClassName="w-50"
              registerProps={register("url", {
                required: "Camera URL is required",
              })}
              error={errors.url?.message}
            />

            <SelectField
              id="status"
              label="Status"
              value={watch("status")}
              selectClassName="w-50"
              required={true}
              placeholder="Select a status"
              options={[
                { value: "ACTIVE", label: "ACTIVE" },
                { value: "INACTIVE", label: "INACTIVE" },
              ]}
              register={register("status", {
                required: "Status is required",
              })}
              error={errors.status?.message}
            />

            <div className="flex gap-1">
              <Button
                variant="ghost"
                type="button"
                onClick={() => navigate("/admin/cameras")}
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

export default Form;
