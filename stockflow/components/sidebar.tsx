"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  History,
  UploadCloud,
  Wrench,
  CalendarClock,
  Fuel,
  PackageSearch,
  Coffee,
  Bus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./workspace-provider";

const sharedNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/counts", label: "Physical Counts", icon: ClipboardList },
  { href: "/history", label: "Audit History", icon: History },
  { href: "/imports", label: "Import / Export", icon: UploadCloud },
];

const busNav = [
  { href: "/parts", label: "Spare Parts", icon: Wrench },
  { href: "/maintenance", label: "Maintenance", icon: CalendarClock },
  { href: "/fuel", label: "Fuel & Mileage", icon: Fuel },
];

export function Sidebar() {
  const pathname = usePathname();
  const { workspace, setWorkspace } = useWorkspace();

  const navItems = workspace === "bus" ? [...sharedNav, ...busNav] : sharedNav;

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-ink-700 bg-ink text-ink-200">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-300">
          <PackageSearch className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">StockFlow</p>
          <p className="text-xs text-ink-400">Inventory Suite</p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <p className="mb-2 px-1 text-xs font-medium text-ink-500">Workspace</p>
        <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-ink-800 p-1">
          <WorkspaceButton
            active={workspace === "coffee"}
            onClick={() => setWorkspace("coffee")}
            icon={Coffee}
            label="Coffee Shop"
          />
          <WorkspaceButton
            active={workspace === "bus"}
            onClick={() => setWorkspace("bus")}
            icon={Bus}
            label="Bus Fleet"
          />
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-600/90 text-white"
                  : "text-ink-300 hover:bg-ink-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink-700 px-4 py-4">
        <p className="text-xs text-ink-500">
          {workspace === "bus"
            ? "Fleet-specific tools are shown only in this workspace."
            : "Switch workspaces to see fleet tools."}
        </p>
      </div>
    </aside>
  );
}

function WorkspaceButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Coffee;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium transition-colors",
        active ? "bg-ink text-white shadow-sm" : "text-ink-400 hover:text-ink-200"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
