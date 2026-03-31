import { User } from "@/types/User";
import { createContext, useContext, useState } from "react";

interface UserManagementContextProps {
  selected: string;
  setSelected: (value: string) => void;
  commonAccount: string;
  setCommonAccount: (value: string) => void;
  agents: User[];
  setAgents: (value: User[]) => void;
}

const UserManagementContext = createContext<UserManagementContextProps>({
  selected: "",
  setSelected: () => {},
  commonAccount: "",
  setCommonAccount: () => {},
  agents: [],
  setAgents: () => {},
});

export const UserManagementProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [selected, setSelected] = useState<string>("");
  const [commonAccount, setCommonAccount] = useState<string>("");
  const [agents, setAgents] = useState<User[]>([]);
  return (
    <UserManagementContext.Provider
      value={{
        selected,
        setSelected,
        commonAccount,
        setCommonAccount,
        agents,
        setAgents,
      }}
    >
      {children}
    </UserManagementContext.Provider>
  );
};

export const useUserManagement = () => useContext(UserManagementContext);
