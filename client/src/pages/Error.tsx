import ChunkLoadError from "@/components/errors/ChunkLoadError";
import Error404 from "@/components/errors/Error404";
import { useLocation, useRouteError } from "react-router-dom";

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

const Error = () => {
  const error = useRouteError();
  const location = useLocation();
  const isAdminRoute = location.pathname.includes("admin");
  const redirectTo = isAdminRoute ? "/admin" : "/";

  if (isChunkLoadError(error)) {
    return <ChunkLoadError />;
  }

  return <Error404 redirectTo={redirectTo} />;
};

export default Error;
