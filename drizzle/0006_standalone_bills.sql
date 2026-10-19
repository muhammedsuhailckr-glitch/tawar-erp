CREATE TABLE bills (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT,
 id TEXT NOT NULL UNIQUE,
 owner TEXT NOT NULL,
 kind TEXT NOT NULL CHECK (kind IN ('bill','receipt')),
 date TEXT NOT NULL,
 customer_name TEXT NOT NULL,
 customer_address TEXT NOT NULL DEFAULT '',
 customer_phone TEXT NOT NULL DEFAULT '',
 items_json TEXT NOT NULL CHECK (json_valid(items_json)),
 total INTEGER NOT NULL CHECK (total > 0 AND total <= 100000000000),
 notes TEXT NOT NULL DEFAULT '',
 payment_ref TEXT NOT NULL DEFAULT '',
 source_transaction_id TEXT,
 source_revision INTEGER,
 created_by TEXT NOT NULL,
 created_name TEXT NOT NULL,
 created_at TEXT NOT NULL,
 voided_at TEXT,
 void_reason TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 0,
 CHECK ((kind='bill' AND source_transaction_id IS NULL AND source_revision IS NULL) OR (kind='receipt' AND source_transaction_id IS NOT NULL AND source_revision IS NOT NULL))
);
CREATE INDEX bills_owner_created ON bills(owner,created_at);
CREATE UNIQUE INDEX bills_active_receipt ON bills(owner,source_transaction_id) WHERE source_transaction_id IS NOT NULL AND voided_at IS NULL;
