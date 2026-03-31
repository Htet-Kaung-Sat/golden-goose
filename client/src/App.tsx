import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { Toaster } from "sonner";
import { lazy, useEffect } from "react";
import { LoadingProvider } from "./contexts/LoadingContext";

// Layouts - keep these eager loaded since they're used immediately
import AdminMain from "./layouts/admin/Main";
import OperatorMain from "./layouts/operator/Main";
import Main from "./layouts/user/Main";

import Error from "./pages/Error";
import LazyRoute from "./components/shared/routes/LazyRoute";
import PageLoader from "./components/loading/PageLoader";
import { setupTabCloseListener } from "./utils/Session";
import { AuthGuardProvider } from "./contexts/AuthGuardProvider";

// Lazy load all page components - Admin
const AdminLogin = lazy(() => import("./pages/admin/Login"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const UserAnnouncement = lazy(() => import("./pages/admin/UserAnnouncement"));
const ChangePassword = lazy(
  () => import("./pages/admin/permission_management/ChangePassword"),
);
const SubAccount = lazy(
  () => import("./pages/admin/permission_management/sub_account"),
);
const SubAccountForm = lazy(
  () => import("./pages/admin/permission_management/sub_account/Form"),
);

// Personnel Management
const UserManagement = lazy(
  () => import("./pages/admin/personnel_management/user_management"),
);
const BasicInformation = lazy(
  () =>
    import("./pages/admin/personnel_management/user_management/BasicInformation"),
);
const NewUser = lazy(
  () => import("./pages/admin/personnel_management/user_management/NewUser"),
);
const Agent = lazy(
  () => import("./pages/admin/personnel_management/user_management/Agent"),
);
const Member = lazy(
  () => import("./pages/admin/personnel_management/user_management/Member"),
);
const UserUpdateLayout = lazy(() => import("./layouts/admin/UserUpdateLayout"));
const TopUp = lazy(
  () => import("./pages/admin/personnel_management/user_management/TopUp"),
);
const ModifyStatus = lazy(
  () =>
    import("./pages/admin/personnel_management/user_management/ModifyStatus"),
);
const UserChangePassword = lazy(
  () =>
    import("./pages/admin/personnel_management/user_management/UserChangePassword"),
);
const RedLimitConfiguration = lazy(
  () =>
    import("./pages/admin/personnel_management/user_management/RedLimitConfiguration"),
);
const AutoSettleWashCode = lazy(
  () =>
    import("./pages/admin/personnel_management/user_management/AutoSettleWashCode"),
);
const AutoSettleRebate = lazy(
  () =>
    import("./pages/admin/personnel_management/user_management/AutoSettleRebate"),
);
const NickName = lazy(
  () => import("./pages/admin/personnel_management/user_management/NickName"),
);
const InfoUpdate = lazy(
  () => import("./pages/admin/personnel_management/user_management/InfoUpdate"),
);
const UserSearch = lazy(
  () => import("./pages/admin/personnel_management/UserSearch"),
);
const PlayerLoginLog = lazy(
  () => import("./pages/admin/personnel_management/PlayerLoginLog"),
);
const AccountInformation = lazy(
  () => import("./pages/admin/personnel_management/AccountInformation"),
);
const OnlinePlayer = lazy(
  () => import("./pages/admin/personnel_management/OnlinePlayer"),
);
const PersonnelManagement = lazy(
  () => import("./pages/admin/personnel_management/PersonnelManagement"),
);

// Report Management
const CodeLookup = lazy(
  () => import("./pages/admin/report_management/CodeLookup"),
);
const SummaryReport = lazy(
  () => import("./pages/admin/report_management/SummaryReport"),
);
const TabletopReport = lazy(
  () => import("./pages/admin/report_management/TabletopReport"),
);
const BootReport = lazy(
  () => import("./pages/admin/report_management/BootReport"),
);
const DailyReport = lazy(
  () => import("./pages/admin/report_management/DailyReport"),
);

// System Management
const OperationLog = lazy(
  () => import("./pages/admin/system_management/OperationLog"),
);

// Customer Service
const CustomerService = lazy(() => import("./pages/admin/CustomerService"));

// Desks
const DeskList = lazy(() => import("./pages/admin/desks"));
const DeskForm = lazy(() => import("./pages/admin/desks/form"));
const DeskDetail = lazy(() => import("./pages/admin/desks/detail"));

// Cameras
const CameraList = lazy(() => import("./pages/admin/cameras"));
const CameraForm = lazy(() => import("./pages/admin/cameras/form"));
const CameraDetail = lazy(() => import("./pages/admin/cameras/detail"));

// Scanners
const ScannerList = lazy(() => import("./pages/admin/scanners"));
const ScannerForm = lazy(() => import("./pages/admin/scanners/form"));
const ScannerDetail = lazy(() => import("./pages/admin/scanners/detail"));

// Game Management
const Recalculate = lazy(
  () => import("./pages/admin/game_management/Recalculate"),
);
const ResultChange = lazy(
  () => import("./pages/admin/game_management/ResultChange"),
);
const DeveloperUserManagement = lazy(
  () => import("./pages/admin/game_management/DeveloperUserManagement"),
);
const RateLimitManagement = lazy(
  () => import("./pages/admin/game_management/RateLimitManagement"),
);

// Operator
const OperatorHome = lazy(() => import("./pages/operator/Home"));
const OperatorLogin = lazy(() => import("./pages/operator/Login"));

// User
const Home = lazy(() => import("./pages/user/Home"));
const Login = lazy(() => import("./pages/user/Login"));

/** Prefetch critical admin routes when the app is idle to avoid loading spinners on navigation. */
function prefetchCriticalAdminRoutes() {
  const scheduleIdle =
    typeof requestIdleCallback !== "undefined"
      ? requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 1);

  scheduleIdle(() => {
    // Prefetch most frequently accessed admin pages
    import("./pages/admin/Dashboard");
    import("./pages/admin/report_management/CodeLookup");
    import("./pages/admin/report_management/SummaryReport");
    import("./pages/admin/report_management/BootReport");
  });
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LazyRoute component={Login} fallback={<PageLoader />} />,
    errorElement: <Error />,
  },
  {
    path: "/",
    element: <Main />,
    errorElement: <Error />,
    children: [
      {
        index: true,
        element: <LazyRoute component={Home} fallback={<PageLoader />} />,
      },
    ],
  },
  {
    path: "/operator/login",
    element: <LazyRoute component={OperatorLogin} />,
    errorElement: <Error />,
  },
  {
    path: "/operator",
    element: (
      <AuthGuardProvider>
        <LoadingProvider>
          <OperatorMain />
        </LoadingProvider>
      </AuthGuardProvider>
    ),
    errorElement: <Error />,
    children: [
      {
        index: true,
        element: <LazyRoute component={OperatorHome} />,
      },
    ],
  },
  {
    path: "/admin/login",
    element: <LazyRoute component={AdminLogin} />,
    errorElement: <Error />,
  },
  {
    path: "/admin",
    element: (
      <AuthGuardProvider>
        <LoadingProvider>
          <AdminMain />
        </LoadingProvider>
      </AuthGuardProvider>
    ),
    errorElement: <Error />,
    children: [
      { index: true, element: <LazyRoute component={Dashboard} /> },
      {
        path: "user_announcement",
        element: <LazyRoute component={UserAnnouncement} />,
      },
      {
        path: "change_password",
        element: <LazyRoute component={ChangePassword} />,
      },
      { path: "sub_account", element: <LazyRoute component={SubAccount} /> },
      {
        path: "sub_account/sub_account_create",
        element: <LazyRoute component={SubAccountForm} />,
      },

      {
        path: "sub_account/:id/sub_account_edit",
        element: <LazyRoute component={SubAccountForm} />,
      },
      {
        path: "user_management",
        element: <LazyRoute component={UserManagement} />,
        children: [
          {
            index: true,
            element: <Navigate to="basic_information" replace />,
          },
          {
            path: "basic_information",
            element: <LazyRoute component={BasicInformation} />,
          },
          { path: "new_user", element: <LazyRoute component={NewUser} /> },
          { path: "agent", element: <LazyRoute component={Agent} /> },
          { path: "member", element: <LazyRoute component={Member} /> },
        ],
      },
      {
        path: "user_management/member/:id",
        element: <LazyRoute component={UserUpdateLayout} />,
        children: [
          { path: "topup", element: <LazyRoute component={TopUp} /> },
          {
            path: "modify_status",
            element: <LazyRoute component={ModifyStatus} />,
          },
          {
            path: "change_password",
            element: <LazyRoute component={UserChangePassword} />,
          },
          {
            path: "bet_limit_config",
            element: <LazyRoute component={RedLimitConfiguration} />,
          },
          {
            path: "auto_settle_wash_code",
            element: <LazyRoute component={AutoSettleWashCode} />,
          },
          {
            path: "auto_settle_rebate",
            element: <LazyRoute component={AutoSettleRebate} />,
          },
          {
            path: "change_name",
            element: <LazyRoute component={NickName} />,
          },
          {
            path: "update_info",
            element: <LazyRoute component={InfoUpdate} />,
          },
        ],
      },
      {
        path: "user_management/agent/:id",
        element: <LazyRoute component={UserUpdateLayout} />,
        children: [
          { path: "topup", element: <LazyRoute component={TopUp} /> },
          {
            path: "modify_status",
            element: <LazyRoute component={ModifyStatus} />,
          },
          {
            path: "change_password",
            element: <LazyRoute component={UserChangePassword} />,
          },
          {
            path: "bet_limit_config",
            element: <LazyRoute component={RedLimitConfiguration} />,
          },
          {
            path: "auto_settle_wash_code",
            element: <LazyRoute component={AutoSettleWashCode} />,
          },
          {
            path: "auto_settle_rebate",
            element: <LazyRoute component={AutoSettleRebate} />,
          },
          {
            path: "change_name",
            element: <LazyRoute component={NickName} />,
          },
          {
            path: "update_info",
            element: <LazyRoute component={InfoUpdate} />,
          },
        ],
      },
      {
        path: "user_search",
        element: <LazyRoute component={UserSearch} />,
      },
      {
        path: "user_search/agent/:id/topup",
        element: <LazyRoute component={TopUp} />,
      },
      {
        path: "user_search/agent/:id/modify_status",
        element: <LazyRoute component={ModifyStatus} />,
      },
      {
        path: "user_search/agent/:id/change_password",
        element: <LazyRoute component={UserChangePassword} />,
      },
      {
        path: "user_search/agent/:id/bet_limit_config",
        element: <LazyRoute component={RedLimitConfiguration} />,
      },
      {
        path: "user_search/agent/:id/auto_settle_wash_code",
        element: <LazyRoute component={AutoSettleWashCode} />,
      },
      {
        path: "user_search/agent/:id/auto_settle_rebate",
        element: <LazyRoute component={AutoSettleRebate} />,
      },
      {
        path: "user_search/agent/:id/change_name",
        element: <LazyRoute component={NickName} />,
      },
      {
        path: "user_search/agent/:id/update_info",
        element: <LazyRoute component={InfoUpdate} />,
      },
      {
        path: "user_search/member/:id/topup",
        element: <LazyRoute component={TopUp} />,
      },
      {
        path: "user_search/member/:id/modify_status",
        element: <LazyRoute component={ModifyStatus} />,
      },
      {
        path: "user_search/member/:id/change_password",
        element: <LazyRoute component={UserChangePassword} />,
      },
      {
        path: "user_search/member/:id/bet_limit_config",
        element: <LazyRoute component={RedLimitConfiguration} />,
      },
      {
        path: "user_search/member/:id/auto_settle_wash_code",
        element: <LazyRoute component={AutoSettleWashCode} />,
      },
      {
        path: "user_search/member/:id/auto_settle_rebate",
        element: <LazyRoute component={AutoSettleRebate} />,
      },
      {
        path: "user_search/member/:id/change_name",
        element: <LazyRoute component={NickName} />,
      },
      {
        path: "user_search/member/:id/update_info",
        element: <LazyRoute component={InfoUpdate} />,
      },
      {
        path: "player_login_log",
        element: <LazyRoute component={PlayerLoginLog} />,
      },
      {
        path: "account_information",
        element: <LazyRoute component={AccountInformation} />,
      },
      {
        path: "online_player",
        element: <LazyRoute component={OnlinePlayer} />,
      },
      {
        path: "personnel_management",
        element: <LazyRoute component={PersonnelManagement} />,
      },
      { path: "code_lookup", element: <LazyRoute component={CodeLookup} /> },
      {
        path: "summary_report",
        element: <LazyRoute component={SummaryReport} />,
      },
      {
        path: "tabletop_report",
        element: <LazyRoute component={TabletopReport} />,
      },
      { path: "boot_report", element: <LazyRoute component={BootReport} /> },
      {
        path: "daily_report",
        element: <LazyRoute component={DailyReport} />,
      },
      {
        path: "operation_log",
        element: <LazyRoute component={OperationLog} />,
      },
      {
        path: "customer_service",
        element: <LazyRoute component={CustomerService} />,
      },
      { path: "desks", element: <LazyRoute component={DeskList} /> },
      { path: "desks/create", element: <LazyRoute component={DeskForm} /> },
      { path: "desks/edit/:id", element: <LazyRoute component={DeskForm} /> },
      { path: "desks/:id", element: <LazyRoute component={DeskDetail} /> },
      { path: "cameras", element: <LazyRoute component={CameraList} /> },
      {
        path: "cameras/create",
        element: <LazyRoute component={CameraForm} />,
      },
      {
        path: "cameras/edit/:id",
        element: <LazyRoute component={CameraForm} />,
      },
      {
        path: "cameras/:id",
        element: <LazyRoute component={CameraDetail} />,
      },
      { path: "recalculate", element: <LazyRoute component={Recalculate} /> },
      {
        path: "result_change",
        element: <LazyRoute component={ResultChange} />,
      },
      {
        path: "developer_user_management",
        element: <LazyRoute component={DeveloperUserManagement} />,
      },
      {
        path: "rate_limit_management",
        element: <LazyRoute component={RateLimitManagement} />,
      },
      { path: "scanners", element: <LazyRoute component={ScannerList} /> },
      {
        path: "scanners/create",
        element: <LazyRoute component={ScannerForm} />,
      },
      {
        path: "scanners/edit/:id",
        element: <LazyRoute component={ScannerForm} />,
      },
      {
        path: "scanners/:id",
        element: <LazyRoute component={ScannerDetail} />,
      },
    ],
  },
]);

function App() {
  useEffect(() => {
    const cleanup = setupTabCloseListener();
    return () => cleanup();
  }, []);

  useEffect(() => {
    prefetchCriticalAdminRoutes();
  }, []);

  return (
    <div>
      <Toaster position="top-right" richColors closeButton />
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
