import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";

/**
 * A self-contained fullscreen toggle button.
 * Manages its own state and renders a gold expand/minimize icon.
 */
export default function FullscreenToggleButton() {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <button
      onClick={toggleFullScreen}
      className="text-[#d29b24] hover:scale-150 transition-transform"
    >
      <Icon
        icon={isFullscreen ? "flowbite:minimize-outline" : "bx:expand"}
        width="45"
        className="cursor-pointer"
      />
    </button>
  );
}
