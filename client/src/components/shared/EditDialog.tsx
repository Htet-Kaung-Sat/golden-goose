import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Description, DialogTitle } from "@radix-ui/react-dialog";
import { useState } from "react";

interface Props {
  open: boolean;
  onConfirm: (payload: { account: string; password: string }) => void;
  onCancel: () => void;
}

export function EditDialog({ open, onConfirm, onCancel }: Props) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setLoading(true);
    Promise.resolve(onConfirm({ account, password })).finally(() =>
      setLoading(false),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="text-center p-5 [&>button]:hidden">
        <DialogTitle />
        <Description />
        <form className="space-y-6">
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 justify-between">
              <span className="text-md sm:text-md md:text-lg">操作员账号</span>
              <input
                value={account}
                type="number"
                onChange={(e) => setAccount(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm shadow-xs"
              />
            </label>

            <label className="flex items-center gap-3 justify-between">
              <span className="text-md sm:text-md md:text-lg">密码</span>
              <input
                value={password}
                type="number"
                onChange={(e) => setPassword(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm shadow-xs"
              />
            </label>
          </div>
        </form>

        <DialogFooter className="flex justify-end gap-6 mt-4">
          <Button
            variant="info"
            onClick={handleConfirm}
            disabled={loading}
            className="text-md sm:text-md md:text-lg px-6 py-3"
          >
            确认
          </Button>

          <Button
            variant="secondary"
            onClick={onCancel}
            className="text-md sm:text-md md:text-lg px-6 py-3"
          >
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
