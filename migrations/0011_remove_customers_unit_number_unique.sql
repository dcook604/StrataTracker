-- Remove unique constraint from unit_number in customers table
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_unit_number_key;
