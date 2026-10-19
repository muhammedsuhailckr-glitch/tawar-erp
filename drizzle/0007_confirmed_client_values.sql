ALTER TABLE projects ADD COLUMN contract_value_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (contract_value_confirmed IN (0,1));
