import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type IdleReloadDialogProps = {
  open: boolean;
  onReload: () => void;
};

/**
 * Idle reload dialog: uses Dialog (not AlertDialog). Forced action only (Reload).
 * No close button (built-in X hidden), no ESC/outside dismiss.
 */
export default function IdleReloadDialog({
  open,
  onReload,
}: IdleReloadDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        overlayClassName="bg-black/80"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="flex flex-col items-center text-center bg-black/75 text-white border-3 border-white/20 w-full min-w-[50rem] max-w-6xl rounded-xl shadow-xl p-8 [&>:last-child]:hidden sm:p-10"
      >
        <DialogHeader className="text-center h-36 flex flex-col items-center">
          <DialogTitle className="text-[#e3c67d] text-lg">
            {t("idle_reload_title")}
          </DialogTitle>
          <DialogDescription className="text-white/90">
            {t("idle_reload_message")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 w-full items-center justify-center">
          <Button
            onClick={onReload}
            className=" bg-gradient-to-b from-[#e9cf87] to-[#caa452] text-black font-bold"
          >
            {t("reload_page")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
