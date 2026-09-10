export type Workspace = "coffee" | "bus";

export type StockStatus = "Critical" | "Low Stock" | "Healthy";

export interface InventoryItem {
  id: string;
  workspace: Workspace;
  name: string;
  location: string;
  quantity: number;
  unit: string;
  reorder_point: number;
  sku: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface PhysicalCount {
  id: string;
  workspace: Workspace;
  location: string;
  shift: "opening" | "closing";
  count_date: string;
  counted_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface PhysicalCountEntry {
  id: string;
  count_id: string;
  item_id: string | null;
  item_name: string;
  unit: string;
  opening_qty: number;
  closing_qty: number;
  target_qty: number;
  usage: number;
  variance: number;
}

export interface AuditLogEntry {
  id: string;
  workspace: Workspace;
  actor: string;
  action: string;
  details: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface SparePart {
  id: string;
  name: string;
  bus_identifier: string;
  identifier: string | null;
  condition: string;
  quantity: number;
  unit: string;
  reorder_point: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceSchedule {
  id: string;
  bus_identifier: string;
  service_type: string;
  due_km: number | null;
  remaining_km: number | null;
  due_trips: number | null;
  remaining_trips: number | null;
  priority: boolean;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface FuelLog {
  id: string;
  bus_identifier: string;
  odometer_km: number;
  fuel_added_l: number;
  distance_km: number;
  recorded_at: string;
}

export const WORKSPACE_LABEL: Record<Workspace, string> = {
  coffee: "Coffee Shop",
  bus: "Bus Fleet",
};
