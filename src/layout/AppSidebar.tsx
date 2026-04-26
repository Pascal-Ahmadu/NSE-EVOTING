"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  BoxIconLine,
  GridIcon,
  GroupIcon,
  PieChartIcon,
  UserCircleIcon,
} from "../icons/index";

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  matchPrefix?: string;
}

const navItems: NavItem[] = [
  { name: "Dashboard", path: "/admin", icon: <GridIcon /> },
  {
    name: "Elections",
    path: "/admin/elections",
    icon: <BoxIconLine />,
    matchPrefix: "/admin/elections",
  },
  { name: "Voters", path: "/admin/voters", icon: <GroupIcon /> },
  { name: "Results", path: "/admin/results", icon: <PieChartIcon /> },
  { name: "Admins", path: "/admin/admins", icon: <UserCircleIcon /> },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const showLabels = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed top-0 left-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-4 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0
        ${isExpanded || isMobileOpen || isHovered ? "w-[260px]" : "w-[80px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Administration sidebar"
    >
      <div
        className={`flex flex-col py-4 ${
          showLabels ? "items-start" : "items-center"
        }`}
      >
        <Link
          href="/admin"
          className="flex items-center"
          aria-label="Nigerian Society of Engineers — Makurdi Branch"
        >
          {showLabels ? (
            <Image
              src="/images/NSE-Logo.png"
              alt="Nigerian Society of Engineers"
              width={400}
              height={120}
              priority
              className="h-12 w-auto"
            />
          ) : (
            <span
              role="img"
              aria-label="Nigerian Society of Engineers"
              className="block h-11 w-11 rounded-xl bg-white ring-1 ring-gray-200 dark:ring-gray-700"
              style={{
                backgroundImage: "url('/images/NSE-Logo.png')",
                backgroundSize: "auto 280%",
                backgroundPosition: "center top",
                backgroundRepeat: "no-repeat",
              }}
            />
          )}
        </Link>
        {showLabels && (
          <div className="mt-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Makurdi Branch
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              2026 Branch Election
            </p>
          </div>
        )}
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto pb-6">
        {showLabels && (
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
            Manage
          </h2>
        )}
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = item.matchPrefix
              ? pathname === item.path ||
                pathname.startsWith(`${item.matchPrefix}/`)
              : pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  aria-current={active ? "page" : undefined}
                  title={showLabels ? undefined : item.name}
                  className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
                    showLabels
                      ? "justify-start px-3 py-2.5"
                      : "h-11 w-11 mx-auto justify-center"
                  } ${
                    active
                      ? "bg-brand-500/10 text-brand-500 dark:bg-brand-500/15"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/3"
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {item.icon}
                  </span>
                  {showLabels && <span>{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default AppSidebar;
