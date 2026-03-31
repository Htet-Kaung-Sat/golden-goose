/**
 * AgentTree — Agent hierarchy panel for personnel / user management.
 *
 * Renders a searchable tree of agents (upper → selected → children), loads
 * agent data via API, and notifies the parent via onSearch when the selected
 * account changes. Supports i18n, loading state, and error/prohibited/illegal
 * handling with dialogs and optional redirect.
 */
import "@/assets/css/personnel_management/AgentTree.css";
import { useCallback, useEffect, useRef, useState } from "react";
import InputField from "./InputField";
import { Button } from "../ui/button";
import { checkExistOrNotAgents, getAgentTrees } from "@/api/admin/user";
import ConfirmDialog from "./ConfirmDialog";
import { useUserManagement } from "@/contexts/UserManagementContext";
import { User } from "@/types/User";
import { useTranslation } from "react-i18next";
import { useLoading } from "@/contexts/useLoading";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Props for the AgentTree panel (search callback and list pagination/refresh). */
interface AgentTreePanelProps {
  onSearch: (
    account: string,
    commonPage?: number | undefined,
    commonPageSize?: number | undefined,
  ) => void;
  commonPage?: number | undefined;
  commonPageSize?: number | undefined;
  refreshTrigger?: number;
}

const AgentTree: React.FC<AgentTreePanelProps> = ({
  onSearch,
  commonPage = 0,
  commonPageSize = 0,
  refreshTrigger = 0,
}) => {
  // --- Auth & context ---
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const { setIsLoading } = useLoading();
  const {
    agents,
    setAgents,
    selected,
    setSelected,
    commonAccount,
    setCommonAccount,
  } = useUserManagement();

  // --- Error / permission state ---
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [prohibited, setProhibited] = useState(false);
  const [illegal, setIllegal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const dynamicLabelWidth = isEn ? "md:w-26" : "md:w-16";

  /** Build ancestor chain from root down to (but not including) the given account. */
  const findAncestors = (accountId: string, agents: User[]): User[] => {
    let currentAgent = agents.find((a) => a.account === accountId);
    const path: User[] = [];
    while (currentAgent && currentAgent.creator_account) {
      const parent = agents.find(
        (a) => a.account === currentAgent?.creator_account,
      );
      if (parent && parent.creator_account) {
        path.unshift(parent);
        currentAgent = parent;
      } else {
        break;
      }
    }
    return path;
  };

  /** Get the agent for accountId and its direct children from the flat agents list. */
  const getAgentAndChildren = (
    accountId: string,
    agents: User[],
  ): { current: User | undefined; children: User[] } => {
    const current = agents.find((a) => a.account === accountId);
    const children = agents.filter((a) => a.creator_account === accountId);
    return { current, children };
  };

  // --- Derived tree data for display ---
  const ancestors = findAncestors(selected, agents) ?? [];
  const { current: selectedAgent, children: selectedAgentChildren } =
    getAgentAndChildren(selected, agents);
  const selectedAgentForDisplay = selectedAgent
    ? {
        id: selectedAgent.account,
        children: selectedAgentChildren.map((c) => ({ id: c.account })),
      }
    : undefined;

  const ancestorsForDisplay = ancestors.map((a) => ({ id: a.account }));
  const didFetch = useRef(false);

  /** Load agent tree from API for the given search account. */
  const fetchAgents = useCallback(
    async (searchAccount: string | undefined) => {
      setIsLoading(true);
      try {
        const res = await getAgentTrees({
          account: searchAccount,
        });
        setAgents(res.data.users);
        setIsLoading(false);
      } catch (error) {
        if (error === "prohibited") {
          setProhibited(true);
          setErrorMessage(t("dialog_prohibited"));
        } else if (error === "illegal") {
          setIllegal(true);
          setErrorMessage(t("dialog_illegal"));
        } else if (error instanceof AxiosError) {
          setErrorMessage(error.response?.data?.message ?? String(error));
        } else {
          setErrorMessage(String(error));
        }
        setErrorDialogOpen(true);
        setIsLoading(false);
      }
    },
    [
      setIsLoading,
      setAgents,
      setProhibited,
      setIllegal,
      setErrorDialogOpen,
      setErrorMessage,
      t,
    ],
  );

  /** Set selected account, fetch agents, and call parent onSearch with current pagination. */
  const triggerSearch = useCallback(
    async (accountToSearch: string) => {
      setSelected(accountToSearch);
      setCommonAccount(accountToSearch);
      await fetchAgents(accountToSearch);
      onSearch(accountToSearch, commonPage, commonPageSize);
    },
    [
      commonPage,
      commonPageSize,
      fetchAgents,
      onSearch,
      setCommonAccount,
      setSelected,
    ],
  );

  // --- Initial load: run once with upperUserAccount, selected, or login account ---
  useEffect(() => {
    if (!didFetch.current && loginUser?.account) {
      const initialAccount =
        localStorage.getItem("upperUserAccount") ||
        selected ||
        loginUser.account;
      localStorage.removeItem("upperUserAccount");
      triggerSearch(initialAccount);
      didFetch.current = true;
    }
  }, [commonPage, commonPageSize, loginUser?.account, selected, triggerSearch]);

  // --- Refresh: re-run search when refreshTrigger increments ---
  useEffect(() => {
    if (didFetch.current && refreshTrigger > 0) {
      const initialAccount =
        localStorage.getItem("upperUserAccount") ||
        selected ||
        loginUser?.account;
      if (initialAccount) {
        triggerSearch(initialAccount);
      }
    }
  }, [
    refreshTrigger,
    commonPage,
    commonPageSize,
    loginUser?.account,
    selected,
    triggerSearch,
  ]);

  /** Validate account (checkExistOrNotAgents) then trigger search or show "no data" error. */
  const handleSearchClick = async () => {
    setIsLoading(true);
    if (commonAccount === "") {
      if (loginUser?.account) {
        triggerSearch(loginUser?.account);
      }
      setIsLoading(false);
    } else {
      try {
        const res = await checkExistOrNotAgents({ account: commonAccount });
        if (res.data.users.length > 0) {
          triggerSearch(commonAccount);
        } else {
          setErrorMessage(t("no_data"));
          setErrorDialogOpen(true);
        }
        setIsLoading(false);
      } catch (error) {
        if (error === "prohibited") {
          setProhibited(true);
          setErrorMessage(t("dialog_prohibited"));
        } else if (error === "illegal") {
          setIllegal(true);
          setErrorMessage(t("dialog_illegal"));
        } else if (error instanceof AxiosError) {
          setErrorMessage(t("no_data"));
        } else {
          setErrorMessage(t("no_data"));
        }
        setIsLoading(false);
        setErrorDialogOpen(true);
      }
    }
  };

  return (
    <div>
      {/* Main tree UI when not prohibited/illegal; otherwise show error screen with redirect */}
      {!illegal && !prohibited ? (
        <div className="mt-10">
          {/* Account search input + search button */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 w-full items-stretch sm:items-center">
            <div className="sm:w-auto">
              <InputField
                id="commonAccountInput"
                label={t("at_account")}
                labelWidth={dynamicLabelWidth}
                inputWidth="md:w-50"
                value={commonAccount}
                required={false}
                onChange={(e) => {
                  setCommonAccount(e.target.value);
                }}
              />
            </div>
            <Button
              variant="info"
              size="sm"
              className="w-full sm:w-auto px-0 sm:px-4 py-2"
              onClick={handleSearchClick}
            >
              {t("at_search")}
            </Button>
          </div>

          {/* Ancestors → selected agent → children tree */}
          <div className="w-full overflow-x-auto">
            <div className="flex flex-col items-start">
              {/* Ancestor row: clickable account boxes with vertical connector */}
              {ancestorsForDisplay.map((agent, idx) => (
                <div
                  key={agent.id}
                  className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                  <div className="flex flex-col items-start">
                    <div
                      onClick={() => triggerSearch(String(agent.id))}
                      className={cn(
                        "cursor-pointer rounded-md border px-6 py-2 text-sm font-medium w-full break-all",
                        selected === agent.id
                          ? "border-red-500 text-red-500"
                          : "border-gray-400",
                      )}
                    >
                      {agent.id}
                    </div>

                    {idx < ancestorsForDisplay.length && (
                      <div className="sm:ml-25 ml-12 h-6 w-px bg-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Currently selected agent (highlighted when selected) */}
            {selectedAgentForDisplay && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div
                  onClick={() =>
                    triggerSearch(String(selectedAgentForDisplay.id))
                  }
                  className={cn(
                    "cursor-pointer rounded-md border px-6 py-2 text-sm font-medium w-full break-all",
                    selected === selectedAgentForDisplay.id
                      ? "border-red-500 text-red-500"
                      : "border-gray-400",
                  )}
                >
                  {selectedAgentForDisplay.id}
                </div>
              </div>
            )}

            {/* Child agents in a horizontal row with tree connector */}
            {selectedAgentChildren.length > 0 && (
              <div className="flex flex-row sm:ml-24 ml-11">
                <div className="h-10 w-6 shrink-0 border-b border-l border-gray-400 rounded-bl-xl translate-x-1" />
                <div className="mt-5 pl-1 w-full">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {selectedAgentChildren.map((child) => (
                      <div
                        key={child.account}
                        onClick={() => triggerSearch(String(child.account))}
                        className={cn(
                          "cursor-pointer rounded-md border px-4 py-2 text-center text-sm font-medium break-all",
                          selected === child.account
                            ? "border-red-500 text-red-500"
                            : "border-gray-400",
                        )}
                      >
                        {child.account}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Generic error dialog; on close resets account and re-triggers search with login account */}
          <ConfirmDialog
            open={errorDialogOpen}
            onClose={() => {
              setErrorDialogOpen(false);
              setCommonAccount("");
              if (loginUser?.account) {
                setSelected(loginUser?.account);
              }
              triggerSearch(String(loginUser?.account));
            }}
            status="fail"
            message={errorMessage ?? ""}
          />
        </div>
      ) : (
        <div
          className={`min-h-screen flex flex-col items-center justify-center relative text-white ${
            errorDialogOpen ? "bg-gray-200" : "bg-[#483e39]"
          }`}
        >
          {/* Prohibited/illegal: full-screen message + dialog; close navigates to /admin */}
          <ConfirmDialog
            open={errorDialogOpen}
            onClose={() => {
              setErrorDialogOpen(false);
              navigate("/admin");
            }}
            status="fail"
            message={errorMessage ?? ""}
          />
        </div>
      )}
    </div>
  );
};

export default AgentTree;
