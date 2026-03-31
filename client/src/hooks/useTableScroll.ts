import { useEffect, useLayoutEffect, useRef } from "react";
import { Result } from "@/types/Result";

export const useTableScroll = (results: Result[]) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to right when results change
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const frameId = requestAnimationFrame(() => {
      const { scrollWidth, clientWidth } = el;
      el.scrollTo({
        left: scrollWidth - clientWidth,
        behavior: "smooth",
      });
    });

    return () => cancelAnimationFrame(frameId);
  }, [results]);

  // Mouse drag scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      el.classList.add("cursor-grabbing");
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };

    const stopDragging = () => {
      isDown = false;
      el.classList.remove("cursor-grabbing");
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener("mousedown", handleMouseDown);
    el.addEventListener("mouseleave", stopDragging);
    el.addEventListener("mouseup", stopDragging);
    el.addEventListener("mousemove", handleMouseMove);

    return () => {
      el.removeEventListener("mousedown", handleMouseDown);
      el.removeEventListener("mouseleave", stopDragging);
      el.removeEventListener("mouseup", stopDragging);
      el.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return scrollRef;
};
