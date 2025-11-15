// backend/server.js
import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import db from "./database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.options("*", cors());
app.use(express.json());
app.use(fileUpload());

// POST /extract → upload PDF, run Python, insert into SQLite, return extracted data
app.post("/extract", (req, res) => {
    console.log("Files received:", req.files);
    if (!req.files || !req.files.pdf) {
        return res.status(400).send("No file uploaded");
    }

    const pdf = req.files.pdf;
    const savePath = path.join(__dirname, pdf.name);

    pdf.mv(savePath, (err) => {
        if (err) {
            console.error("File save error:", err);
            return res
                .status(500)
                .send({ error: "File save failed", details: err.message });
        }

        const pythonScript = `python3 python/extract.py "${savePath}"`;

        exec(pythonScript, (error, stdout, stderr) => {
            if (error) {
                console.error("Python extract error:", error, stdout, stderr);
                return res.status(500).send({
                    error: "Extraction failed",
                    stdout,
                    stderr: error.message,
                });
            }

            let extracted;
            try {
                extracted = JSON.parse(stdout);
            } catch (parseErr) {
                console.error("Parse error from Python:", parseErr, stdout);
                return res.status(500).send("Failed to parse extractor output");
            }

            const { structured } = extracted;
            const docType = structured.doc_type || "lease"; // now only "lease" or "flyer"

            if (docType === "flyer") {
                // Insert flyer as a property row (no units)
                const stmt = db.prepare(`
          INSERT INTO properties (
            property_name,
            address,
            doc_type,
            available_sf,
            building_size_sf,
            clear_height
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `);

                const propertyId = stmt.run(
                    structured.property_name || "Unknown",
                    structured.address || "",
                    docType,
                    structured.available_sf || null,
                    structured.building_size_sf || null,
                    structured.clear_height || null
                ).lastInsertRowid;

                return res.send({
                    message: "Flyer PDF processed",
                    propertyId,
                    structured,
                });
            } else {
                // Treat everything else as a LEASE-like document
                const propStmt = db.prepare(`
          INSERT INTO properties (property_name, address, doc_type)
          VALUES (?, ?, ?)
        `);
                const propertyId = propStmt.run(
                    structured.property_name || "Unknown",
                    structured.address || "",
                    "lease"
                ).lastInsertRowid;

                // Store one unit row using base_rent as rent_amount (for search/aggregations)
                const unitStmt = db.prepare(`
          INSERT INTO units (
            property_id,
            unit_number,
            unit_type,
            rent_amount,
            tenant_name,
            lease_start,
            lease_end,
            sq_ft
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

                unitStmt.run(
                    propertyId,
                    structured.suite || "",
                    structured.unit_type || "",
                    structured.base_rent || 0,
                    structured.tenant || "",
                    structured.lease_start || "",
                    structured.lease_end || "",
                    structured.square_feet || null
                );

                return res.send({
                    message: "Lease PDF processed",
                    propertyId,
                    structured,
                });
            }
        });
    });
});

// GET all properties
app.get("/properties", (req, res) => {
    const rows = db.prepare("SELECT * FROM properties").all();
    res.send(rows);
});

// GET all units
app.get("/units", (req, res) => {
    const rows = db.prepare("SELECT * FROM units").all();
    res.send(rows);
});

// Optional: search units by unit_number / rent range
app.get("/search", (req, res) => {
    let query = "SELECT * FROM units WHERE 1=1";
    const params = [];

    if (req.query.unit_number) {
        query += " AND unit_number LIKE ?";
        params.push(`%${req.query.unit_number}%`);
    }

    if (req.query.min_rent) {
        query += " AND rent_amount >= ?";
        params.push(req.query.min_rent);
    }

    if (req.query.max_rent) {
        query += " AND rent_amount <= ?";
        params.push(req.query.max_rent);
    }

    const results = db.prepare(query).all(...params);
    res.send(results);
});

app.listen(5100, () => console.log("Server running on port 5100"));
