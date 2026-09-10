"use client";

import { createContext, useContext } from "react";
import { WorkspaceProvider } from "./workspace-provider";
import { ToastProvider } from "./toast-provider";
import { Sidebar } from "./sidebar";

const UserContext = createContext<string | null>(null);

export function useUserEmail() {
  return useContext(UserContext);
}

export function AppShell({
  userEmail,
  children,
}: {
  userEmail: string | null;
  children: React.ReactNode;
}) {
  return (
    <UserContext.Provider value={userEmail}>
      <ToastProvider>
        <WorkspaceProvider>
          <div className="flex min-h-screen bg-surface-muted">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </WorkspaceProvider>
      </ToastProvider>
    </UserContext.Provider>
  );
}
