// backend/database.js
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, "data.db"));

// Creating properties & units tables
db.exec(`
CREATE TABLE IF NOT EXISTS properties (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    property_name    TEXT,
    address          TEXT,
    doc_type         TEXT,
    available_sf     REAL,
    building_size_sf REAL,
    clear_height     TEXT
);

CREATE TABLE IF NOT EXISTS units (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id  INTEGER,
    unit_number  TEXT,
    unit_type    TEXT,
    rent_amount  REAL,
    tenant_name  TEXT,
    lease_start  TEXT,
    lease_end    TEXT,
    sq_ft        REAL,
    FOREIGN KEY (property_id) REFERENCES properties(id)
);
`);

export default db;
