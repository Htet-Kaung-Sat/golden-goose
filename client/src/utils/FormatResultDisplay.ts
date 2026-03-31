import { Result } from "@/types/Result";

export const formatResultDisplay = (result: Result) => {
  const key = result?.key || "";

  let displayName = "";
  let color = "";
  let operatorClass = "";

  if (key.includes("supertwoSix") || key.includes("superthreeSix")) {
    displayName = "6";
    color = "red";
    operatorClass = "border-red-600 text-red-600";
  } else if (key.split("|").includes("banker")) {
    displayName = "庄";
    color = "red";
    operatorClass = "border-red-600 text-red-600";
  } else if (key.split("|").includes("player")) {
    displayName = "闲";
    color = "blue";
    operatorClass = "border-blue-600 text-blue-600";
  } else if (key.split("|").includes("tie")) {
    displayName = "和";
    color = "green";
    operatorClass = "border-green-600 text-green-600";
  } else if (key.split("|").includes("dragon")) {
    displayName = "龙";
    color = "red";
    operatorClass = "border-red-600 text-red-600";
  } else if (key.split("|").includes("tiger")) {
    displayName = "虎";
    color = "blue";
    operatorClass = "border-blue-600 text-blue-600";
  }

  const isBankerPair = key.includes("bankerPair");
  const isPlayerPair = key.includes("playerPair");

  return { displayName, color, operatorClass, isBankerPair, isPlayerPair };
};
