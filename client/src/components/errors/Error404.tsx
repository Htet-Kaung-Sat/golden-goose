import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Icons } from "../ui/icons";

interface Error404Props {
  redirectTo?: string;
}

const Error404: React.FC<Error404Props> = ({ redirectTo = "/" }) => {
  const [counter, setCounter] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    if (counter === 0) {
      navigate(redirectTo);
    }

    const timer = setInterval(() => {
      setCounter((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [counter, navigate, redirectTo]);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        "min-h-screen bg-[var(--main-color)] text-white text-center p-6",
      )}
    >
      <img
        src="/images/astronaut.png"
        alt="Error404"
        className="absolute top-4 right-4 w-60 h-auto"
      />
      <div className="space-y-4">
        <div className="relative z-10 space-y-4">
          <h1 className="text-8xl font-bold">404</h1>
          <p className="text-xl">
            Oops! Your page is currently under maintenance.
          </p>
          <p className="text-md">
            Redirecting to the homepage in <strong>{counter}</strong> seconds.
          </p>
          <Button variant="secondary" onClick={() => navigate(redirectTo)}>
            <Icons.undo2 className="w-5 h-5" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Error404;
