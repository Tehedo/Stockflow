"use client";

import { LogOut } from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { useUserEmail } from "./app-shell";
import { WORKSPACE_LABEL } from "@/lib/types";

export function Topbar({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const { workspace } = useWorkspace();
  const userEmail = useUserEmail();

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-8 py-5">
      <div>
        <p className="text-xs font-medium text-brand-600">{WORKSPACE_LABEL[workspace]}</p>
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
      </div>

      <div className="flex items-center gap-3">
        {actions}
        <div className="mx-1 h-6 w-px bg-border" />
        <div className="text-right">
          <p className="text-sm font-medium text-ink">{userEmail ?? "Admin User"}</p>
          <p className="text-xs text-ink-400">Admin & staff</p>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-lg p-2 text-ink-400 hover:bg-surface-subtle hover:text-ink"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
