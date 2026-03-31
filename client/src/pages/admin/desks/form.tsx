import { createDesk, getDesk, updateDesk } from "@/api/admin/desk";
import { getGames } from "@/api/admin/game";
import InputField from "@/components/shared/InputField";
import SelectField from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { useLoading } from "@/contexts/useLoading";
import { Game } from "@/types";
import { AxiosError } from "axios";
import { useValidatedIdParam } from "@/utils/routeParams";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type FormValues = {
  name: string;
  game_id: number;
  baccarat_type: string;
  desk_no: number;
  position: number;
};

/**
 * Desk form: create/edit desk with game selection.
 */
const Form = () => {
  const validatedId = useValidatedIdParam("/admin/desks", { required: false });
  const { isLoading, setIsLoading } = useLoading();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);

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
        const result = await getGames();
        setGames(result.data.games);
      } catch (error) {
        toast.error("Failed to load games.");
        console.error("Games fetch error", error);
      }

      if (validatedId) {
        try {
          const data = await getDesk(validatedId);
          reset({
            name: data.name,
            game_id: data.game_id,
            baccarat_type: data.baccarat_type,
            desk_no: data.desk_no,
            position: data.position,
          });
        } catch (error) {
          toast.error("Something went wrong.");
          console.error("Failed to fetch desk", error);
        }
      }

      setIsLoading(false);
    };
    loadInitialData();
  }, [validatedId, reset, setIsLoading]);

  /** Creates or updates desk. */
  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      let response;
      if (validatedId) {
        response = await updateDesk(String(validatedId), data);
      } else {
        response = await createDesk(data);
      }

      navigate("/admin/desks", {
        state: { message: response.message },
      });
    } catch (err) {
      const error = err as AxiosError<{ errors: Record<string, string[]> }>;
      console.error("Error creating desks", error);
      toast.error("Please review the problems below.");
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
              label="Desk Name"
              type="text"
              inputClassName="w-50"
              registerProps={register("name", {
                required: "Name is required",
              })}
              error={errors.name?.message}
            />
            <SelectField
              id="game_id"
              label="Game Type"
              value={watch("game_id")}
              selectClassName="w-50"
              options={games.map((game) => ({
                value: game.id,
                label: game.name,
              }))}
              register={register("game_id", {
                required: "Game Type is required",
              })}
              error={errors.game_id?.message}
            />
            {(() => {
              const gameId = watch("game_id");
              const selectedGame = games.find((g) => g.id == Number(gameId));
              if (selectedGame?.type === "BACCARAT") {
                return (
                  <SelectField
                    id="baccarat_type"
                    label="Baccarat Type"
                    value={watch("baccarat_type")}
                    selectClassName="w-50"
                    options={[
                      { value: "N", label: "N" },
                      { value: "G", label: "G" },
                      { value: "B", label: "B" },
                    ]}
                    register={register("baccarat_type", {
                      required: "Baccarat Type is required",
                    })}
                    error={errors.baccarat_type?.message}
                  />
                );
              }
              return null;
            })()}

            <InputField
              id="desk_no"
              label="Desk Number"
              type="number"
              inputClassName="w-50"
              registerProps={register("desk_no", {
                required: "Desk Number is required",
              })}
              error={errors.desk_no?.message}
            />

            <InputField
              id="position"
              label="Desk Position"
              type="number"
              inputClassName="w-50"
              registerProps={register("position", {
                required: "Desk Position is required",
              })}
              error={errors.position?.message}
            />

            <div className="flex gap-1">
              <Button
                variant="ghost"
                type="button"
                onClick={() => navigate("/admin/desks")}
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
