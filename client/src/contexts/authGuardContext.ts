import { createContext, useContext } from "react";

export type AuthGuardContextValue = {
  errorMessage: string | null;
  errorDialogOpen: boolean;
  setErrorDialogOpen: (open: boolean) => void;
  setErrorMessage: (msg: string | null) => void;
  setErrorFromResponse: (error: unknown) => void;
  handleCloseErrorDialog: () => void;
  canShowContent: boolean;
};

export const AuthGuardContext = createContext<AuthGuardContextValue | null>(
  null,
);

export function useAuthGuard(): AuthGuardContextValue {
  const ctx = useContext(AuthGuardContext);
  if (ctx == null) {
    throw new Error("useAuthGuard must be used within AuthGuardProvider");
  }
  return ctx;
}
