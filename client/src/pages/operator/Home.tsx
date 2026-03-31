import { useLoading } from "@/contexts/useLoading";
import { useFullscreen } from "@/hooks/useFullscreen";
import { Desk } from "@/types";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Niuniu from "./niuniu";
import BaccaratN from "./baccarat_n";
import BaccaratG from "./baccarat_g";
import BaccaratB from "./baccarat_b";
import Longhu from "./longhu";
import { getDesk } from "@/api/operator";

const BASE_W = 1920;
const BASE_H = 1080;

export default function Home() {
  const navigate = useNavigate();
  const { setIsLoading } = useLoading();

  const [scale, setScale] = useState(1);
  const [desk, setDesk] = useState<Desk>();
  const desk_id = sessionStorage.getItem("desk_id");

  useEffect(() => {
    if (!desk_id) {
      navigate("/operator/login");
    }
  }, [desk_id, navigate]);

  // Enters fullscreen on Login success
  useFullscreen();

  /* ---- uniform scale: fit 1920×1080 into any viewport ---- */
  useEffect(() => {
    const fit = () => {
      const scaleX = window.innerWidth / BASE_W;
      const scaleY = window.innerHeight / BASE_H;
      setScale(Math.min(scaleX, scaleY));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    fetchDesk();
  }, []);

  const fetchDesk = async () => {
    if (!desk_id) return;
    try {
      setIsLoading(true);
      const result = await getDesk(Number(desk_id));
      setDesk(result);
    } catch (error) {
      console.error("Error fetching desk", error);
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-black flex items-center justify-center">
      <div
        className="relative shrink-0 origin-center"
        style={{
          width: BASE_W,
          height: BASE_H,
          transform: `scale(${scale})`,
        }}
      >
        {desk?.game?.type === "NIUNIU" && <Niuniu />}
        {desk?.game?.type === "BACCARAT" && (
          <>
            {desk?.baccarat_type === "N" && <BaccaratN />}
            {desk?.baccarat_type === "G" && <BaccaratG />}
            {desk?.baccarat_type === "B" && <BaccaratB />}
          </>
        )}
        {desk?.game?.type === "LONGHU" && <Longhu />}
      </div>
    </div>
  );
}
