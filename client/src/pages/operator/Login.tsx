import { operatorLogin } from "@/api/operator/operatorAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { TypographyH3 } from "@/components/ui/typographyH3";
import { AxiosError } from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [deskNo, setDeskNo] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      const data = await operatorLogin({
        account,
        password,
        desk_no: deskNo,
      });
      sessionStorage.setItem("name", data.name);
      sessionStorage.setItem("desk_id", data.desk_id);
      navigate("/operator");
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        setErrorMessage(error.response?.data?.message || "Login failed");
      } else {
        setErrorMessage("An unexpected error occurred");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm shadow-xl rounded-2xl">
        <CardContent className="p-6">
          <div className="flex justify-center mb-4">
            <img
              src="/images/logo.png"
              alt="Logo"
              className="w-24 rounded-full"
            />
          </div>
          <TypographyH3 className="mb-6 text-center text-yellow-900">
            新金宝
          </TypographyH3>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex items-center gap-3">
              <Icons.user className="w-10" />
              <Input
                id="account"
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-3">
              <Icons.lockKeyholeOpen className="w-10" />
              <div className="relative w-full">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
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
            <div className="flex items-center gap-3">
              <span className="w-10">台号</span>
              <Input
                id="desk_no"
                type="number"
                value={deskNo}
                onChange={(e) => setDeskNo(e.target.value)}
                required
              />
            </div>
            {errorMessage && (
              <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
            )}
            <Button
              type="submit"
              className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold"
            >
              登录
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
