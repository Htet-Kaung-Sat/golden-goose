import { adminLogin } from "@/api/admin/auth";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { TypographyH1 } from "@/components/ui/typographyH1";
import { cn } from "@/lib/utils";
import { getDeviceInfo } from "@/utils/DeviceInfo";
import { getPublicIp } from "@/utils/PublicIp";
import { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Admin login page component. Renders login form, handles auth, and redirects on success.
 */
const Login = () => {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const navigate = useNavigate();

  /** Restore remembered account from localStorage on mount. */
  useEffect(() => {
    const savedAccount = localStorage.getItem("rememberedAccount");
    if (savedAccount) {
      setAccount(savedAccount);
      setRemember(true);
    }
  }, []);

  /** Submits login form: calls admin API, stores token/user, shows success or error dialog. */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const { equipment, browser } = getDeviceInfo();
    const ip_address = await getPublicIp();

    try {
      const data = await adminLogin({
        account,
        password,
        equipment,
        browser,
        ip_address,
      });
      localStorage.setItem(
        "loginUser",
        JSON.stringify({ ...data, csrfToken: undefined }),
      );
      setSuccessDialogOpen(true);
      if (remember) {
        localStorage.setItem("rememberedAccount", account);
      } else {
        localStorage.removeItem("rememberedAccount");
      }
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        setErrorMessage(error.response?.data?.message || "Login failed");
        setErrorDialogOpen(true);
      } else {
        setErrorMessage("帐号密码错误");
        setErrorDialogOpen(true);
      }
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col bg-[url('/images/goose.png')] bg-cover bg-center items-center justify-center relative text-white ${
        errorDialogOpen || successDialogOpen ? "bg-gray-200" : ""
      }`}
    >
      <div className="absolute inset-0 bg-green-400/10 backdrop-blur-sm" />
      {!errorDialogOpen && !successDialogOpen && (
        <div className="w-full max-w-lg relative z-10">
          <img
            src="/images/logo.png"
            alt="Logo"
            className="w-48 mx-auto mb-4 rounded-full"
          />
          <TypographyH1
            className="text-4xl block mb-12 text-center lg:text-7xl tracking-widest          
               bg-gradient-to-tl
               from-[#f2b421]
               via-[#e6d48a]
               to-[#b08a2e]

               bg-clip-text 
               text-transparent"
          >
            新金鹅
          </TypographyH1>
          <form onSubmit={handleLogin} className="space-y-4 text-left px-6">
            <div>
              <div className="relative">
                <Input
                  id="account"
                  type="text"
                  placeholder="帐号"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  required
                  className="pl-10 py-5 bg-white/10 border border-yellow-500 text-white placeholder:text-gray-300"
                  autoComplete="username"
                />
                <Icons.user className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400" />
              </div>
            </div>

            <div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 py-5 bg-white/10 border border-yellow-500 text-white placeholder:text-gray-300"
                  autoComplete="current-password"
                />
                <Icons.lock className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <Icons.eye size={18} />
                  ) : (
                    <Icons.eyeOff size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-center mt-4 text-lg md:text-2xl text-white">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 md:w-6 md:h-6 appearance-none
                            bg-transparent
                            border
                          border-yellow-400
                            rounded
                            
                          checked:bg-yellow-200
                            checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22currentColor%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M16.707%205.293a1%201%200%20010%201.414l-8%208a1%201%200%2001-1.414%200l-4-4a1%201%200%20011.414-1.414L8%2012.586l7.293-7.293a1%201%200%20011.414%200z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')]
                          checked:border-yellow-500

                            focus:outline-none
                            focus:ring-1
                          focus:ring-yellow-300"
                />
                <span className="text-base md:text-lg">记住我</span>
              </label>
            </div>

            <Button
              type="submit"
              className={cn(
                "w-full mt-4 bg-gradient-to-b from-yellow-400 to-yellow-700 hover:from-yellow-500",
                "hover:to-yellow-800 text-primary font-bold py-6 text-2xl rounded-md shadow-lg",
              )}
            >
              登录
            </Button>
          </form>
        </div>
      )}

      {/* Error Dialog */}
      <ConfirmDialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        message={errorMessage ?? "发生错误，请稍后再试"}
        status="fail"
      />

      {/* Success Dialog */}
      <ConfirmDialog
        open={successDialogOpen}
        onClose={() => {
          setSuccessDialogOpen(false);
          navigate("/admin");
        }}
        message="登录成功"
        status="success"
      />
    </div>
  );
};

export default Login;
