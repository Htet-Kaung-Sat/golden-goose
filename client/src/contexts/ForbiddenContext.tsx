import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { USER_FORBIDDEN_EVENT } from "@/api/axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ForbiddenContextValue = {
  isForbidden: boolean;
  forbiddenMessage: string | null;
};

const ForbiddenContext = createContext<ForbiddenContextValue | null>(null);

export function useForbidden(): ForbiddenContextValue {
  const ctx = useContext(ForbiddenContext);
  if (ctx == null) {
    throw new Error("useForbidden must be used within ForbiddenProvider");
  }
  return ctx;
}

type ForbiddenProviderProps = { children: ReactNode };

/**
 * Listens for 403 FORBIDDEN from API on user pages and shows a blocking overlay
 * with an error dialog. Only action allowed is Reload page.
 */
export function ForbiddenProvider({ children }: ForbiddenProviderProps) {
  const { t } = useTranslation();
  const [isForbidden, setIsForbidden] = useState(false);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      setForbiddenMessage(detail?.message ?? t("dialog_forbidden"));
      setIsForbidden(true);
    };
    window.addEventListener(USER_FORBIDDEN_EVENT, handler);
    return () => window.removeEventListener(USER_FORBIDDEN_EVENT, handler);
  }, [t]);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  const value: ForbiddenContextValue = {
    isForbidden,
    forbiddenMessage,
  };

  return (
    <ForbiddenContext.Provider value={value}>
      {children}
      {isForbidden && (
        <>
          <div
            className="fixed inset-0 z-[9999] bg-black/70"
            aria-hidden
            style={{ pointerEvents: "auto" }}
          />
          <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent
              className="bg-[#3a332f] text-white border-3 border-[#e3c67d] rounded-xl shadow-xl p-0 max-w-sm overflow-hidden z-[10000] [&>button.absolute]:hidden"
              onPointerDownOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader className="bg-black/30 py-4 text-center items-center border-b border-[#e3c67d]">
                <DialogTitle className="text-[#e3c67d] text-lg">
                  {t("dialog_error_title")}
                </DialogTitle>
              </DialogHeader>
              <div className="py-6 text-center px-4">
                <p className="text-xl">{forbiddenMessage ?? t("dialog_forbidden")}</p>
              </div>
              <div className="flex gap-2 p-4">
                <Button
                  className="flex-1 bg-gradient-to-b from-[#e9cf87] to-[#caa452] text-black font-bold"
                  onClick={handleReload}
                >
                  {t("reload_page")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </ForbiddenContext.Provider>
  );
}
