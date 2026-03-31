"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState } from "react";

type ErrorTooltipProps = {
  error?: string;
  children: React.ReactNode;
};

export default function ErrorTooltip({ error, children }: ErrorTooltipProps) {
  const [isHover, setIsHover] = useState(false);
  const [maxWidth, setMaxWidth] = useState<number>(300);
  useEffect(() => {
    /* Making line break when error character length greater than window length */
    const updateWidth = () => {
      setMaxWidth(window.innerWidth * 0.8);
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);
  const showTooltip = !!error && isHover;

  return (
    <Tooltip open={showTooltip}>
      <TooltipTrigger
        asChild
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
      >
        {children}
      </TooltipTrigger>

      {error && (
        <TooltipContent
          side="top"
          sideOffset={2}
          align="end"
          style={{ maxWidth }}
          className="
            pointer-events-none
            backdrop-blur-md
            bg-destructive
            border border-[red]
            text-white
            px-3 py-1.5
            rounded-lg
            text-sm
            shadow-md
            w-auto
            break-words
          "
        >
          {error}
        </TooltipContent>
      )}
    </Tooltip>
  );
}
