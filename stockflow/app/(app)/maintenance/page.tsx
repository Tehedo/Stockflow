"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, CalendarClock, Bus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Topbar } from "@/components/topbar";
import { Dialog } from "@/components/ui/dialog";
import { PlainBadge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/workspace-provider";
import { useToast } from "@/components/toast-provider";
import { formatNumber } from "@/lib/utils";
import type { MaintenanceSchedule } from "@/lib/types";

const emptyForm = {
  bus_identifier: "",
  service_type: "",
  remaining_km: "",
  remaining_trips: "",
  priority: false,
  status: "Scheduled",
  notes: "",
};

const statusOptions = ["Scheduled", "Priority", "Completed"];

export default function MaintenancePage() {
  const { workspace } = useWorkspace();

  if (workspace !== "bus") {
    return (
      <div>
        <Topbar title="Maintenance" description="Available in the Bus Fleet workspace." />
        <div className="p-8">
          <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Bus className="h-8 w-8 text-ink-300" />
            <p className="text-sm font-medium text-ink">Switch to Bus Fleet</p>
            <p className="max-w-sm text-sm text-ink-500">
              Preventive maintenance scheduling applies to the Bus Fleet workspace.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <MaintenanceContent />;
}

function MaintenanceContent() {
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("maintenance_schedules")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    setSchedules(data ?? []);
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
      service_type: form.service_type.trim(),
      remaining_km: form.remaining_km ? Number(form.remaining_km) : null,
      remaining_trips: form.remaining_trips ? Number(form.remaining_trips) : null,
      priority: form.priority,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    const { error } = await supabase.from("maintenance_schedules").insert(payload);
    if (error) {
      showToast(error.message, "error");
    } else {
      await supabase.from("audit_log").insert({
        workspace: "bus",
        actor: "Admin User",
        action: `Scheduled maintenance: ${payload.service_type}`,
        details: payload.bus_identifier,
      });
      showToast("Maintenance scheduled");
      setDialogOpen(false);
      setForm(emptyForm);
      load();
    }
    setSaving(false);
  }

  async function handleStatusChange(item: MaintenanceSchedule, status: string) {
    const supabase = createClient();
    await supabase.from("maintenance_schedules").update({ status }).eq("id", item.id);
    load();
  }

  async function handleDelete(item: MaintenanceSchedule) {
    if (!window.confirm(`Remove maintenance entry for ${item.bus_identifier}?`)) return;
    const supabase = createClient();
    await supabase.from("maintenance_schedules").delete().eq("id", item.id);
    showToast("Entry removed");
    load();
  }

  return (
    <div>
      <Topbar
        title="Maintenance"
        description="Preventive maintenance across the fleet."
        actions={
          <button onClick={() => setDialogOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Schedule Service
          </button>
        }
      />

      <div className="p-8">
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-subtle text-xs font-medium uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3">Bus</th>
                <th className="px-5 py-3">Service</th>
                <th className="px-5 py-3">Remaining</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && schedules.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-ink-500">
                    <CalendarClock className="mx-auto mb-2 h-8 w-8 text-ink-300" />
                    Nothing scheduled yet.
                  </td>
                </tr>
              )}
              {schedules.map((s) => (
                <tr key={s.id} className="hover:bg-surface-subtle/60">
                  <td className="px-5 py-3.5 font-medium text-ink">{s.bus_identifier}</td>
                  <td className="px-5 py-3.5 text-ink-600">{s.service_type}</td>
                  <td className="px-5 py-3.5 text-ink-600">
                    {s.remaining_km != null && `${formatNumber(s.remaining_km)} km`}
                    {s.remaining_trips != null && `${s.remaining_trips} trips`}
                    {s.remaining_km == null && s.remaining_trips == null && "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={s.status}
                      onChange={(e) => handleStatusChange(s, e.target.value)}
                      className="rounded-full border-0 bg-surface-subtle px-2.5 py-1 text-xs font-medium text-ink-600"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    {s.priority && (
                      <span className="ml-2">
                        <PlainBadge>Priority</PlainBadge>
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleDelete(s)}
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-danger-bg hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Schedule service">
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
            <label className="label">Service type</label>
            <input
              required
              className="input"
              placeholder="Oil + brake inspection"
              value={form.service_type}
              onChange={(e) => setForm({ ...form, service_type: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Remaining km</label>
              <input
                type="number"
                className="input"
                value={form.remaining_km}
                onChange={(e) => setForm({ ...form, remaining_km: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Remaining trips</label>
              <input
                type="number"
                className="input"
                value={form.remaining_trips}
                onChange={(e) => setForm({ ...form, remaining_trips: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <input
              type="checkbox"
              checked={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.checked })}
              className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
            />
            Mark as priority
          </label>
          <div className="space-y-1.5">
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setDialogOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Schedule"}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
