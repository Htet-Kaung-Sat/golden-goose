import { getUsers, updateUser } from "@/api/admin/user";
import { getOnlinePlayers } from "@/api/admin/bet-result";
import DataTable from "@/components/shared/DataTable";
import InputField from "@/components/shared/InputField";
import SelectField from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { OnlinePlayers } from "@/types";
import { User } from "@/types/User";
import { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { getSocket } from "@/lib/socket";
import { AxiosError } from "axios";

/**
 * Online players: list users with login flag, expand to see online players; force offline action.
 */
const OnlinePlayer = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const [users, setUsers] = useState<User[]>([]);
  const [searchAccount, setSearchAccount] = useState<string>("");
  const searchRef = useRef("");
  const [expandedUserId, setExpandedUserId] = useState<number[]>([]);
  const [updateUserId, setUpdateUserId] = useState<number | null>(null);
  const [onlinePlayersMap, setOnlinePlayersMap] = useState<
    Record<number, OnlinePlayers[]>
  >({});
  const [pollingSeconds, setPollingSeconds] = useState<number>(3);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorFromResponse,
  } = useAuthGuard();
  const { setIsLoading } = useLoading();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const dynamicLabelWidth = isEn ? "md:w-15" : "md:w-10";
  const socket = getSocket();

  /** Fetches users with loginFlg and hierarchy for online list. */
  const fetchUserOnlinePlayers = useCallback(async () => {
    try {
      const filters = {
        loginFlg: 1,
        hierarchyMembers: true,
        account: searchRef.current.trim(),
        login_account: loginUser?.account,
        upperestAgent: true,
      };
      const results = await getUsers(filters);
      setUsers(results.data.users);
      setIsLoading(false);
    } catch (error) {
      setUsers([]);
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  }, [loginUser?.account, setErrorFromResponse, setIsLoading]);

  /** Fetches online player details for given user ids. */
  const fetchOnlinePlayers = useCallback(
    async (userIds: number[]) => {
      try {
        const requests = userIds.map((userId) =>
          getOnlinePlayers({ user_id: userId }).then((res) => ({
            userId,
            players: res.data.onlinePlayers,
          })),
        );
        const results = await Promise.all(requests);
        const newMap: Record<number, OnlinePlayers[]> = {};
        results.forEach(({ userId, players }) => {
          newMap[userId] = players;
        });

        setOnlinePlayersMap(newMap);
        setIsLoading(false);
      } catch (error) {
        if (error instanceof AxiosError && error.response?.data) {
          const data = error.response.data as Record<string, unknown>;
          const displayMessage = String(data?.message ?? t("op_error_message"));
          setErrorFromResponse(displayMessage);
        } else {
          setErrorFromResponse(error);
        }
        setIsLoading(false);
      }
    },
    [t, setErrorFromResponse, setIsLoading],
  );

  useEffect(() => {
    fetchUserOnlinePlayers();
  }, [fetchUserOnlinePlayers]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchUserOnlinePlayers();
      if (expandedUserId.length === 0) return;
      fetchOnlinePlayers(expandedUserId);
    }, pollingSeconds * 1000);
    return () => clearInterval(interval);
  }, [
    expandedUserId,
    pollingSeconds,
    fetchUserOnlinePlayers,
    fetchOnlinePlayers,
  ]);

  useEffect(() => {
    if (users.length === 0) return;
    setExpandedUserId(users.map((u) => u.id!).filter(Boolean));
  }, [users]);

  /** Updates search account state and ref. */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchAccount(value);
    searchRef.current = value;
  };

  const sortedData = useMemo(() => {
    return [...users].sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [users]);

  /** Forces user offline via API and socket. */
  const handleConfirmOffline = async (userId: number | null) => {
    if (!userId) return;
    try {
      const result = await updateUser(Number(userId), { login_flg: false });
      if (result.success) {
        fetchUserOnlinePlayers();
        socket.emit("online_player:logout", userId);
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        const displayMessage = String(data?.message ?? t("op_error_message"));
        setErrorFromResponse(displayMessage);
      } else {
        setErrorFromResponse(error);
      }
    }
  };

  const columns: ColumnDef<User>[] = [
    {
      id: "bet_slip",
      header: t("op_search_bet"),
      cell: ({ row }) => {
        const userId = row.original.id;
        if (!userId) {
          return;
        }
        const isExpanded = expandedUserId.includes(userId);
        return (
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              if (isExpanded) {
                setExpandedUserId((prev) => prev.filter((id) => id !== userId));
                setOnlinePlayersMap([]);
              } else {
                setExpandedUserId((prev) => [...prev, userId]);
              }
            }}
          >
            {isExpanded ? t("common_destructive") : t("common_search")}
          </Button>
        );
      },
    },
    {
      accessorKey: "id",
      header: t("op_no"),
    },
    {
      accessorKey: "account",
      header: t("op_account_name"),
    },
    {
      accessorKey: "name",
      header: t("op_full_name"),
    },
    {
      accessorKey: "creator_account",
      header: t("op_parent_agent"),
    },
    {
      accessorKey: "upper_agent",
      header: t("op_master_agent"),
    },
    {
      accessorKey: "balance",
      header: t("op_member_balance"),
    },
    {
      id: "actions",
      header: t("op_operation"),
      cell: ({ row }) => {
        const userId = row.original.id;
        if (!userId) {
          return;
        }
        return (
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setConfirmDialogOpen(true);
              setUpdateUserId(userId);
            }}
          >
            {t("common_offline")}
          </Button>
        );
      },
    },
  ];
  const onlinePlayerColumns: ColumnDef<OnlinePlayers>[] = [
    {
      accessorKey: "desk_session_round",
      header: t("op_order_number"),
    },
    {
      accessorKey: "betting_time",
      header: t("op_bet_time"),
      cell: ({ row }) => (
        <span>
          {dayjs(row.original.betting_time).format("YYYY-MM-DD HH:mm:ss")}
        </span>
      ),
    },
    {
      accessorKey: "betting_area",
      header: t("op_betting_area"),
    },
    {
      accessorKey: "bets",
      header: t("op_betting_amount"),
    },
    {
      accessorKey: "ip",
      header: t("op_ip"),
    },
  ];
  return (
    <div className="space-y-4">
      <div className="flex lg:flex-row flex-col gap-3 mb-4">
        <div>
          <SelectField
            id="identity_id"
            label={t("op_second")}
            labelWidth={dynamicLabelWidth}
            value={pollingSeconds}
            onChange={(val) => setPollingSeconds(Number(val))}
            options={[
              { value: 1, label: "1 " + t("op_second") },
              { value: 3, label: "3 " + t("op_second") },
              { value: 5, label: "5 " + t("op_second") },
              { value: 10, label: "10 " + t("op_second") },
              { value: 15, label: "15 " + t("op_second") },
            ]}
            selectClassName="w-60"
          />
        </div>
        <div>
          <InputField
            id="account"
            label={t("op_account_name")}
            labelWidth={dynamicLabelWidth}
            type="text"
            required={false}
            horizontal={true}
            value={searchAccount}
            onChange={handleSearchChange}
            placeholder={t("op_account_name")}
            inputClassName="w-60"
          />
        </div>
      </div>
      <div>
        <Button variant="info" type="submit" onClick={fetchUserOnlinePlayers}>
          {t("common_search")}
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={sortedData}
        title="在线玩家"
        expandedRowId={expandedUserId}
        getRowId={(user) => user.id ?? ""}
        renderExpandedRow={(user: User) => {
          const dataForThisUser = onlinePlayersMap[user.id!] || [];
          return (
            <DataTable columns={onlinePlayerColumns} data={dataForThisUser} />
          );
        }}
      />
      <ConfirmDialog
        open={errorDialogOpen}
        onClose={() => {
          setErrorDialogOpen(false);
        }}
        status="fail"
        message={errorMessage ?? ""}
      />
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false);
        }}
        onConfirm={() => {
          handleConfirmOffline(updateUserId);
          setConfirmDialogOpen(false);
        }}
        status="confirm"
      />
    </div>
  );
};

export default OnlinePlayer;
