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
    <div className="min-h-screen w-full bg-[url('/images/kinpo.png')] flex items-center justify-center bg-cover bg-center relative text-white bg-no-repeat">
      <div className="text-white text-4xl">
        {steps.map((step, index) => {
          // const isLoading = loadingStep === step;
          const isDone = currentStepIndex > index || loadingStep === "done";
          return (
            <div
              key={step}
              className="mb-2 px-2 shadow-md bg-black/30 bg-opacity-50 min-w-lg flex items-center justify-between"
            >
              <p>{getLoadingStep(step)}</p>
              <div className=" text-right">{isDone ? "OK" : "...载入中"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
