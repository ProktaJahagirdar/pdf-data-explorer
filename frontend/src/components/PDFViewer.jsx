// frontend/src/components/PDFViewer.jsx
import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";


pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PAGE_RENDER_WIDTH = 400;


// Renders the extracted data in the right pane
function RenderExtracted({ extracted }) {
    if (!extracted) return null;

    // Flyer-style document
    if (extracted.doc_type === "flyer") {
        const {
            property_name,
            address,
            available_sf,
            building_size_sf,
            site_area_acres,
            site_area_sf,
            lease_rate_psf,
            lease_rate_type,
            nnn_psf,
            year_built,
            zoning,
            parking_spaces,
            contacts,
        } = extracted;

        const hasSpaceDetails =
            available_sf != null ||
            building_size_sf != null ||
            site_area_acres != null ||
            site_area_sf != null;

        const hasEconomics = lease_rate_psf != null || nnn_psf != null;

        const hasPropertyDetails =
            year_built != null || !!zoning || parking_spaces != null;

        return (
            <div>
                {/* Basic property info */}
                {(property_name || address) && (
                    <>
                        <h4>Property Info</h4>
                        {property_name && (
                            <p>
                                <strong>Name:</strong> {property_name}
                            </p>
                        )}
                        {address && (
                            <p>
                                <strong>Address:</strong> {address}
                            </p>
                        )}
                    </>
                )}

                {/* Size details */}
                {hasSpaceDetails && (
                    <>
                        <h4>Space Details</h4>
                        {available_sf != null && (
                            <p>
                                <strong>Available SF:</strong> {available_sf}
                            </p>
                        )}
                        {building_size_sf != null && (
                            <p>
                                <strong>Building Size SF:</strong> {building_size_sf}
                            </p>
                        )}
                        {site_area_acres != null && (
                            <p>
                                <strong>Site Area (Acres):</strong> {site_area_acres}
                            </p>
                        )}
                        {site_area_sf != null && (
                            <p>
                                <strong>Site Area (SF):</strong> {site_area_sf}
                            </p>
                        )}
                    </>
                )}

                {/* Lease economics */}
                {hasEconomics && (
                    <>
                        <h4>Economics</h4>
                        {lease_rate_psf != null && (
                            <p>
                                <strong>Lease Rate:</strong>{" "}
                                {`$${lease_rate_psf}/SF${lease_rate_type ? ` ${lease_rate_type}` : ""
                                    }`}
                            </p>
                        )}
                        {nnn_psf != null && (
                            <p>
                                <strong>NNN:</strong> {`$${nnn_psf}/SF`}
                            </p>
                        )}
                    </>
                )}

                {/* Other property attributes */}
                {hasPropertyDetails && (
                    <>
                        <h4>Property Details</h4>
                        {year_built != null && (
                            <p>
                                <strong>Year Built:</strong> {year_built}
                            </p>
                        )}
                        {zoning && (
                            <p>
                                <strong>Zoning:</strong> {zoning}
                            </p>
                        )}
                        {parking_spaces != null && (
                            <p>
                                <strong>Parking Spaces:</strong> {parking_spaces}
                            </p>
                        )}
                    </>
                )}

                {/* Contacts, if present */}
                {Array.isArray(contacts) && contacts.length > 0 && (
                    <>
                        <h4>Contacts</h4>
                        <ul>
                            {contacts.map((c, idx) => (
                                <li key={idx}>
                                    {c.name && (
                                        <>
                                            <strong>{c.name}</strong>
                                            <br />
                                        </>
                                    )}
                                    {c.phone && (
                                        <>
                                            {c.phone}
                                            <br />
                                        </>
                                    )}
                                    {c.email && <>{c.email}</>}
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        );
    }

    // Lease-style document
    if (extracted.doc_type === "lease") {
        return (
            <div>
                <h4>Lease Summary</h4>
                <p>
                    <strong>Landlord / Property:</strong>{" "}
                    {extracted.property_name || "-"}
                </p>
                <p>
                    <strong>Tenant:</strong> {extracted.tenant || "-"}
                </p>
                <p>
                    <strong>Suite:</strong> {extracted.suite || "-"}
                </p>
                <p>
                    <strong>Address:</strong> {extracted.address || "-"}
                </p>

                <h4>Terms</h4>
                <p>
                    <strong>Square Feet:</strong>{" "}
                    {extracted.square_feet != null ? extracted.square_feet : "-"}
                </p>
                <p>
                    <strong>Base Rent:</strong>{" "}
                    {extracted.base_rent != null ? extracted.base_rent : "-"}
                </p>
                <p>
                    <strong>Lease Start:</strong> {extracted.lease_start || "-"}
                </p>
                <p>
                    <strong>Lease End:</strong> {extracted.lease_end || "-"}
                </p>
                <p>
                    <strong>Use:</strong> {extracted.unit_type || "-"}
                </p>

                {Array.isArray(extracted.additional_features) &&
                    extracted.additional_features.length > 0 && (
                        <>
                            <h4>Additional Features</h4>
                            <ul>
                                {extracted.additional_features.map((f, idx) => (
                                    <li key={idx}>{f}</li>
                                ))}
                            </ul>
                        </>
                    )}

                {extracted.rent_escalation_percent != null && (
                    <>
                        <h4>Rent Escalations</h4>
                        <ul>
                            <li>
                                Annual Increase: {extracted.rent_escalation_percent}%
                            </li>
                        </ul>
                    </>
                )}

                {extracted.security_deposit_amount != null && (
                    <>
                        <h4>Security Deposit</h4>
                        <ul>
                            <li>Amount: {extracted.security_deposit_amount}</li>
                        </ul>
                    </>
                )}

                {(extracted.renewal_term_years != null ||
                    extracted.renewal_notice_days != null) && (
                        <>
                            <h4>Renewal Option</h4>
                            <ul>
                                {extracted.renewal_term_years != null && (
                                    <li>
                                        Term: {extracted.renewal_term_years} year
                                        {extracted.renewal_term_years > 1 ? "s" : ""}
                                    </li>
                                )}
                                {extracted.renewal_notice_days != null && (
                                    <li>Notice: {extracted.renewal_notice_days} days</li>
                                )}
                            </ul>
                        </>
                    )}
            </div>
        );
    }

    // Fallback when doc_type is unknown
    return (
        <div>
            <h4>Document Summary</h4>
            <pre style={{ background: "#eee", padding: 10 }}>
                {JSON.stringify(extracted, null, 2)}
            </pre>
        </div>
    );
}

// Main PDF viewer + extracted data side-by-side
export default function PDFViewer({ fileUrl, extracted }) {
    const [numPages, setNumPages] = useState(null);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [highlights, setHighlights] = useState({});

    const onDocumentLoadSuccess = (doc) => {
        setNumPages(doc.numPages);
        setPdfDoc(doc);
    };

    useEffect(() => {
        if (!pdfDoc || !extracted) return;

        (async () => {
            const tempHighlights = {};

            for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                const page = await pdfDoc.getPage(pageNum);
                const content = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1 });

                const renderWidth = PAGE_RENDER_WIDTH;
                const scale = renderWidth / viewport.width;

                const items = content.items;
                const pageHls = [];

                items.forEach((item) => {
                    const rawText = item.str || "";
                    const text = rawText.trim();
                    if (!rawText) return;

                    const [a, b, c, d, x, y] = item.transform;

                    const left = x * scale;
                    const top = (viewport.height - y) * scale;
                    const width = (item.width || 0) * scale;
                    const height = (item.height || 16) * scale;

                    const pushHl = (label, color) => {
                        pageHls.push({
                            x: left,
                            y: top,
                            width,
                            height,
                            label,
                            color,
                        });
                    };

                    const lower = rawText.toLowerCase();

                    // Highlights for flyer fields
                    if (extracted.doc_type === "flyer") {
                        if (
                            extracted.available_sf &&
                            rawText.includes(
                                String(extracted.available_sf).replace(".0", "")
                            )
                        ) {
                            pushHl(
                                `Available SF: ${extracted.available_sf}`,
                                "rgba(0,255,0,0.4)"
                            );
                        }

                        if (
                            extracted.building_size_sf &&
                            rawText.includes(
                                String(extracted.building_size_sf).replace(".0", "")
                            )
                        ) {
                            pushHl(
                                `Building Size: ${extracted.building_size_sf}`,
                                "rgba(0,0,255,0.3)"
                            );
                        }

                        if (
                            extracted.lease_rate_psf &&
                            rawText.includes(
                                String(extracted.lease_rate_psf).replace(".0", "")
                            )
                        ) {
                            pushHl(
                                `Lease Rate: ${extracted.lease_rate_psf}/SF`,
                                "rgba(255,165,0,0.3)"
                            );
                        }

                        if (
                            extracted.nnn_psf &&
                            rawText.includes(
                                String(extracted.nnn_psf).replace(".0", "")
                            )
                        ) {
                            pushHl(
                                `NNN: ${extracted.nnn_psf}/SF`,
                                "rgba(255,0,0,0.3)"
                            );
                        }
                    }

                    // Highlights for lease fields
                    if (extracted.doc_type === "lease") {
                        if (extracted.property_name) {
                            const nameSnippet = extracted.property_name.split(",")[0];
                            if (nameSnippet && rawText.includes(nameSnippet)) {
                                pushHl(
                                    `Landlord / Property: ${extracted.property_name}`,
                                    "rgba(200,200,0,0.4)"
                                );
                            }
                        }

                        if (extracted.address) {
                            const streetPart = extracted.address.split(",")[0];
                            if (streetPart && rawText.includes(streetPart)) {
                                pushHl(
                                    `Address: ${extracted.address}`,
                                    "rgba(0,200,150,0.4)"
                                );
                            }
                        }

                        if (extracted.tenant && rawText.includes(extracted.tenant)) {
                            pushHl(
                                `Tenant: ${extracted.tenant}`,
                                "rgba(255,200,0,0.4)"
                            );
                        }

                        if (extracted.suite && text.includes(extracted.suite)) {
                            pushHl(
                                `Suite: ${extracted.suite}`,
                                "rgba(0,200,255,0.4)"
                            );
                        }

                        if (
                            extracted.base_rent &&
                            rawText.includes(
                                String(extracted.base_rent).replace(".0", "")
                            )
                        ) {
                            pushHl(
                                `Base Rent: ${extracted.base_rent}`,
                                "rgba(200,0,0,0.4)"
                            );
                        }

                        if (
                            extracted.square_feet &&
                            rawText.includes(
                                String(extracted.square_feet).replace(".0", "")
                            )
                        ) {
                            pushHl(
                                `Square Feet: ${extracted.square_feet}`,
                                "rgba(150,0,150,0.4)"
                            );
                        }

                        if (
                            extracted.lease_start &&
                            rawText.includes(extracted.lease_start)
                        ) {
                            pushHl(
                                `Lease Start: ${extracted.lease_start}`,
                                "rgba(0,150,0,0.4)"
                            );
                        }
                        if (
                            extracted.lease_end &&
                            rawText.includes(extracted.lease_end)
                        ) {
                            pushHl(
                                `Lease End: ${extracted.lease_end}`,
                                "rgba(0,150,150,0.4)"
                            );
                        }

                        if (extracted.rent_escalation_percent != null) {
                            const pctStr = `${extracted.rent_escalation_percent}%`;
                            if (rawText.includes(pctStr)) {
                                pushHl(
                                    `Annual Increase: ${pctStr}`,
                                    "rgba(255,100,0,0.4)"
                                );
                            }
                        }

                        if (lower.includes("security deposit")) {
                            pushHl(
                                "Security Deposit section",
                                "rgba(100,0,255,0.3)"
                            );
                        }

                        if (lower.includes("renewal option")) {
                            pushHl(
                                "Renewal Option section",
                                "rgba(0,100,255,0.3)"
                            );
                        }
                    }
                });

                if (pageHls.length) {
                    tempHighlights[pageNum] = pageHls;
                }
            }

            setHighlights(tempHighlights);
        })();
    }, [pdfDoc, extracted]);

    if (!fileUrl) {
        return <div>Please upload a PDF to view it.</div>;
    }

    return (
        <div style={{ display: "flex", gap: 20 }}>
            {/* Left: original PDF */}
            <div
                style={{
                    flex: 1,
                    border: "1px solid #ccc",
                    padding: 10,
                    maxHeight: "80vh",
                    overflowY: "auto",
                    position: "relative",
                }}
            >
                <h3>Original PDF</h3>
                <Document
                    file={fileUrl || null}
                    onLoadError={(error) => console.error("PDF load error:", error)}
                    onLoadSuccess={onDocumentLoadSuccess}
                >
                    {numPages &&
                        Array.from({ length: numPages }, (_, index) => {
                            const pageNum = index + 1;
                            return (
                                <div
                                    key={`page_${pageNum}`}
                                    style={{
                                        position: "relative",
                                        marginBottom: 20,
                                    }}
                                >
                                    <Page pageNumber={pageNum} width={PAGE_RENDER_WIDTH} />
                                    {(highlights[pageNum] || []).map((h, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                position: "absolute",
                                                left: h.x,
                                                top: h.y,
                                                width: h.width,
                                                height: h.height,
                                                backgroundColor: h.color,
                                                pointerEvents: "none",
                                            }}
                                            title={h.label}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                </Document>
            </div>

            {/* Right: extracted fields */}
            <div
                style={{
                    flex: 1,
                    border: "1px solid #ccc",
                    padding: 10,
                    maxHeight: "80vh",
                    overflowY: "auto",
                }}
            >
                <h3>Extracted Data</h3>
                <RenderExtracted extracted={extracted} />
            </div>
        </div>
    );
}
