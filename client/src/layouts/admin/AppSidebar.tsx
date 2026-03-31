import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Icons } from "@/components/ui/icons";
import {
  Sidebar,
  SidebarContent,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { TypographyH3 } from "@/components/ui/typographyH3";
import { useLoading } from "@/contexts/useLoading";
import { cn } from "@/lib/utils";
import { User } from "@/types/User";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";

const allMenus = [
  {
    title: "permission_management",
    url: "#",
    items: [
      {
        title: "change_password",
        url: "/admin/change_password",
      },
      {
        title: "sub_account",
        url: "/admin/sub_account",
      },
    ],
  },
  {
    title: "personnel_management1",
    url: "#",
    items: [
      {
        title: "user_management",
        url: "/admin/user_management",
      },
      {
        title: "user_search",
        url: "/admin/user_search",
      },
      {
        title: "player_login_log",
        url: "/admin/player_login_log",
      },
      {
        title: "account_information",
        url: "/admin/account_information",
      },
      {
        title: "online_player",
        url: "/admin/online_player",
      },
      {
        title: "personnel_management",
        url: "/admin/personnel_management",
      },
    ],
  },
  {
    title: "report_management",
    url: "#",
    items: [
      {
        title: "code_lookup",
        url: "/admin/code_lookup",
      },
      {
        title: "summary_report",
        url: "/admin/summary_report",
      },
      {
        title: "tabletop_report",
        url: "/admin/tabletop_report",
      },
      {
        title: "boot_report",
        url: "/admin/boot_report",
      },
      {
        title: "daily_report",
        url: "/admin/daily_report",
      },
    ],
  },
  {
    title: "system_management",
    url: "#",
    items: [
      {
        title: "operation_log",
        url: "/admin/operation_log",
      },
    ],
  },
  {
    title: "customer_service",
    url: import.meta.env.VITE_CUSTOMER_SERVICE_URL,
    isExternal: true,
  },
  {
    title: "game_management",
    url: "#",
    items: [
      {
        title: "desks",
        url: "/admin/desks",
      },
      {
        title: "cameras",
        url: "/admin/cameras",
      },
      {
        title: "recalculate",
        url: "/admin/recalculate",
      },
      {
        title: "result_change",
        url: "/admin/result_change",
      },
      {
        title: "developer_user_management",
        url: "/admin/developer_user_management",
      },
      {
        title: "rate_limit_management",
        url: "/admin/rate_limit_management",
      },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = useMemo(
    () => (stored ? JSON.parse(stored) : null),
    [stored],
  );
  const { permission } = useLoading();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [openSection, setOpenSection] = useState<string | null>(() => {
    const activeGroup = allMenus.find((group) =>
      group.items?.some((sub) => location.pathname.includes(sub.url)),
    );
    return activeGroup ? activeGroup.title : null;
  });
  useEffect(() => {
    if (!location.pathname.includes("user_management")) {
      localStorage.removeItem("upperUserAccount");
    }
  }, [location.pathname]);

  const sidebarItems = useMemo(() => {
    const role = String(loginUser?.role);
    const developerOnlyPaths = [
      "/admin/desks",
      "/admin/cameras",
      "/admin/recalculate",
      "/admin/result_change",
      "/admin/developer_user_management",
      "/admin/rate_limit_management",
    ];
    if (loginUser?.dev_account) {
      return allMenus;
    }
    if (role === "agent") {
      return allMenus
        .map((group) => {
          if (group.items) {
            const filteredSubItems = group.items.filter(
              (subItem) => !developerOnlyPaths.includes(subItem.url),
            );
            return { ...group, items: filteredSubItems };
          }
          return !developerOnlyPaths.includes(group.url) ? group : null;
        })
        .filter(
          (group) => group !== null && (!group.items || group.items.length > 0),
        );
    }
    if (permission && permission.trim() !== "") {
      const allowedPaths = [
        ...permission.split("|").map((p) => `/admin/${p.trim()}`),
        import.meta.env.VITE_CUSTOMER_SERVICE_URL,
      ];

      return allMenus
        .map((group) => {
          if (group.items) {
            const filteredSubItems = group.items.filter((subItem) =>
              allowedPaths.includes(subItem.url),
            );
            return { ...group, items: filteredSubItems };
          }
          return allowedPaths.includes(group.url) ? group : null;
        })
        .filter(
          (group) => group !== null && (!group.items || group.items.length > 0),
        );
    }
    return allMenus.filter((item) => item.title === "customer_service");
  }, [permission, loginUser]);

  const { isMobile, setOpenMobile, setOpen } = useSidebar();

  const handleCloseSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else if (window.innerWidth < 1000) {
      setOpen(false);
    }
  };

  return (
    <Sidebar className={`h-screen overflow-hidden ${!isEn ? "w-50" : "w-70"}`}>
      {/* HEADER */}
      <SidebarHeader className="text-white admin-sidebar sticky top-0 z-10">
        <div className="flex flex-col items-center">
          <div className="py-2 md:py-3">
            <NavLink
              to="/admin"
              onClick={() => {
                setOpenSection(null);
                handleCloseSidebar();
              }}
            >
              <TypographyH3 className="text-[#D8B87A]">
                {t("dashboard")}
              </TypographyH3>
            </NavLink>
          </div>
        </div>
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent className="text-white overflow-y-auto overflow-x-hidden">
        <SidebarGroupContent>
          <SidebarMenu className="py-3">
            {sidebarItems.map((item) => {
              const isOpen = openSection === item?.title;

              return item?.items ? (
                <Collapsible
                  key={item.title}
                  asChild
                  className="group/collapsible"
                  open={isOpen}
                  onOpenChange={(open) => {
                    setOpenSection(open ? item.title : null);
                  }}
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      asChild
                      className="cursor-pointer text-[#FBEBC6]"
                    >
                      <SidebarMenuButton
                        tooltip={item.title}
                        className="py-3 md:py-5 text-base md:text-xl"
                      >
                        <span>{t(item.title)}</span>
                        <Icons.chevronRight
                          className={cn(
                            "ml-auto transition-transform duration-200",
                            isOpen ? "rotate-90" : "",
                          )}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              onClick={handleCloseSidebar}
                              className="py-2 md:py-4 text-sm md:text-base text-[#FBEBC6]"
                            >
                              <NavLink
                                to={subItem.url}
                                onClick={(e) => {
                                  if (
                                    location.pathname === subItem.url ||
                                    location.pathname.startsWith(
                                      subItem.url + "/",
                                    )
                                  ) {
                                    e.preventDefault();
                                  }
                                }}
                                className={({ isActive }) =>
                                  isActive ? "active" : ""
                                }
                              >
                                <span>{t(subItem.title)}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item?.title}>
                  <SidebarMenuButton
                    asChild
                    onClick={() => {
                      setOpenSection(null);
                      handleCloseSidebar();
                    }}
                    className="py-3 md:py-5 text-base md:text-lg text-[#FBEBC6]"
                  >
                    {item?.isExternal ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>{t(String(item?.title))}</span>
                      </a>
                    ) : (
                      <NavLink to={item?.url ?? "#"} end>
                        <span>{t(String(item?.title))}</span>
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarContent>
    </Sidebar>
  );
}
