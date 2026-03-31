import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Result } from "@/types/Result";
import { formatResultDisplay } from "@/utils/FormatResultDisplay";

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  result: Result;
}

export function ConfirmRecalculateDialog({
  open,
  onConfirm,
  onCancel,
  result,
}: Props) {
  const { displayName, operatorClass, isBankerPair, isPlayerPair } =
    formatResultDisplay(result);

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="w-[350px] text-center p-6">
        <DialogTitle />
        <DialogDescription />

        <div className="flex flex-col justify-center items-center gap-4">
          <div className="relative w-28 h-28 flex justify-center items-center">
            {isBankerPair && (
              <div
                className="absolute w-6 h-6 bg-red-600 rounded-full"
                style={{
                  top: "4px",
                  left: "4px",
                }}
              />
            )}

            {isPlayerPair && (
              <div
                className="absolute w-6 h-6 bg-blue-600 rounded-full"
                style={{
                  bottom: "4px",
                  right: "4px",
                }}
              />
            )}

            <div
              className={cn(
                "w-28 h-28 flex justify-center items-center text-6xl border-4 rounded-full font-bold",
                operatorClass,
              )}
            >
              {displayName}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-6 mt-6">
          <Button onClick={onConfirm} className="text-xl px-6 py-3">
            确认
          </Button>

          <Button
            variant="secondary"
            onClick={onCancel}
            className="text-xl px-6 py-3"
          >
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
