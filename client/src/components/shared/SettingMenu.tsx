import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSocket } from "@/lib/socket";
import { Icon } from "@iconify/react";
import { operatorLogout } from "@/api/operator/operatorAuth";

interface SettingMenuProps {
  redirectTo?: string; // optional
}

export const SettingMenu: React.FC<SettingMenuProps> = ({
  redirectTo = "/operator/login",
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const socket = getSocket();

  const handleLogout = async () => {
    await operatorLogout();
    localStorage.clear();
    socket.disconnect();
    navigate(redirectTo);
  };

  useEffect(() => {
    const close = () => setOpen(false);
    if (open) window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        <Icon
          icon="solar:settings-bold"
          width="45"
          className="text-[#d29b24] cursor-pointer hover:scale-150 transition-transform"
        />
      </button>

      {open && (
        <div className="absolute right-2 top-16 w-42 bg-white text-black rounded shadow-lg z-50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-100 rounded-md cursor-pointer"
          >
            <Icon
              icon="material-symbols:exit-to-app-rounded"
              width="40"
              className="text-[#d29b24]"
            />
            <div className="text-[#d29b24] text-xl">Logout</div>
          </button>
        </div>
      )}
    </>
  );
};
