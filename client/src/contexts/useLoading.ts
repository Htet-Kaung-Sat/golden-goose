import { createContext, useContext } from "react";

export interface Action {
  id: string;
  name: string;
}
export interface LoadingContextProps {
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
  actions: Action[];
  balance: string;
  totalBalance: string;
  permission: string;
  updateBalances: (bal: string, total: string, permit: string) => void;
}

export const LoadingContext = createContext<LoadingContextProps>({
  isLoading: false,
  setIsLoading: () => {},
  actions: [],
  balance: "0",
  totalBalance: "0",
  permission: "",
  updateBalances: () => {},
});

export const useLoading = () => useContext(LoadingContext);
