import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import checkFill from "@iconify/icons-mingcute/check-fill";
import closeFill from "@iconify/icons-mingcute/close-fill";
import { Icon } from "@iconify/react";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import * as React from "react";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  message?: string;
  title?: string;
  status: "success" | "fail" | "error" | "confirm";
};

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  message,
  title,
  status,
}: ConfirmDialogProps) => {
  const { t } = useTranslation();
  const clickLock = React.useRef(false);

  React.useEffect(() => {
    if (open) {
      clickLock.current = false;
    }
  }, [open]);

  const handleConfirm = async () => {
    if (clickLock.current) return;
    clickLock.current = true;

    if (onConfirm) {
      try {
        await onConfirm();
      } finally {
        // We do not eagerly unlock here because the dialog might be closing.
        // The lock is reset when the dialog opens again.
      }
    } else {
      onClose();
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (status) {
      case "success":
        return t("dialog_success_title");
      case "fail":
        return t("dialog_error_title");
      case "error":
        return t("dialog_error_title");
      case "confirm":
        return t("dialog_confirm_title");
      default:
        return t("dialog_confirm_title");
    }
  };
  const getMessage = () => {
    switch (status) {
      case "confirm":
        if (message) return message;
        return t("dialog_confirm_message");
      default:
        return message;
    }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#3a332f] text-white border-3 border-[#e3c67d] rounded-xl shadow-xl p-0 max-w-sm overflow-hidden">
        <DialogHeader className="bg-black/30 py-4 text-center items-center border-b border-[#e3c67d]">
          <DialogTitle className="text-[#e3c67d] text-lg">
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="sr-only">{message}</DialogDescription>
        </DialogHeader>

        <div className="py-6 text-center justify-center">
          <div className="flex justify-center">
            {status === "success" && <Icon icon={checkFill} width={60} />}
            {(status === "fail" || status === "error") && (
              <Icon icon={closeFill} width={60} />
            )}
          </div>
          <p className="text-xl">{getMessage()}</p>
        </div>

        <DialogFooter className="flex gap-2 p-4">
          {(status === "success" ||
            status === "fail" ||
            status === "error") && (
            <Button
              className="flex-1 bg-gradient-to-b from-[#e9cf87] to-[#caa452] text-black font-bold"
              onClick={handleConfirm}
            >
              {t("dialog_only_confirm")}
            </Button>
          )}

          {status === "confirm" && (
            <>
              <Button
                className="flex-1 bg-gradient-to-b from-[#e9cf87] to-[#caa452] text-black font-bold"
                onClick={handleConfirm}
              >
                {t("dialog_confirm")}
              </Button>

              <Button
                className="flex-1 bg-red-600 hover:bg-red-600 text-white font-bold"
                onClick={onClose}
              >
                {t("dialog_cancel")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
