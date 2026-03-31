import { NavLink, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Outlet } from "react-router-dom";
import { UserManagementProvider } from "@/contexts/UserManagementContext";
import { useTranslation } from "react-i18next";

/**
 * User management layout: tabs for basic info, new user, red limit, agent, member, etc., with Outlet.
 */
const UserManagement = () => {
  const location = useLocation();
  const last = location.pathname.split("/").pop() || "basic_information";
  const { t } = useTranslation();

  return (
    <div>
      <Tabs value={last} className="w-full">
        <TabsList className="w-full flex justify-between">
          <TabsTrigger
            asChild
            value="basic_information"
            className="flex-1 text-center"
          >
            <NavLink
              to="basic_information"
              className="block text-center w-full"
            >
              {t("basic_information")}
            </NavLink>
          </TabsTrigger>
          <TabsTrigger asChild value="new_user" className="flex-1 text-center">
            <NavLink to="new_user" className="block text-center w-full">
              {t("new_user")}
            </NavLink>
          </TabsTrigger>
          <TabsTrigger asChild value="agent" className="flex-1 text-center">
            <NavLink to="agent" className="block text-center w-full">
              {t("agent")}
            </NavLink>
          </TabsTrigger>
          <TabsTrigger asChild value="member" className="flex-1 text-center">
            <NavLink to="member" className="block text-center w-full">
              {t("member")}
            </NavLink>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="basic_information" />
        <TabsContent value="new_user" />
        <TabsContent value="agent" />
        <TabsContent value="member" />
      </Tabs>
      <div>
        <UserManagementProvider>
          <Outlet />
        </UserManagementProvider>
      </div>
    </div>
  );
};

export default UserManagement;
