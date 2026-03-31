import AdminPageLoader from "@/components/loading/AdminPageLoader";
import { Suspense } from "react";

// Lazy Route Wrapper Component
export default function LazyRoute({
  component: Component,
  fallback = <AdminPageLoader />,
}: {
  component: React.ComponentType;
  fallback?: React.ReactNode;
}) {
  return (
    <Suspense fallback={fallback}>
      <Component />
    </Suspense>
  );
}
