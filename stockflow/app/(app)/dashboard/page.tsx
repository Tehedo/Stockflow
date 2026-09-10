"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Package,
  AlertTriangle,
  AlertOctagon,
  Activity,
  Wrench,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";
import { StockStatusBadge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/workspace-provider";
import { formatNumber, relativeTime, getStockStatus } from "@/lib/utils";
import type { InventoryItem, AuditLogEntry, MaintenanceSchedule } from "@/lib/types";

export default function DashboardPage() {
  const { workspace } = useWorkspace();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [activity, setActivity] = useState<AuditLogEntry[]>([]);
  const [maintenanceDue, setMaintenanceDue] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [itemsRes, activityRes] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("*")
        .eq("workspace", workspace)
        .order("quantity", { ascending: true }),
      supabase
        .from("audit_log")
        .select("*")
        .eq("workspace", workspace)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    setItems(itemsRes.data ?? []);
    setActivity(activityRes.data ?? []);

    if (workspace === "bus") {
      const { data } = await supabase
        .from("maintenance_schedules")
        .select("*")
        .neq("status", "Completed")
        .order("priority", { ascending: false })
        .limit(4);
      setMaintenanceDue(data ?? []);
    } else {
      setMaintenanceDue([]);
    }

    setLoading(false);
  }, [workspace]);

  useEffect(() => {
    load();
  }, [load]);

  // Live-update KPIs when inventory changes from any tab/device.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-inventory")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const lowStock = items.filter((i) => getStockStatus(i.quantity, i.reorder_point) === "Low Stock");
  const critical = items.filter((i) => getStockStatus(i.quantity, i.reorder_point) === "Critical");
  const attention = [...critical, ...lowStock].slice(0, 6);

  return (
    <div>
      <Topbar title="Dashboard" description="Live overview of stock health and recent activity." />

      <div className="space-y-6 p-8">
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${workspace === "bus" ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          <StatCard label="Tracked Items" value={String(items.length)} icon={Package} tone="brand" />
          <StatCard
            label="Low Stock"
            value={String(lowStock.length)}
            hint="At or below reorder point"
            icon={AlertTriangle}
            tone="warn"
          />
          <StatCard
            label="Critical"
            value={String(critical.length)}
            hint="Below half of reorder point"
            icon={AlertOctagon}
            tone="danger"
          />
          {workspace === "bus" && (
            <StatCard
              label="Maintenance Due"
              value={String(maintenanceDue.length)}
              hint="Open service items"
              icon={Wrench}
              tone="neutral"
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Needs attention</h2>
              <span className="text-xs text-ink-500">By quantity vs. reorder point</span>
            </div>
            <div className="divide-y divide-border">
              {loading && <p className="px-5 py-6 text-sm text-ink-500">Loading…</p>}
              {!loading && attention.length === 0 && (
                <p className="px-5 py-6 text-sm text-ink-500">
                  Everything is stocked above its reorder point.
                </p>
              )}
              {attention.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-ink">{item.name}</p>
                    <p className="text-xs text-ink-500">{item.location}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-ink-600">
                      {formatNumber(item.quantity)} {item.unit}
                    </span>
                    <StockStatusBadge quantity={item.quantity} reorderPoint={item.reorder_point} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
              <Activity className="h-4 w-4 text-ink-400" />
            </div>
            <div className="divide-y divide-border">
              {loading && <p className="px-5 py-6 text-sm text-ink-500">Loading…</p>}
              {!loading && activity.length === 0 && (
                <p className="px-5 py-6 text-sm text-ink-500">No activity logged yet.</p>
              )}
              {activity.map((entry) => (
                <div key={entry.id} className="px-5 py-3.5">
                  <p className="text-sm text-ink">{entry.action}</p>
                  {entry.details && <p className="text-xs text-ink-500">{entry.details}</p>}
                  <p className="mt-1 text-xs text-ink-400">{relativeTime(entry.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {workspace === "bus" && maintenanceDue.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Upcoming maintenance</h2>
              <Wrench className="h-4 w-4 text-ink-400" />
            </div>
            <div className="divide-y divide-border">
              {maintenanceDue.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {m.bus_identifier} — {m.service_type}
                    </p>
                    <p className="text-xs text-ink-500">
                      {m.remaining_km != null && `${formatNumber(m.remaining_km)} km remaining`}
                      {m.remaining_trips != null && `${m.remaining_trips} trips remaining`}
                    </p>
                  </div>
                  {m.priority && (
                    <span className="rounded-full bg-danger-bg px-2.5 py-1 text-xs font-medium text-danger">
                      Priority
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
