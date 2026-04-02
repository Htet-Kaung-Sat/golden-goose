/**
 * Lazy desk card: renders ResultTable (roadmap) only when the card is in the scroll viewport.
 * Use in desk selection panels to avoid expensive canvas roadmap rendering for off-screen desks.
 */

import { useEffect, useRef, useState } from "react";
import ResultTable from "@/components/shared/ResultTable";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Desk } from "@/types";

const DESK_CARD_PLACEHOLDER_MIN_HEIGHT = 140;

export function LazyDeskCard({
  desk,
  onSelect,
  cardClassName,
}: {
  desk: Desk;
  onSelect: () => void;
  cardClassName?: string;
}) {
  const [isInView, setIsInView] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setIsInView(true);
        });
      },
      { rootMargin: "100px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef}>
      <Card
        onClick={onSelect}
        className={cn(
          "bg-gray-800 rounded-sm border border-gray-600 text-white py-0 gap-0 cursor-pointer overflow-hidden",
          "transition-all duration-300 ease-out group",
          "hover:scale-[1.02] hover:border-yellow-500/50 hover:shadow-[0_0_20px_rgba(210,155,36,0.2)]",
          cardClassName,
        )}
      >
        {desk.game && isInView ? (
          <ResultTable desk={desk} />
        ) : (
          <div
            className="flex items-center justify-center px-4 text-yellow-200/80 text-2xl font-medium"
            style={{ minHeight: DESK_CARD_PLACEHOLDER_MIN_HEIGHT }}
          >
            {desk.name}
          </div>
        )}
      </Card>
    </div>
  );
}
