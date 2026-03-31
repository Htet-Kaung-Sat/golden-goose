import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  operatorVerify,
  setupOperatorUnloadListener,
} from "@/api/operator/operatorAuth";
import { useLoading } from "@/contexts/useLoading";

/**
 * [SECURITY FIX] Operator layout with auth guard.
 * On mount: if no session hint (desk_id), redirect to /operator/login.
 * Then calls operatorVerify() to validate the httpOnly cookie server-side; on 401/403 redirects to login.
 * Renders nothing until verification completes so protected UI is not briefly visible.
 */
const Main = () => {
  const navigate = useNavigate();
  const { isLoading } = useLoading();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    let teardown: (() => void) | undefined;
    const deskId = sessionStorage.getItem("desk_id");
    if (!deskId) {
      navigate("/operator/login", { replace: true });
      setVerifying(false);
      return;
    }
    operatorVerify()
      .then(() => {
        setVerifying(false);
        teardown = setupOperatorUnloadListener();
      })
      .catch(() => {
        setVerifying(false);
        // 401 is handled by axios interceptor (handleGlobalLogout); 403 we redirect here
        navigate("/operator/login", { replace: true });
      });
    return () => {
      teardown?.();
    };
  }, [navigate]);

  if (verifying) {
    return null;
  }

  return (
    <div>
      <main className="relative min-h-screen select-none">
        <div className={isLoading ? "blur-xs pointer-events-none" : ""}>
          <Outlet />
        </div>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-24 h-24 border-5 border-yellow-600 rounded-full border-t-yellow-800 animate-spin"></div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Main;
