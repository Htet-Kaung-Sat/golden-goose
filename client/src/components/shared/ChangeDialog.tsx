import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ChangePayload {
  moper: string;
  hander: string;
  monitor: string;
  cutter: string;
  shuffle_type: string;
  card_color: string;
}
interface Props {
  open: boolean;
  onConfirm: (payload: ChangePayload) => void;
  onCancel: () => void;
}

export function ChangeDialog({ open, onConfirm, onCancel }: Props) {
  const [moper, setMoper] = useState("");
  const [hand, setHand] = useState("");
  const [monitor, setMonitor] = useState("");
  const [cutter, setCutter] = useState("");
  const [shuffle, setShuffle] = useState("");
  const [color, setColor] = useState("red");

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="text-center p-5 [&>button]:hidden">
        <form className="space-y-1">
          <div className="grid grid-cols-1 gap-2 text-sm sm:text-sm md:text-md lg:text-lg">
            <label className="flex items-center justify-between">
              <span className="text-md">摸牌人</span>
              <input
                value={moper}
                onChange={(e) => setMoper(e.target.value)}
                className="border rounded-md px-3 py-1 sm:py-1.5 md:py-2 text-sm shadow-xs"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-md">牌手</span>
              <input
                value={hand}
                onChange={(e) => setHand(e.target.value)}
                className="border rounded-md px-3 py-1 sm:py-1.5 md:py-2 text-sm shadow-xs"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-md">监台</span>
              <input
                value={monitor}
                onChange={(e) => setMonitor(e.target.value)}
                className="border rounded-md px-3 py-1 sm:py-1.5 md:py-2 text-sm shadow-xs"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-md">切牌人</span>
              <input
                value={cutter}
                onChange={(e) => setCutter(e.target.value)}
                className="border rounded-md px-3 py-1 sm:py-1.5 md:py-2 text-sm shadow-xs"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-md">洗牌方式</span>
              <input
                value={shuffle}
                onChange={(e) => setShuffle(e.target.value)}
                className="border rounded-md px-3 py-1 sm:py-1.5 md:py-2 text-sm shadow-xs"
              />
            </label>

            <div className="flex items-center justify-between">
              <span className="text-md">牌色</span>

              <div className="flex items-center gap-6 text-2xl">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="color"
                    value="red"
                    checked={color === "red"}
                    onChange={() => setColor("red")}
                  />
                  <span className="px-3 py-1 rounded bg-gray-100 text-sm">
                    红牌
                  </span>
                </label>

                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="color"
                    value="blue"
                    checked={color === "blue"}
                    onChange={() => setColor("blue")}
                  />
                  <span className="px-3 py-1 rounded bg-gray-100 text-sm">
                    蓝牌
                  </span>
                </label>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="flex justify-end gap-6 mt-2">
          <Button
            variant="info"
            onClick={() =>
              onConfirm({
                moper,
                hander: hand,
                monitor,
                cutter,
                shuffle_type: shuffle,
                card_color: color,
              })
            }
            className="text-sm sm:text-sm md:text-md lg:text-lg px-6 py-3"
          >
            确认
          </Button>

          <Button
            variant="secondary"
            onClick={onCancel}
            className="text-sm sm:text-sm md:text-md lg:text-lg px-6 py-3"
          >
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
