import { useEffect, useState } from "react";

/**
 * Modern Hook for 1920x1080 Scaling & Right-Click Protection
 */
export const useScaleLayout = (baseWidth = 1920, baseHeight = 1080) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const scaleWidth = window.innerWidth / baseWidth;
      const scaleHeight = window.innerHeight / baseHeight;
      setScale(Math.min(scaleWidth, scaleHeight));
    };

    const preventDefault = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", preventDefault);

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("contextmenu", preventDefault);
    };
  }, [baseWidth, baseHeight]);

  return scale;
};
