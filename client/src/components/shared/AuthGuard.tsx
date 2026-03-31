import AuthErrorScreen from "@/components/shared/AuthErrorScreen";

type AuthGuardProps = {
  canShowContent: boolean;
  errorDialogOpen: boolean;
  errorMessage: string | null;
  onCloseError: () => void;
  children: React.ReactNode;
};

/**
 * Wraps admin page content: shows children when the user is allowed to view the page,
 * otherwise shows the full-screen auth error (illegal/prohibited) with redirect on close.
 * Use with AuthGuardProvider / useAuthGuard() for consistent auth error handling.
 */
export default function AuthGuard({
  canShowContent,
  errorDialogOpen,
  errorMessage,
  onCloseError,
  children,
}: AuthGuardProps) {
  return (
    <div>
      {canShowContent ? (
        children
      ) : (
        <AuthErrorScreen
          open={errorDialogOpen}
          message={errorMessage ?? ""}
          onClose={onCloseError}
        />
      )}
    </div>
  );
}
