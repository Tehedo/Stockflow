"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Topbar } from "@/components/topbar";
import { useWorkspace } from "@/components/workspace-provider";
import { useToast } from "@/components/toast-provider";
import { formatNumber, formatDate } from "@/lib/utils";
import type { InventoryItem, PhysicalCount, PhysicalCountEntry } from "@/lib/types";

interface Row {
  item: InventoryItem;
  opening: string;
  closing: string;
  target: string;
}

export default function CountsPage() {
  const { workspace } = useWorkspace();
  const { showToast } = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [location, setLocation] = useState("");
  const [countDate, setCountDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState<(PhysicalCount & { entries: PhysicalCountEntry[] })[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    async function loadItems() {
      const supabase = createClient();
      const { data } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("workspace", workspace)
        .order("location", { ascending: true });
      setItems(data ?? []);
      setLocation(data && data.length > 0 ? data[0].location : "");
    }
    loadItems();
  }, [workspace]);

  async function loadHistory() {
    setLoadingHistory(true);
    const supabase = createClient();
    const { data: counts } = await supabase
      .from("physical_counts")
      .select("*")
      .eq("workspace", workspace)
      .order("created_at", { ascending: false })
      .limit(8);

    if (!counts || counts.length === 0) {
      setHistory([]);
      setLoadingHistory(false);
      return;
    }

    const { data: entries } = await supabase
      .from("physical_count_entries")
      .select("*")
      .in("count_id", counts.map((c) => c.id));

    setHistory(
      counts.map((c) => ({
        ...c,
        entries: (entries ?? []).filter((e) => e.count_id === c.id),
      }))
    );
    setLoadingHistory(false);
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace]);

  const locations = useMemo(
    () => Array.from(new Set(items.map((i) => i.location))).sort(),
    [items]
  );

  const itemsAtLocation = useMemo(
    () => items.filter((i) => i.location === location),
    [items, location]
  );

  useEffect(() => {
    setRows(
      itemsAtLocation.map((item) => ({
        item,
        opening: String(item.quantity),
        closing: String(item.quantity),
        target: "0",
      }))
    );
  }, [itemsAtLocation]);

  function updateRow(id: string, field: "opening" | "closing" | "target", value: string) {
    setRows((prev) => prev.map((r) => (r.item.id === id ? { ...r, [field]: value } : r)));
  }

  async function handleSave() {
    if (rows.length === 0) return;
    setSaving(true);
    const supabase = createClient();

    const { data: count, error: countError } = await supabase
      .from("physical_counts")
      .insert({
        workspace,
        location,
        shift: "closing",
        count_date: countDate,
        counted_by: "Admin User",
      })
      .select()
      .single();

    if (countError || !count) {
      showToast(countError?.message ?? "Could not save count", "error");
      setSaving(false);
      return;
    }

    const entries = rows.map((r) => {
      const opening = Number(r.opening) || 0;
      const closing = Number(r.closing) || 0;
      const target = Number(r.target) || 0;
      const usage = opening - closing;
      return {
        count_id: count.id,
        item_id: r.item.id,
        item_name: r.item.name,
        unit: r.item.unit,
        opening_qty: opening,
        closing_qty: closing,
        target_qty: target,
        usage,
        variance: usage - target,
      };
    });

    const { error: entriesError } = await supabase.from("physical_count_entries").insert(entries);
    if (entriesError) {
      showToast(entriesError.message, "error");
      setSaving(false);
      return;
    }

    // Reconcile on-hand quantity to the closing count.
    for (const r of rows) {
      await supabase
        .from("inventory_items")
        .update({ quantity: Number(r.closing) || 0 })
        .eq("id", r.item.id);
    }

    await supabase.from("audit_log").insert({
      workspace,
      actor: "Admin User",
      action: `Submitted ${location} count`,
      details: `${rows.length} items counted on ${formatDate(countDate)}`,
    });

    showToast("Count saved and stock reconciled");
    setSaving(false);
    loadHistory();
  }

  return (
    <div>
      <Topbar title="Physical Counts" description="Compare opening and closing stock to catch variance." />

      <div className="grid grid-cols-1 gap-6 p-8 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <ClipboardCheck className="h-4 w-4 text-brand-600" /> New count
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <select className="input w-44" value={location} onChange={(e) => setLocation(e.target.value)}>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="input w-40"
                value={countDate}
                onChange={(e) => setCountDate(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-subtle text-xs font-medium uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-3">Item</th>
                  <th className="px-5 py-3">Opening</th>
                  <th className="px-5 py-3">Closing</th>
                  <th className="px-5 py-3">Target Usage</th>
                  <th className="px-5 py-3">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-ink-500">
                      No items at this location yet.
                    </td>
                  </tr>
                )}
                {rows.map((r) => {
                  const usage = (Number(r.opening) || 0) - (Number(r.closing) || 0);
                  const variance = usage - (Number(r.target) || 0);
                  return (
                    <tr key={r.item.id}>
                      <td className="px-5 py-2.5 font-medium text-ink">{r.item.name}</td>
                      <td className="px-5 py-2.5">
                        <input
                          type="number"
                          step="any"
                          className="input w-24"
                          value={r.opening}
                          onChange={(e) => updateRow(r.item.id, "opening", e.target.value)}
                        />
                      </td>
                      <td className="px-5 py-2.5">
                        <input
                          type="number"
                          step="any"
                          className="input w-24"
                          value={r.closing}
                          onChange={(e) => updateRow(r.item.id, "closing", e.target.value)}
                        />
                      </td>
                      <td className="px-5 py-2.5">
                        <input
                          type="number"
                          step="any"
                          className="input w-24"
                          value={r.target}
                          onChange={(e) => updateRow(r.item.id, "target", e.target.value)}
                        />
                      </td>
                      <td
                        className={`px-5 py-2.5 font-medium ${
                          variance === 0 ? "text-ink-500" : variance > 0 ? "text-warn" : "text-danger"
                        }`}
                      >
                        {variance > 0 ? "+" : ""}
                        {formatNumber(variance)} {r.item.unit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {rows.length > 0 && (
            <div className="flex justify-end border-t border-border px-5 py-4">
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save count"}
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Past counts</h2>
          </div>
          <div className="max-h-[560px] divide-y divide-border overflow-y-auto">
            {loadingHistory && <p className="px-5 py-6 text-sm text-ink-500">Loading…</p>}
            {!loadingHistory && history.length === 0 && (
              <p className="px-5 py-6 text-sm text-ink-500">No counts submitted yet.</p>
            )}
            {history.map((h) => (
              <div key={h.id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">{h.location}</p>
                  <p className="text-xs text-ink-500">{formatDate(h.count_date)}</p>
                </div>
                <p className="mt-1 text-xs text-ink-500">{h.entries.length} items counted</p>
                <div className="mt-2 space-y-1">
                  {h.entries
                    .filter((e) => e.variance !== 0)
                    .slice(0, 3)
                    .map((e) => (
                      <p key={e.id} className="text-xs text-ink-600">
                        {e.item_name}:{" "}
                        <span className={e.variance > 0 ? "text-warn" : "text-danger"}>
                          {e.variance > 0 ? "+" : ""}
                          {formatNumber(e.variance)} {e.unit}
                        </span>
                      </p>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
