import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useLoading } from "@/contexts/useLoading";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useLayoutEffect, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import NavBar from "./Navbar";
import { adminVerify } from "@/api/admin/auth";

/**
 * [SECURITY FIX] Admin layout with auth guard.
 * On mount: if no client-side login hint (loginUser), redirect to /admin/login.
 * Then calls adminVerify() to validate the httpOnly cookie server-side; on 401/403 redirects to login.
 * Renders nothing until verification completes so protected UI is not briefly visible.
 */
const Main = () => {
  const navigate = useNavigate();
  const { isLoading, setIsLoading } = useLoading();
  const location = useLocation();
  const [verifying, setVerifying] = useState(true);

  // Reset loading immediately on route change (before paint) to prevent position jump
  useLayoutEffect(() => {
    setIsLoading(true);
  }, [location.pathname]);

  useEffect(() => {
    // Fast path: no login hint → redirect without waiting for API
    const loginUser = localStorage.getItem("loginUser");
    if (!loginUser) {
      navigate("/admin/login", { replace: true });
      setVerifying(false);
      return;
    }
    adminVerify()
      .then(() => setVerifying(false))
      .catch(() => {
        setVerifying(false);
        // 401 is handled by axios interceptor (handleGlobalLogout); 403 we redirect here
        navigate("/admin/login", { replace: true });
      });
  }, [navigate]);

  if (verifying) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen overflow-hidden">
        <NavBar />
        <main className="flex-1 p-4 mt-16 transition-all duration-300 ease-in-out">
          {isLoading && (
            <div className="flex items-center justify-center overflow-hidden min-h-[calc(90vh-80px)]">
              <div className="w-24 h-24 border-5 border-yellow-600 rounded-full border-t-yellow-800 animate-spin"></div>
            </div>
          )}
          <div className={isLoading ? "hidden" : "block"}>
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Main;
