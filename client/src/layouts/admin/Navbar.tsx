import ConfirmDialog from "@/components/shared/ConfirmDialog";
import SelectField from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useLoading } from "@/contexts/useLoading";
import { cn } from "@/lib/utils";
import { User } from "@/types/User";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

const Navbar = () => {
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const { open: isSidebarOpen } = useSidebar();
  const navigate = useNavigate();
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const { balance, totalBalance } = useLoading();

  const { t, i18n } = useTranslation();
  const isEng = i18n.language === "en";
  const leftClassOpen = isEng ? "left-[17.4rem]" : "left-[12.4rem]";
  const leftClassClose = "left-[0rem]";
  const toggleLanguage = (value: string) => {
    i18n.changeLanguage(value);
  };

  const location = useLocation();
  const getCurrentScreenName = () => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    return lastSegment ? t(lastSegment) : "";
  };
  const isEn = i18n.language === "en";
  const popUpWidth = isEn ? "w-40" : "w-28";
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      setSuccessDialogOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-40 bg-green-900 text-white flex items-center gap-4 px-4",
          "transition-[left] duration-400 ease-in-out",
          isSidebarOpen ? leftClassOpen : leftClassClose,
          "h-16 border-b-0 md:border-b-4 md:border-b-[#ae854d]",
        )}
      >
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <span className="text-xl font-bold text-[#e3c67d] ml-2">
            {getCurrentScreenName()}
          </span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex flex-col text-right text-white text-sm">
              <span>{t("balance")}</span>
              <span>{balance}</span>
            </div>
            <div className="flex flex-col text-right text-white text-sm">
              <span>{t("total_balance")}</span>
              <span>{totalBalance}</span>
            </div>
            <SelectField
              id="language"
              label=""
              labelSize="text-sm"
              options={[
                { value: "zh", label: "CHN" },
                { value: "en", label: "ENG" },
              ]}
              required={true}
              selectWidth="w-full"
              onChange={toggleLanguage}
              value={i18n.language}
              selectClassName="hidden sm:flex text-black bg-white h-8 text-xs cursor-pointer"
            />
          </div>

          <div className={cn(`relative group`)}>
            <Button
              onClick={() => setOpen((prev) => !prev)}
              className={cn(
                `flex items-center gap-2 text-primary bg-yellow-500 p-1.5 rounded-sm hover:bg-yellow-600`,
              )}
            >
              <Icons.user size={20} />
              <span>
                {loginUser?.dev_account
                  ? loginUser.dev_account.length > 10
                    ? `${loginUser.dev_account.slice(0, 7)}...`
                    : loginUser.dev_account
                  : loginUser?.login_account &&
                      loginUser.login_account.length > 10
                    ? `${loginUser.login_account.slice(0, 7)}...`
                    : loginUser?.login_account}
              </span>
            </Button>

            {open && (
              <div
                ref={popupRef}
                className={cn(
                  `absolute top-full right-0 mt-1 ${popUpWidth}`,
                  "bg-yellow-500 shadow z-50 rounded-md",
                )}
              >
                <Button
                  onClick={() => {
                    navigate("/admin/change_password");
                    setOpen(false);
                  }}
                  className="w-full px-4 py-3 rounded-b text-primary text-left bg-yellow-500 hover:bg-yellow-600"
                >
                  {t("change_password")}
                </Button>

                <Button
                  onClick={() => {
                    handleLogout();
                    setOpen(false);
                  }}
                  className="w-full px-4 py-3 rounded-t-none text-primary text-left bg-yellow-500 hover:bg-yellow-600"
                >
                  {t("sign_out")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="sm:hidden sticky w-full top-14 z-30 bg-green-900 text-white flex items-center px-8 h-14 border-b-4 border-b-[#ae854d]">
        <div className="flex flex-1 items-center justify-between gap-10">
          <div className="flex flex-col text-sm">
            <span>{t("balance")}</span>
            <span>{balance}</span>
          </div>
          <div className="flex flex-col text-sm">
            <span>{t("total_balance")}</span>
            <span>{totalBalance}</span>
          </div>
          <SelectField
            id="language"
            label=""
            labelSize="text-sm"
            options={[
              { value: "zh", label: "CHN" },
              { value: "en", label: "ENG" },
            ]}
            required
            selectWidth="w-full"
            onChange={toggleLanguage}
            value={i18n.language}
            selectClassName="text-black bg-white h-8 text-xs"
          />
        </div>
      </div>

      <ConfirmDialog
        open={successDialogOpen}
        onClose={async () => {
          Object.keys(localStorage).forEach((key) => {
            if (key !== "rememberedAccount") {
              localStorage.removeItem(key);
            }
          });
          i18n.changeLanguage("zh");
          setSuccessDialogOpen(false);
          navigate("/admin/login");
        }}
        message={t("logout_success")}
        status="success"
      />
    </>
  );
};

export default Navbar;
