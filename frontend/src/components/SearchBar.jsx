// frontend/src/components/SearchBar.jsx
import React, { useState, useEffect, useMemo } from "react";
import { getProperties, getUnits } from "../api/api";

export default function SearchBar() {
    const [allProperties, setAllProperties] = useState([]);
    const [allUnits, setAllUnits] = useState([]);

    // Filters
    const [propertyName, setPropertyName] = useState("");
    const [propertyAddress, setPropertyAddress] = useState("");
    const [docType, setDocType] = useState(""); // "lease" or "flyer"
    const [minRent, setMinRent] = useState("");
    const [maxRent, setMaxRent] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const [propRes, unitRes] = await Promise.all([
                    getProperties(),
                    getUnits(),
                ]);

                console.log("GET /properties:", propRes.data);
                console.log("GET /units:", unitRes.data);

                setAllProperties(propRes.data);
                setAllUnits(unitRes.data);
            } catch (err) {
                console.error("Error fetching properties/units:", err);
            }
        })();
    }, []);

    // Map property_id -> list of units
    const unitsByProperty = useMemo(() => {
        const map = {};
        allUnits.forEach((u) => {
            if (!map[u.property_id]) {
                map[u.property_id] = [];
            }
            map[u.property_id].push(u);
        });
        return map;
    }, [allUnits]);

    // Attach computedRent to each property
    const propertiesWithRent = useMemo(() => {
        return allProperties.map((p) => {
            const units = unitsByProperty[p.id] || [];
            let rentVal = null;

            if (units.length === 1) {
                const r = Number(units[0].rent_amount);
                rentVal = Number.isNaN(r) ? null : r;
            } else if (units.length > 1) {
                const rents = units
                    .map((u) => Number(u.rent_amount))
                    .filter((n) => !Number.isNaN(n));
                if (rents.length > 0) {
                    const sum = rents.reduce((a, b) => a + b, 0);
                    rentVal = sum / rents.length;
                }
            }

            return {
                ...p,
                computedRent: rentVal,
            };
        });
    }, [allProperties, unitsByProperty]);

    const filteredProperties = useMemo(() => {
        return propertiesWithRent.filter((p) => {
            const name = (p.property_name || "").toLowerCase();
            const addr = (p.address || "").toLowerCase();
            const type = p.doc_type;
            const rentVal =
                p.computedRent != null ? Number(p.computedRent) : null;

            if (propertyName && !name.includes(propertyName.toLowerCase())) {
                return false;
            }

            if (
                propertyAddress &&
                !addr.includes(propertyAddress.toLowerCase())
            ) {
                return false;
            }

            if (docType && type !== docType) {
                return false;
            }

            if (minRent) {
                const minFilter = Number(minRent);
                if (rentVal == null || rentVal < minFilter) return false;
            }

            if (maxRent) {
                const maxFilter = Number(maxRent);
                if (rentVal == null || rentVal > maxFilter) return false;
            }

            return true;
        });
    }, [
        propertiesWithRent,
        propertyName,
        propertyAddress,
        docType,
        minRent,
        maxRent,
    ]);

    return (
        <div style={{ padding: 20 }}>
            <h2>Search & Visualize Properties</h2>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 10,
                    maxWidth: 900,
                    marginBottom: 15,
                }}
            >
                <input
                    type="text"
                    placeholder="Property name..."
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Address contains..."
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                />
                <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                >
                    <option value="">Any doc type</option>
                    <option value="lease">Lease</option>
                    <option value="flyer">Flyer</option>
                </select>
                <input
                    type="number"
                    placeholder="Min rent"
                    value={minRent}
                    onChange={(e) => setMinRent(e.target.value)}
                />
                <input
                    type="number"
                    placeholder="Max rent"
                    value={maxRent}
                    onChange={(e) => setMaxRent(e.target.value)}
                />
            </div>

            <h3>Properties</h3>
            {filteredProperties.length === 0 ? (
                <p>No properties match the current filters.</p>
            ) : (
                <table border="1" cellPadding="5">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Property Name</th>
                            <th>Address</th>
                            <th>Doc Type</th>
                            <th>Rent</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProperties.map((p) => (
                            <tr key={p.id}>
                                <td>{p.id}</td>
                                <td>{p.property_name}</td>
                                <td>{p.address}</td>
                                <td>{p.doc_type}</td>
                                <td>
                                    {p.computedRent != null
                                        ? Number(p.computedRent).toFixed(2)
                                        : "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
