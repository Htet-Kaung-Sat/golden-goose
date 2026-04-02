import { operatorLogin } from "@/api/operator/operatorAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
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
    <div className="min-h-screen bg-[url('/images/goose.png')] bg-cover bg-center flex items-center justify-center relative">
      <div className="absolute inset-0 bg-green-400/10 backdrop-blur-sm" />
      <Card className="w-full max-w-sm sm:mx-4 mx-2 shadow-xl rounded-2xl relative z-10">
        <CardContent className="px-6 py-3">
          <div className="flex justify-center">
            <img src="/images/logo.png" alt="Logo" className="w-32" />
          </div>
          <span className="w-full block mb-6 text-4xl font-bold text-center text-primary">
            新金鹅
          </span>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex items-center gap-3">
              <Icons.user className="w-10 text-primary" />
              <Input
                id="account"
                type="text"
                value={account}
                className="text-primary"
                onChange={(e) => setAccount(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-3">
              <Icons.lockKeyholeOpen className="w-10 text-primary" />
              <div className="relative w-full">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 text-primary"
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
              <span className="w-10 text-primary">台号</span>
              <Input
                id="desk_no"
                type="number"
                value={deskNo}
                className="text-primary"
                onChange={(e) => setDeskNo(e.target.value)}
                required
              />
            </div>
            {errorMessage && (
              <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
            )}
            <Button
              type="submit"
              className="w-full text-2xl py-6 bg-yellow-600 hover:bg-yellow-500 text-primary font-bold"
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
