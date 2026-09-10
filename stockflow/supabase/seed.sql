-- ============================================================================
-- Optional sample data — mirrors the original prototype's mock inventory so
-- your dashboard isn't empty on first login. Safe to skip or delete.
-- Run AFTER schema.sql.
-- ============================================================================

insert into public.inventory_items (workspace, name, location, quantity, unit, reorder_point, updated_by) values
  ('coffee', 'Espresso Beans',   'Main Storage', 820,  'g',   500, 'Admin User'),
  ('coffee', 'Vanilla Syrup',    'Espresso Bar', 1350, 'ml',  800, 'Admin User'),
  ('coffee', 'Fresh Milk',       'Refrigerator', 18,   'L',   20,  'Admin User'),
  ('coffee', '12oz Cups',        'Main Storage', 420,  'pcs', 300, 'Admin User'),
  ('coffee', '12oz Lids',        'Main Storage', 95,   'pcs', 200, 'Admin User'),
  ('coffee', 'Chocolate Sauce',  'Espresso Bar', 920,  'ml',  700, 'Admin User'),
  ('coffee', 'Whipping Cream',   'Refrigerator', 8,    'pcs', 10,  'Admin User'),
  ('bus', 'Michelin Bus Tire',   'Spare Parts Depot', 4,    'pcs', 4,    'Admin User'),
  ('bus', 'Brake Pad Set',       'Spare Parts Depot', 8,    'sets',6,    'Admin User'),
  ('bus', 'Engine Oil',          'Fuel Depot',         32,   'L',   50,   'Admin User'),
  ('bus', 'Coolant',             'Spare Parts Depot', 46,   'L',   30,   'Admin User'),
  ('bus', 'Air Filter',          'Spare Parts Depot', 12,   'pcs', 8,    'Admin User'),
  ('bus', 'Diesel Fuel',         'Fuel Depot',         3820, 'L',   1500, 'Admin User')
on conflict do nothing;

insert into public.spare_parts (name, bus_identifier, identifier, condition, quantity, unit, reorder_point, status) values
  ('Michelin Bus Tire', 'BUS-104', 'RFID-88321', 'Good',       4,  'pcs',  4, 'Available'),
  ('Brake Pad Set',     'BUS-107', 'SN-BP-4218', 'New',        8,  'sets', 6, 'Available'),
  ('Engine Assembly',   'BUS-102', 'ENG-90211',  'In service', 1,  'pcs',  1, 'Installed'),
  ('Diesel Engine Oil', 'Depot',   'LOT-26A91',  'Good',       32, 'L',   50, 'Low Stock')
on conflict do nothing;

insert into public.maintenance_schedules (bus_identifier, service_type, due_km, remaining_km, due_trips, remaining_trips, priority, status) values
  ('BUS-104', 'Oil + brake inspection', 85000, 1820, null, null, false, 'Scheduled'),
  ('BUS-107', 'Tire rotation', null, null, 12, 12, false, 'Scheduled'),
  ('BUS-102', 'Engine inspection', null, 320, null, null, true, 'Priority')
on conflict do nothing;

insert into public.fuel_logs (bus_identifier, odometer_km, fuel_added_l, distance_km) values
  ('BUS-104', 83180, 120, 520),
  ('BUS-107', 72420, 160, 590),
  ('BUS-102', 84680, 135, 610)
on conflict do nothing;

insert into public.audit_log (workspace, actor, action, details) values
  ('coffee', 'Admin User', 'Adjusted Fresh Milk', 'Expired dairy, -2 L'),
  ('coffee', 'Admin User', 'Submitted Espresso Bar closing count', '18 items counted'),
  ('coffee', 'Admin User', 'Imported inventory', 'CSV bulk update, 14 records'),
  ('bus', 'Admin User', 'Recorded fueling', 'BUS-104, 120 L')
on conflict do nothing;
