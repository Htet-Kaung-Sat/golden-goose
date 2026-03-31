import { DeskCardTables } from "@/components/shared/CommonCardTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Desk, Game } from "@/types";
import { Icon } from "@iconify/react";
import React from "react";
import BettingBoard from "./BettingBoard";

type ResultTableProps = {
  desk: Desk;
  game: Game;
  onSwapCamera: () => void;
};

const ResultTable: React.FC<ResultTableProps> = ({
  desk,
  game,
  onSwapCamera,
}) => {
  return (
    <div className="w-full">
      <BettingBoard game={game} desk={desk} />

      <div className="flex justify-between h-22">
        <div className="flex items-center gap-2 bg-black h-10 mt-auto w-full">
          <Button
            variant="ghost"
            className="text-white text-3xl"
            onClick={onSwapCamera}
          >
            <Icon icon="lsicon:switch-outline" className="!w-12 !h-12" />
            切换视频
          </Button>
          <Button
            variant="ghost"
            className="text-white text-3xl"
            onClick={onSwapCamera}
          >
            <Icon
              icon="streamline-ultimate:synchronize-refresh-arrow-bold"
              className="!w-8 !h-8"
            />
            刷新视频
          </Button>
        </div>
      </div>

      <Card className="w-full p-0 rounded-none border-none z-5">
        <CardContent className="p-0">
          <div className="flex w-full">
            {desk.game && <DeskCardTables desk={desk} compact={false} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultTable;
