import { adminLogin } from "@/api/admin/auth";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { TypographyH1 } from "@/components/ui/typographyH1";
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
      className={`min-h-screen flex flex-col items-center justify-center relative text-white ${
        errorDialogOpen || successDialogOpen ? "bg-gray-200" : "bg-[#483e39]"
      }`}
    >
      {!errorDialogOpen && !successDialogOpen && (
        <div className="w-full max-w-lg">
          <TypographyH1 className="mb-6 text-center text-white">
            新金宝
          </TypographyH1>
          <form onSubmit={handleLogin} className="space-y-4 text-left px-6">
            <div className="flex text-white items-center gap-3">
              <Icons.user />
              <Input
                id="account"
                type="text"
                placeholder="帐号"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                required
                className="bg-white text-black"
                autoComplete="false"
              />
            </div>
            <div className="flex text-white items-center gap-3">
              <Icons.lockKeyholeOpen />
              <div className="relative w-full">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white text-black pr-10"
                  autoComplete="false"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <Icons.eye size={20} />
                  ) : (
                    <Icons.eyeOff size={20} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-center mt-12 text-white">
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-6 h-6"
                />
                <span>记住我</span>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-b from-[#e9cf87] to-[#caa452] text-black font-bold mt-6"
            >
              送出
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
