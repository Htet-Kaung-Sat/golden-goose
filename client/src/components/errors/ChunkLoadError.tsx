import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Icons } from "../ui/icons";

interface ChunkLoadErrorProps {
  redirectTo?: string;
}

/**
 * Shown when a lazy-loaded chunk fails to fetch (e.g. after deployment, network issues).
 * Prompts the user to refresh to get the latest version.
 */
const ChunkLoadError: React.FC<ChunkLoadErrorProps> = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        "min-h-screen bg-green-700 text-white text-center p-6",
      )}
    >
      <div className="space-y-6 max-w-md">
        <h1 className="text-4xl font-bold">Update Required</h1>
        <p className="text-lg">
          A new version of the app is available. Please refresh the page to
          continue.
        </p>
        <p className="text-sm text-white/80">
          If the problem persists, try clearing your browser cache or opening
          the app in a new tab.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button variant="secondary" onClick={handleRefresh}>
            <Icons.refreshCw className="w-5 h-5 mr-2" />
            Refresh Page
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChunkLoadError;
