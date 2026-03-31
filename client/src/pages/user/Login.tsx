import { getDeviceInfo } from "@/utils/DeviceInfo";
import { getPublicIp } from "@/utils/PublicIp";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { playerLogin } from "@/api/user/playerAuth";
import { AxiosError } from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { TypographyH1 } from "@/components/ui/typographyH1";
import AgreementDialog from "./AgreementDialog";

const Login = () => {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openAgreement, setOpenAgreement] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedRemember = localStorage.getItem("remember");
    const savedPassword = localStorage.getItem("remember_password");
    if (savedRemember === "true") {
      const savedAccount = localStorage.getItem("remember_account");
      if (savedPassword) setPassword(savedPassword);
      if (savedAccount) setAccount(savedAccount);

      setRemember(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) {
      setErrorMessage("请勾选《我同意》");
      return;
    }
    setErrorMessage(null);

    const { equipment, browser } = getDeviceInfo();
    const ip_address = await getPublicIp();

    try {
      const data = await playerLogin({
        account,
        password,
        equipment,
        browser,
        ip_address,
      });
      sessionStorage.setItem("account", data.account);
      sessionStorage.setItem("name", data.name);
      sessionStorage.setItem("playerID", data.id);

      if (remember) {
        localStorage.setItem("remember", "true");
        localStorage.setItem("remember_account", account);
        localStorage.setItem("remember_password", password);
      } else {
        localStorage.removeItem("remember");
        localStorage.removeItem("remember_account");
        localStorage.removeItem("remember_password");
      }

      // Preload Home chunk so it's ready when navigating to /
      void import("@/pages/user/Home");

      navigate("/");
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        setErrorMessage(error.response?.data?.message || "Login failed");
      } else {
        setErrorMessage("An unexpected error occurred");
      }
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center relative text-white"
      style={{
        backgroundImage: "url('/images/casino_bg.jpg')",
      }}
    >
      <div className="absolute inset-0 bg-black/5 backdrop-blur-sm"></div>

      <div className="relative flex flex-col gap-6 md:gap-5 lg:gap-2 z-10 w-full max-w-lg text-center">
        <img
          src="/images/logo.png"
          alt="Logo"
          className="w-40 mx-auto mb-4 rounded-full"
        />

        <div className="mb-8 relative w-fit mx-auto">
          <TypographyH1
            className="text-4xl lg:text-7xl tracking-widest          
               bg-gradient-to-tl
               from-[#f2b421]
               via-[#e6d48a]
               to-[#b08a2e]

               bg-clip-text 
               text-transparent"
          >
            新金宝
          </TypographyH1>
          <span className="text-xs md:text-sm text-gray-200 block absolute top-2 lg:top-4 -right-24 md:-right-28 whitespace-nowrap">
            PC Version 2.64-W
          </span>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-left px-6">
          <div>
            <div className="relative">
              <Input
                id="account"
                autoComplete="username"
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                required
                className="pl-10 bg-white/10 border border-yellow-500 text-white placeholder:text-gray-300"
              />
              <Icons.user className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400" />
            </div>
          </div>

          <div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 pr-10 bg-white/10 border border-yellow-500 text-white placeholder:text-gray-300"
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

          <div className="flex justify-between items-center mt-4 text-lg md:text-2xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agree}
                onChange={() => setAgree(!agree)}
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
              <span>我同意</span>
            </label>

            <span className="text-center">
              <button
                type="button"
                className="text-red-600 hover:underline"
                onClick={() => setOpenAgreement(true)}
              >
                《服务与条款》
              </button>
            </span>

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
              <span>记住帐号</span>
            </label>
          </div>

          <Button
            type="submit"
            className={cn(
              "w-full mt-4 bg-gradient-to-b from-yellow-400 to-yellow-700 hover:from-yellow-500",
              "hover:to-yellow-800 text-black font-bold py-2 text-lg rounded-md shadow-lg",
            )}
          >
            登录
          </Button>
        </form>

        <div className="text-center mt-10 text-lg md:text-2xl">
          <span
            onClick={() => {
              const url = import.meta.env.VITE_CUSTOMER_SERVICE_URL;
              if (url) window.open(url, "_blank");
            }}
            className="cursor-pointer hover:opacity-80 hover:underline"
          >
            在线客服
          </span>
          <br />
          <span className="block mt-1 text-lg md:text-2xl">
            Copyright © 2023–2035
          </span>
        </div>
      </div>
      <AgreementDialog
        open={openAgreement}
        onClose={() => setOpenAgreement(false)}
      />

      {errorMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <div className="bg-white text-black rounded-xl shadow-2xl p-6 w-80 text-center animate-fadeIn">
            <div className="flex justify-center mb-3">
              <Icons.circleAlert size={40} className="text-red-500" />
            </div>
            <p className="mb-4 text-red-500 text-lg font-semibold">
              {errorMessage}
            </p>
            <Button
              onClick={() => setErrorMessage(null)}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
            >
              确定
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
