"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Wrench, Bus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Topbar } from "@/components/topbar";
import { Dialog } from "@/components/ui/dialog";
import { PlainBadge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/workspace-provider";
import { useToast } from "@/components/toast-provider";
import { formatNumber } from "@/lib/utils";
import type { SparePart } from "@/lib/types";

const emptyForm = {
  name: "",
  bus_identifier: "",
  identifier: "",
  condition: "Good",
  quantity: "",
  unit: "pcs",
  reorder_point: "",
  status: "Available",
};

const statusOptions = ["Available", "Installed", "In Service", "Low Stock", "Retired"];

export default function PartsPage() {
  const { workspace } = useWorkspace();

  if (workspace !== "bus") {
    return <NotBusWorkspace />;
  }

  return <PartsContent />;
}

function NotBusWorkspace() {
  return (
    <div>
      <Topbar title="Spare Parts" description="Available in the Bus Fleet workspace." />
      <div className="p-8">
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <Bus className="h-8 w-8 text-ink-300" />
          <p className="text-sm font-medium text-ink">Switch to Bus Fleet</p>
          <p className="max-w-sm text-sm text-ink-500">
            Spare parts and serialized asset tracking apply to the Bus Fleet workspace. Use the
            switcher in the sidebar to view them.
          </p>
        </div>
      </div>
    </div>
  );
}

function PartsContent() {
  const { showToast } = useToast();
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SparePart | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("spare_parts").select("*").order("name");
    setParts(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(part: SparePart) {
    setEditing(part);
    setForm({
      name: part.name,
      bus_identifier: part.bus_identifier,
      identifier: part.identifier ?? "",
      condition: part.condition,
      quantity: String(part.quantity),
      unit: part.unit,
      reorder_point: String(part.reorder_point),
      status: part.status,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();

    const payload = {
      name: form.name.trim(),
      bus_identifier: form.bus_identifier.trim() || "Depot",
      identifier: form.identifier.trim() || null,
      condition: form.condition,
      quantity: Number(form.quantity) || 0,
      unit: form.unit.trim() || "pcs",
      reorder_point: Number(form.reorder_point) || 0,
      status: form.status,
    };

    const { error } = editing
      ? await supabase.from("spare_parts").update(payload).eq("id", editing.id)
      : await supabase.from("spare_parts").insert(payload);

    if (error) {
      showToast(error.message, "error");
    } else {
      await supabase.from("audit_log").insert({
        workspace: "bus",
        actor: "Admin User",
        action: editing ? `Updated part: ${payload.name}` : `Added part: ${payload.name}`,
        details: `${payload.bus_identifier} · ${payload.status}`,
      });
      showToast(editing ? "Part updated" : "Part added");
      setDialogOpen(false);
      load();
    }
    setSaving(false);
  }

  async function handleDelete(part: SparePart) {
    if (!window.confirm(`Delete "${part.name}"?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("spare_parts").delete().eq("id", part.id);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    await supabase.from("audit_log").insert({
      workspace: "bus",
      actor: "Admin User",
      action: `Removed part: ${part.name}`,
    });
    showToast("Part removed");
    load();
  }

  return (
    <div>
      <Topbar
        title="Spare Parts"
        description="Serialized parts and RFID-tracked assets across the fleet."
        actions={
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Part
          </button>
        }
      />

      <div className="p-8">
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-subtle text-xs font-medium uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3">Part</th>
                <th className="px-5 py-3">Bus</th>
                <th className="px-5 py-3">Identifier</th>
                <th className="px-5 py-3">Condition</th>
                <th className="px-5 py-3">Qty</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-ink-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && parts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-ink-500">
                    <Wrench className="mx-auto mb-2 h-8 w-8 text-ink-300" />
                    No parts tracked yet.
                  </td>
                </tr>
              )}
              {parts.map((part) => (
                <tr key={part.id} className="hover:bg-surface-subtle/60">
                  <td className="px-5 py-3.5 font-medium text-ink">{part.name}</td>
                  <td className="px-5 py-3.5 text-ink-600">{part.bus_identifier}</td>
                  <td className="px-5 py-3.5 text-ink-500">{part.identifier ?? "—"}</td>
                  <td className="px-5 py-3.5 text-ink-600">{part.condition}</td>
                  <td className="px-5 py-3.5 text-ink-600">
                    {formatNumber(part.quantity)} {part.unit}
                  </td>
                  <td className="px-5 py-3.5">
                    <PlainBadge tone={part.status === "Available" ? "brand" : "neutral"}>
                      {part.status}
                    </PlainBadge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(part)}
                        className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-subtle hover:text-ink"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(part)}
                        className="rounded-lg p-1.5 text-ink-400 hover:bg-danger-bg hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit part" : "Add part"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="label">Part name</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Bus</label>
              <input
                required
                className="input"
                placeholder="BUS-104 or Depot"
                value={form.bus_identifier}
                onChange={(e) => setForm({ ...form, bus_identifier: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Serial / RFID</label>
              <input
                className="input"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Quantity</label>
              <input
                required
                type="number"
                step="any"
                className="input"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Unit</label>
              <input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Reorder point</label>
              <input
                required
                type="number"
                step="any"
                className="input"
                value={form.reorder_point}
                onChange={(e) => setForm({ ...form, reorder_point: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Condition</label>
              <input
                className="input"
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setDialogOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : editing ? "Save changes" : "Add part"}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
