"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Workspace } from "@/lib/types";

interface WorkspaceContextValue {
  workspace: Workspace;
  setWorkspace: (w: Workspace) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const STORAGE_KEY = "stockflow.workspace";

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspaceState] = useState<Workspace>("coffee");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "coffee" || stored === "bus") {
      setWorkspaceState(stored);
    }
    setHydrated(true);
  }, []);

  function setWorkspace(w: Workspace) {
    setWorkspaceState(w);
    window.localStorage.setItem(STORAGE_KEY, w);
  }

  // Avoid a flash of the wrong workspace before localStorage is read.
  if (!hydrated) return null;

  return (
    <WorkspaceContext.Provider value={{ workspace, setWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
