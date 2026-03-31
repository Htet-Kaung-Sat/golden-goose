import { Component, type ReactNode } from "react";
import ChunkLoadError from "./ChunkLoadError";

const isChunkLoadError = (error: unknown): boolean => {
  const err = error as { message?: string; name?: string };
  const message = String(err?.message ?? "");
  const name = String(err?.name ?? "");
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("Loading chunk") ||
    message.includes("Loading CSS chunk") ||
    (name === "TypeError" && message.includes("dynamically imported"))
  );
};

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: unknown;
}

/**
 * Root-level error boundary that catches chunk load errors (and other errors)
 * before they reach React Router's default "Unexpected Application Error!" UI.
 * Shows our custom ChunkLoadError page for chunk failures.
 */
export default class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (isChunkLoadError(this.state.error)) {
        return <ChunkLoadError />;
      }
      // For other errors, rethrow so React Router can handle if it's in route context
      // Fallback: show a simple error page
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--main-color)] text-white text-center p-6">
          <h1 className="text-2xl font-bold mb-4">
            A new version of the app is available.
          </h1>
          <p className="mb-6">Please refresh the page to try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white/20 rounded hover:bg-white/30"
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
