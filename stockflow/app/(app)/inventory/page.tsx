"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Topbar } from "@/components/topbar";
import { Dialog } from "@/components/ui/dialog";
import { StockStatusBadge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/workspace-provider";
import { useToast } from "@/components/toast-provider";
import { formatNumber, formatDate } from "@/lib/utils";
import type { InventoryItem } from "@/lib/types";

const emptyForm = { name: "", location: "", quantity: "", unit: "pcs", reorder_point: "" };

export default function InventoryPage() {
  const { workspace } = useWorkspace();
  const { showToast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("workspace", workspace)
      .order("name", { ascending: true });
    if (!error) setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace]);

  const locations = useMemo(
    () => Array.from(new Set(items.map((i) => i.location))).sort(),
    [items]
  );

  const filtered = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesLocation = locationFilter === "all" || item.location === locationFilter;
    return matchesSearch && matchesLocation;
  });

  function openAddDialog() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(item: InventoryItem) {
    setEditing(item);
    setForm({
      name: item.name,
      location: item.location,
      quantity: String(item.quantity),
      unit: item.unit,
      reorder_point: String(item.reorder_point),
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();

    const payload = {
      workspace,
      name: form.name.trim(),
      location: form.location.trim(),
      quantity: Number(form.quantity) || 0,
      unit: form.unit.trim() || "pcs",
      reorder_point: Number(form.reorder_point) || 0,
      updated_by: "Admin User",
    };

    if (editing) {
      const { error } = await supabase.from("inventory_items").update(payload).eq("id", editing.id);
      if (error) {
        showToast(error.message, "error");
      } else {
        await supabase.from("audit_log").insert({
          workspace,
          actor: "Admin User",
          action: `Updated ${payload.name}`,
          details: `${payload.location} · ${payload.quantity} ${payload.unit}`,
        });
        showToast("Item updated");
        setDialogOpen(false);
        load();
      }
    } else {
      const { error } = await supabase.from("inventory_items").insert(payload);
      if (error) {
        showToast(error.message, "error");
      } else {
        await supabase.from("audit_log").insert({
          workspace,
          actor: "Admin User",
          action: `Added ${payload.name}`,
          details: `${payload.location} · ${payload.quantity} ${payload.unit}`,
        });
        showToast("Item added");
        setDialogOpen(false);
        load();
      }
    }
    setSaving(false);
  }

  async function handleDelete(item: InventoryItem) {
    if (!window.confirm(`Delete "${item.name}"? This can't be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("inventory_items").delete().eq("id", item.id);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    await supabase.from("audit_log").insert({
      workspace,
      actor: "Admin User",
      action: `Removed ${item.name}`,
      details: item.location,
    });
    showToast("Item removed");
    load();
  }

  return (
    <div>
      <Topbar
        title="Inventory"
        description="Stock on hand across every location."
        actions={
          <button onClick={openAddDialog} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Item
          </button>
        }
      />

      <div className="p-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              className="input pl-9"
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-full sm:w-56"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="all">All locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-subtle text-xs font-medium uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3">Item</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Quantity</th>
                <th className="px-5 py-3">Reorder Point</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Updated</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-ink-500">
                    Loading inventory…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-ink-500">
                    <Package className="mx-auto mb-2 h-8 w-8 text-ink-300" />
                    No items match your filters yet.
                  </td>
                </tr>
              )}
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-surface-subtle/60">
                  <td className="px-5 py-3.5 font-medium text-ink">{item.name}</td>
                  <td className="px-5 py-3.5 text-ink-600">{item.location}</td>
                  <td className="px-5 py-3.5 text-ink-600">
                    {formatNumber(item.quantity)} {item.unit}
                  </td>
                  <td className="px-5 py-3.5 text-ink-600">
                    {formatNumber(item.reorder_point)} {item.unit}
                  </td>
                  <td className="px-5 py-3.5">
                    <StockStatusBadge quantity={item.quantity} reorderPoint={item.reorder_point} />
                  </td>
                  <td className="px-5 py-3.5 text-ink-500">{formatDate(item.updated_at)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditDialog(item)}
                        className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-subtle hover:text-ink"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="rounded-lg p-1.5 text-ink-400 hover:bg-danger-bg hover:text-danger"
                        aria-label="Delete"
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
        title={editing ? "Edit item" : "Add item"}
        description={editing ? "Update stock details." : "Add a new item to this workspace."}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="label">Name</label>
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="label">Location</label>
            <input
              required
              className="input"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
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
              <input
                required
                className="input"
                placeholder="pcs, L, kg…"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
          </div>
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
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setDialogOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : editing ? "Save changes" : "Add item"}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
