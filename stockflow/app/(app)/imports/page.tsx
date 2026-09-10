"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Download, Upload, FileSpreadsheet, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Topbar } from "@/components/topbar";
import { useWorkspace } from "@/components/workspace-provider";
import { useToast } from "@/components/toast-provider";
import { toCsv, downloadFile } from "@/lib/utils";
import type { InventoryItem } from "@/lib/types";

interface ParsedRow {
  name: string;
  location: string;
  quantity: number;
  unit: string;
  reorder_point: number;
}

function normalizeRows(raw: Record<string, unknown>[]): ParsedRow[] {
  return raw
    .map((row) => {
      const get = (keys: string[]) => {
        for (const k of keys) {
          const found = Object.keys(row).find((rk) => rk.trim().toLowerCase() === k);
          if (found && row[found] !== undefined && row[found] !== "") return row[found];
        }
        return undefined;
      };
      const name = get(["name", "item", "item name"]);
      const location = get(["location"]);
      const quantity = get(["quantity", "qty"]);
      const unit = get(["unit"]);
      const reorder = get(["reorder_point", "reorder point", "reorder"]);
      if (!name || !location) return null;
      return {
        name: String(name).trim(),
        location: String(location).trim(),
        quantity: Number(quantity) || 0,
        unit: unit ? String(unit).trim() : "pcs",
        reorder_point: Number(reorder) || 0,
      };
    })
    .filter((r): r is ParsedRow => r !== null);
}

export default function ImportsPage() {
  const { workspace } = useWorkspace();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  async function handleExportInventory() {
    setExporting("inventory");
    const supabase = createClient();
    const { data } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("workspace", workspace)
      .order("name");
    const rows = (data ?? []) as InventoryItem[];
    const csv = toCsv(
      rows.map((r) => ({
        name: r.name,
        location: r.location,
        quantity: r.quantity,
        unit: r.unit,
        reorder_point: r.reorder_point,
        updated_at: r.updated_at,
      }))
    );
    downloadFile(`stockflow-${workspace}-inventory.csv`, csv);
    setExporting(null);
  }

  async function handleExportHistory() {
    setExporting("history");
    const supabase = createClient();
    const { data } = await supabase
      .from("audit_log")
      .select("*")
      .eq("workspace", workspace)
      .order("created_at", { ascending: false });
    const csv = toCsv(
      (data ?? []).map((r) => ({
        action: r.action,
        details: r.details,
        actor: r.actor,
        created_at: r.created_at,
      }))
    );
    downloadFile(`stockflow-${workspace}-audit-history.csv`, csv);
    setExporting(null);
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    if (file.name.toLowerCase().endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setParsedRows(normalizeRows(results.data as Record<string, unknown>[]));
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
        setParsedRows(normalizeRows(json));
      };
      reader.readAsBinaryString(file);
    }
  }

  async function handleConfirmImport() {
    if (parsedRows.length === 0) return;
    setImporting(true);
    const supabase = createClient();

    const { data: existing } = await supabase
      .from("inventory_items")
      .select("id, name, location")
      .eq("workspace", workspace);

    const existingMap = new Map(
      (existing ?? []).map((e) => [`${e.name.toLowerCase()}|${e.location.toLowerCase()}`, e.id])
    );

    let updated = 0;
    let inserted = 0;

    for (const row of parsedRows) {
      const key = `${row.name.toLowerCase()}|${row.location.toLowerCase()}`;
      const existingId = existingMap.get(key);
      if (existingId) {
        await supabase
          .from("inventory_items")
          .update({
            quantity: row.quantity,
            unit: row.unit,
            reorder_point: row.reorder_point,
            updated_by: "Admin User",
          })
          .eq("id", existingId);
        updated++;
      } else {
        await supabase.from("inventory_items").insert({
          workspace,
          name: row.name,
          location: row.location,
          quantity: row.quantity,
          unit: row.unit,
          reorder_point: row.reorder_point,
          updated_by: "Admin User",
        });
        inserted++;
      }
    }

    await supabase.from("audit_log").insert({
      workspace,
      actor: "Admin User",
      action: "Imported inventory",
      details: `${fileName}: ${inserted} added, ${updated} updated`,
    });

    showToast(`Import complete — ${inserted} added, ${updated} updated`);
    setParsedRows([]);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setImporting(false);
  }

  return (
    <div>
      <Topbar title="Import / Export" description="Bulk update stock from a spreadsheet, or export your data." />

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
            <Download className="h-4 w-4 text-brand-600" /> Export
          </div>
          <p className="mb-4 text-sm text-ink-500">
            Download current data for this workspace as CSV.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExportInventory} disabled={exporting === "inventory"} className="btn-secondary">
              {exporting === "inventory" ? "Exporting…" : "Export inventory (CSV)"}
            </button>
            <button onClick={handleExportHistory} disabled={exporting === "history"} className="btn-secondary">
              {exporting === "history" ? "Exporting…" : "Export audit history (CSV)"}
            </button>
          </div>
        </div>

        <div className="card p-6">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
            <Upload className="h-4 w-4 text-brand-600" /> Import
          </div>
          <p className="mb-4 text-sm text-ink-500">
            Upload a CSV or XLSX file with columns: name, location, quantity, unit, reorder_point.
            Matching items (by name + location) are updated; new ones are added.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
          />
        </div>

        {parsedRows.length > 0 && (
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <FileSpreadsheet className="h-4 w-4 text-brand-600" />
                {fileName} — {parsedRows.length} rows detected
              </div>
              <button onClick={handleConfirmImport} disabled={importing} className="btn-primary">
                <Check className="h-4 w-4" /> {importing ? "Importing…" : "Confirm import"}
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle text-xs font-medium uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-2.5">Name</th>
                    <th className="px-5 py-2.5">Location</th>
                    <th className="px-5 py-2.5">Quantity</th>
                    <th className="px-5 py-2.5">Unit</th>
                    <th className="px-5 py-2.5">Reorder Point</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedRows.map((row, i) => (
                    <tr key={i}>
                      <td className="px-5 py-2 text-ink">{row.name}</td>
                      <td className="px-5 py-2 text-ink-600">{row.location}</td>
                      <td className="px-5 py-2 text-ink-600">{row.quantity}</td>
                      <td className="px-5 py-2 text-ink-600">{row.unit}</td>
                      <td className="px-5 py-2 text-ink-600">{row.reorder_point}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
