-- Align units CHECK constraints with the UI values used across the app.

ALTER TABLE units DROP CONSTRAINT IF EXISTS units_unit_type_check;
ALTER TABLE units ADD CONSTRAINT units_unit_type_check
  CHECK (unit_type IN ('single', 'double', 'suite', 'family', 'royal', 'room', 'apartment_suite', 'studio'));

ALTER TABLE units DROP CONSTRAINT IF EXISTS units_status_check;
ALTER TABLE units ADD CONSTRAINT units_status_check
  CHECK (status IN ('available', 'booked', 'occupied', 'maintenance', 'cleaning', 'reserved'));
