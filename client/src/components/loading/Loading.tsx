export type LoadingStep =
  | "games"
  | "cameras"
  | "player"
  | "desks"
  | "last-two"
  | "last-one"
  | "done";

interface LoadingProps {
  loadingStep: LoadingStep | null;
}

const steps: LoadingStep[] = [
  "games",
  "cameras",
  "player",
  "desks",
  "last-one",
  "last-two",
];

export const Loading: React.FC<LoadingProps> = ({ loadingStep }) => {
  const currentStepIndex = loadingStep ? steps.indexOf(loadingStep) : -1;

  const getLoadingStep = (step: LoadingStep) => {
    switch (step) {
      case "games":
        return "主菜单";
      case "cameras":
        return "多台下注";
      case "player":
        return "单台下注";
      case "desks":
        return "选桌";
      case "last-one":
        return "快速选单";
      case "last-two":
        return "好路指引";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen w-full bg-[url('/images/goose.png')] flex items-center justify-center bg-cover bg-center relative text-white bg-no-repeat">
      <div className="absolute inset-0 bg-green-400/5 backdrop-blur-sm" />
      <div className="text-white w-full max-w-[90%] md:max-w-lg lg:max-w-2xl mx-auto text-xl md:text-3xl lg:text-4xl relative z-10">
        {steps.map((step, index) => {
          // const isLoading = loadingStep === step;
          const isDone = currentStepIndex > index || loadingStep === "done";
          return (
            <div
              key={step}
              className="mb-2 md:mb-3 px-3 md:px-4 py-2 md:py-3 shadow-md bg-black/30 w-full flex items-center justify-between rounded-md backdrop-blur-sm"
            >
              <p>{getLoadingStep(step)}</p>
              <div className="text-right">{isDone ? "OK" : "...载入中"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
