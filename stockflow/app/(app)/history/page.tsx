"use client";

import { useEffect, useState } from "react";
import { Search, History as HistoryIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Topbar } from "@/components/topbar";
import { useWorkspace } from "@/components/workspace-provider";
import { formatDateTime } from "@/lib/utils";
import type { AuditLogEntry } from "@/lib/types";

export default function HistoryPage() {
  const { workspace } = useWorkspace();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .eq("workspace", workspace)
        .order("created_at", { ascending: false })
        .limit(100);
      setEntries(data ?? []);
      setLoading(false);
    }
    load();
  }, [workspace]);

  const filtered = entries.filter(
    (e) =>
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      (e.details ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Topbar title="Audit History" description="Every change made in this workspace, most recent first." />

      <div className="p-8">
        <div className="relative mb-4 w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search activity…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="card overflow-hidden">
          <div className="divide-y divide-border">
            {loading && <p className="px-5 py-8 text-center text-sm text-ink-500">Loading…</p>}
            {!loading && filtered.length === 0 && (
              <div className="px-5 py-12 text-center text-ink-500">
                <HistoryIcon className="mx-auto mb-2 h-8 w-8 text-ink-300" />
                No activity found.
              </div>
            )}
            {filtered.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-ink">{entry.action}</p>
                  {entry.details && <p className="text-sm text-ink-500">{entry.details}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-ink-500">{entry.actor}</p>
                  <p className="text-xs text-ink-400">{formatDateTime(entry.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
