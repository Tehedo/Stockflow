"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, Fuel as FuelIcon, Bus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Topbar } from "@/components/topbar";
import { Dialog } from "@/components/ui/dialog";
import { PlainBadge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/workspace-provider";
import { useToast } from "@/components/toast-provider";
import { formatNumber, formatDate } from "@/lib/utils";
import type { FuelLog } from "@/lib/types";

const emptyForm = { bus_identifier: "", odometer_km: "", fuel_added_l: "", distance_km: "" };

function efficiency(consumption: number): { label: string; tone: "brand" | "neutral" } {
  if (consumption <= 24) return { label: "Good", tone: "brand" };
  if (consumption <= 28) return { label: "Watch", tone: "neutral" };
  return { label: "Poor", tone: "neutral" };
}

export default function FuelPage() {
  const { workspace } = useWorkspace();

  if (workspace !== "bus") {
    return (
      <div>
        <Topbar title="Fuel & Mileage" description="Available in the Bus Fleet workspace." />
        <div className="p-8">
          <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Bus className="h-8 w-8 text-ink-300" />
            <p className="text-sm font-medium text-ink">Switch to Bus Fleet</p>
            <p className="max-w-sm text-sm text-ink-500">
              Fuel and mileage monitoring applies to the Bus Fleet workspace.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <FuelContent />;
}

function FuelContent() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("fuel_logs")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(50);
    setLogs(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();

    const payload = {
      bus_identifier: form.bus_identifier.trim(),
      odometer_km: Number(form.odometer_km) || 0,
      fuel_added_l: Number(form.fuel_added_l) || 0,
      distance_km: Number(form.distance_km) || 0,
    };

    const { error } = await supabase.from("fuel_logs").insert(payload);
    if (error) {
      showToast(error.message, "error");
    } else {
      await supabase.from("audit_log").insert({
        workspace: "bus",
        actor: "Admin User",
        action: "Recorded fueling",
        details: `${payload.bus_identifier}, ${payload.fuel_added_l} L`,
      });
      showToast("Fuel entry recorded");
      setDialogOpen(false);
      setForm(emptyForm);
      load();
    }
    setSaving(false);
  }

  async function handleDelete(log: FuelLog) {
    if (!window.confirm(`Remove this entry for ${log.bus_identifier}?`)) return;
    const supabase = createClient();
    await supabase.from("fuel_logs").delete().eq("id", log.id);
    showToast("Entry removed");
    load();
  }

  return (
    <div>
      <Topbar
        title="Fuel & Mileage"
        description="Consumption and efficiency across the fleet."
        actions={
          <button onClick={() => setDialogOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Log Fueling
          </button>
        }
      />

      <div className="p-8">
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-subtle text-xs font-medium uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3">Bus</th>
                <th className="px-5 py-3">Odometer</th>
                <th className="px-5 py-3">Fuel Added</th>
                <th className="px-5 py-3">Distance</th>
                <th className="px-5 py-3">Consumption</th>
                <th className="px-5 py-3">Efficiency</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-ink-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-ink-500">
                    <FuelIcon className="mx-auto mb-2 h-8 w-8 text-ink-300" />
                    No fuel entries logged yet.
                  </td>
                </tr>
              )}
              {logs.map((log) => {
                const consumption = log.distance_km > 0 ? (log.fuel_added_l / log.distance_km) * 100 : 0;
                const eff = efficiency(consumption);
                return (
                  <tr key={log.id} className="hover:bg-surface-subtle/60">
                    <td className="px-5 py-3.5 font-medium text-ink">{log.bus_identifier}</td>
                    <td className="px-5 py-3.5 text-ink-600">{formatNumber(log.odometer_km, 0)} km</td>
                    <td className="px-5 py-3.5 text-ink-600">{formatNumber(log.fuel_added_l)} L</td>
                    <td className="px-5 py-3.5 text-ink-600">{formatNumber(log.distance_km)} km</td>
                    <td className="px-5 py-3.5 text-ink-600">{formatNumber(consumption)} L/100km</td>
                    <td className="px-5 py-3.5">
                      <PlainBadge tone={eff.tone}>{eff.label}</PlainBadge>
                    </td>
                    <td className="px-5 py-3.5 text-ink-500">{formatDate(log.recorded_at)}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleDelete(log)}
                        className="rounded-lg p-1.5 text-ink-400 hover:bg-danger-bg hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Log fueling">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="label">Bus</label>
            <input
              required
              className="input"
              placeholder="BUS-104"
              value={form.bus_identifier}
              onChange={(e) => setForm({ ...form, bus_identifier: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="label">Odometer (km)</label>
            <input
              required
              type="number"
              step="any"
              className="input"
              value={form.odometer_km}
              onChange={(e) => setForm({ ...form, odometer_km: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Fuel added (L)</label>
              <input
                required
                type="number"
                step="any"
                className="input"
                value={form.fuel_added_l}
                onChange={(e) => setForm({ ...form, fuel_added_l: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Distance (km)</label>
              <input
                required
                type="number"
                step="any"
                className="input"
                value={form.distance_km}
                onChange={(e) => setForm({ ...form, distance_km: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setDialogOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save entry"}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
