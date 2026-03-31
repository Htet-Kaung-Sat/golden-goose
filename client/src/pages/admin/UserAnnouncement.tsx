import { getAnnounces, operateAnnounces } from "@/api/admin/announce";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import InputField from "@/components/shared/InputField";
import TextareaField from "@/components/shared/TextareaField";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { Announce } from "@/types/Announce";
import { formatLocalDateTime } from "@/utils/DateFormat";
import { UserAnnouncementSchema } from "@/validation/admin/UserAnnouncementSchema";
import { translateError } from "@/validation/messages/translateError";
import { yupResolver } from "@hookform/resolvers/yup";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { InferType } from "yup";
import { getSocket } from "@/lib/socket";

type FormValues = InferType<typeof UserAnnouncementSchema>;

/**
 * User announcement page: form to add/edit announcements (type 1) and data table with edit actions.
 */
const UserAnnouncement = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser = stored ? JSON.parse(stored) : null;
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [formDataCache, setFormDataCache] = useState<FormValues | null>(null);
  const [announces, setAnnounces] = useState<Announce[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorFromResponse,
  } = useAuthGuard();
  const { isLoading, setIsLoading } = useLoading();
  const [refreshKey, setRefreshKey] = useState(0);
  const didFetch = useRef(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const socket = getSocket();

  useEffect(() => {
    if (!didFetch.current) {
      didFetch.current = true;
      const load = async () => {
        try {
          setIsLoading(true);
          const filter = { type: 1 };
          const result = await getAnnounces(filter);
          setAnnounces(result.data.announces);
          setIsLoading(false);
        } catch (error) {
          setErrorFromResponse(error);
          setIsLoading(false);
        }
      };
      load();
    }
  }, [refreshKey, setIsLoading, setErrorFromResponse]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(UserAnnouncementSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      content: "",
    },
  });

  /** Validates form and opens confirm dialog before submit. */
  const onSubmitValidate = (data: FormValues) => {
    setFormDataCache(data);
    setConfirmDialogOpen(true);
  };

  /** Submits create or update to API, then emits socket event for user site and resets form. */
  const onSubmit = async () => {
    setConfirmDialogOpen(false);
    setIsLoading(true);
    if (!formDataCache || !loginUser) {
      return null;
    }
    try {
      setSuccessMessage(
        editingId ? t("ua_success_modify") : t("ua_success_add"),
      );
      const payload =
        editingId && formDataCache
          ? {
              updates: [
                {
                  id: editingId,
                  title: formDataCache.title,
                  content: formDataCache.content,
                  user_id: Number(loginUser.id),
                },
              ],
            }
          : formDataCache
            ? {
                creates: [
                  {
                    title: formDataCache.title,
                    content: formDataCache.content,
                    user_id: Number(loginUser.id),
                    type: 1,
                  },
                ],
              }
            : {};
      if (Object.keys(payload).length === 0) {
        return;
      }
      const response = await operateAnnounces(payload);
      setIsLoading(false);
      if (response.success) {
        setRefreshKey((v) => v + 1); /* Refresh Key for screen reload */
        didFetch.current = false;
        setSuccessDialogOpen(true);
        /* Creating Socket to display at User site title immediately */
        if (socket) {
          const lastData = editingId
            ? payload.updates![0]
            : payload.creates![0];
          socket.emit("user_announcement:change", lastData);
        }
      }
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    } finally {
      reset({ title: "", content: "" });
      setFormDataCache({ title: "", content: "" });
      setEditingId(null);
    }
  };

  /** Loads announcement row into form for editing. */
  const handleEdit = (row: Announce) => {
    setEditingId(Number(row.id));
    reset({
      title: row.title,
      content: row.content,
    });
    setFormDataCache({
      title: row.title,
      content: row.content,
    });
  };

  /** Data table column definitions for user announcements (display like Dashboard). */
  const columns: ColumnDef<Announce>[] = [
    {
      accessorKey: "title",
      header: t("d_title"),
      size: 130,
      cell: ({ row }) => (
        <div className="text-center font-semibold whitespace-pre-wrap">
          {row.original.title ?? ""}
        </div>
      ),
    },
    {
      accessorKey: "content",
      header: t("d_content"),
      size: 300,
      cell: ({ row }) => (
        <div className="text-center px-4 whitespace-pre-wrap">
          {row.original.content ?? ""}
        </div>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: t("d_time"),
      size: 100,
      cell: ({ row }) => {
        return row.original.updatedAt
          ? formatLocalDateTime(String(row.original.updatedAt))
          : "-";
      },
    },
    {
      accessorKey: "actions",
      header: t("common_actions"),
      size: 80,
      cell: ({ row }) => {
        return (
          <div className="flex justify-center gap-2">
            <Button
              onClick={() => {
                handleEdit(row.original);
              }}
            >
              <Icons.pencil />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="mb-5">
        <fieldset disabled={isLoading}>
          <form onSubmit={handleSubmit(onSubmitValidate)} className="space-y-6">
            <div className="flex flex-col gap-4 w-full">
              <div>
                <InputField
                  id="title"
                  label={t("d_title")}
                  type="text"
                  required={true}
                  horizontal={true}
                  registerProps={register("title")}
                  error={translateError(t, "d_title", errors.title)}
                  inputClassName="w-80"
                  placeholder={t("d_title")}
                />
              </div>
              <div>
                <TextareaField
                  id="content"
                  label={t("d_content")}
                  required={true}
                  horizontal={true}
                  registerProps={register("content")}
                  error={translateError(t, "d_content", errors.content)}
                  inputClassName="min-w-[28rem] w-full max-w-3xl h-40 overflow-y-auto"
                  placeholder={t("d_content")}
                />
              </div>
            </div>
            <div />
            <div className="flex justify-start gap-2 mt-4">
              <Button
                variant="info"
                type="submit"
                disabled={isLoading || Object.keys(errors).length > 0}
              >
                {isLoading ? (
                  <Icons.loader2 className="animate-spin" />
                ) : editingId ? (
                  <Icons.pencil />
                ) : (
                  <Icons.save />
                )}
                {editingId ? t("common_update") : t("common_submit")}
              </Button>
              {editingId && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    reset({ title: "", content: "" });
                    setFormDataCache({ title: "", content: "" });
                    setEditingId(null);
                  }}
                >
                  <Icons.undo2 />
                  {t("common_update_cancel")}
                </Button>
              )}
              <Button
                variant="destructive"
                type="button"
                onClick={() => navigate("/admin")}
              >
                <Icons.cross />
                {t("common_destructive")}
              </Button>
            </div>
          </form>
        </fieldset>
        <ConfirmDialog
          open={errorDialogOpen}
          onClose={() => setErrorDialogOpen(false)}
          status="fail"
          message={errorMessage ?? ""}
        />
        <ConfirmDialog
          open={successDialogOpen}
          onClose={() => {
            setSuccessDialogOpen(false);
          }}
          status="success"
          message={successMessage ?? ""}
        />
        <ConfirmDialog
          open={confirmDialogOpen}
          onClose={() => {
            setConfirmDialogOpen(false);
          }}
          onConfirm={onSubmit}
          status="confirm"
        />
      </div>
      <div className="overflow-y-auto">
        <DataTable
          columns={columns}
          data={announces}
          fixedLayout
          getRowId={(row) => Number(row.id)}
        />
      </div>
    </>
  );
};

export default UserAnnouncement;
