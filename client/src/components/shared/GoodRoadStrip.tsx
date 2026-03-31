import React from "react";

interface GoodRoadStripProps {
  patternType: string;
  className?: string;
}

export const GoodRoadStrip: React.FC<GoodRoadStripProps> = ({
  patternType,
  className = "",
}) => (
  <div
    className={`absolute w-45 bottom-0 right-0 opacity-80 min-h-[26px] overflow-hidden flex items-center justify-end ${className}`}
  >
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(90deg,rgba(255, 255, 255, 1) 0%, #00BD4F 50%, rgba(0, 168, 70, 1) 100%)",
      }}
    />
    <span className="mr-2 text-white text-2xl font-bold drop-shadow-md text-shadow-lg/100">
      {patternType}
    </span>
  </div>
);
