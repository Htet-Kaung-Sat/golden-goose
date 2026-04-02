import { isAllowedIframeUrl } from "@/lib/iframe";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

const VideoIframe: React.FC<{ src: string; isGamePlayer?: boolean }> = ({
  src,
  isGamePlayer = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [streamError, setStreamError] = useState(false);

  const allowed = isAllowedIframeUrl(src);
  const mutedSrc =
    allowed && src
      ? src.includes("?")
        ? `${src}&mute=1&showinfo=0&controls=0&autoplay=1`
        : `${src}?mute=1&showinfo=0&controls=0&autoplay=1`
      : "about:blank";

  useEffect(() => {
    setLoading(true);
    setStreamError(false);

    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [src]);

  const showError = streamError || (src && !allowed);

  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden rounded-md ">
      {loading && allowed && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-[url('/images/goose.png')] bg-center bg-cover",
            isGamePlayer ? "bg-[url('/images/casino_table.png')]" : "",
          )}
        >
          <div className="w-8 h-8 border-4 border-yellow-700/30 rounded-full border-t-yellow-500 animate-spin" />
        </div>
      )}
      {showError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="bg-red-600/80 text-white text-sm font-semibold px-3 py-1 rounded-md">
            Stream unavailable
          </div>
        </div>
      )}
      <iframe
        src={mutedSrc}
        allow="encrypted-media"
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="no-referrer"
        onLoad={() => setStreamError(false)}
        onError={() => setStreamError(true)}
        className={cn(
          "absolute inset-0 w-[calc(100%+20px)] h-[calc(100%+20px)] -top-[10px] -left-[10px] pointer-events-none border-none transition-all duration-300",
          loading && allowed ? "opacity-0" : "blur-0 opacity-100",
        )}
      />
    </div>
  );
};

export default VideoIframe;
