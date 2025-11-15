// frontend/src/components/UploadPDF.jsx
import React, { useState } from "react";
import { uploadPDF } from "../api/api";
import PDFViewer from "./PDFViewer";

export default function UploadPDF() {
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [fileUrl, setFileUrl] = useState(null);

    const handleUpload = async () => {
        if (!file) {
            alert("Select a PDF first");
            return;
        }

        try {
            const res = await uploadPDF(file);
            console.log("Upload response:", res.data);
            setResult(res.data.structured || res.data);
            setFileUrl(URL.createObjectURL(file));
        } catch (err) {
            console.error("Upload error:", err.response?.data || err.message);
            alert(
                "Upload failed: " + (err.response?.data?.error || err.message || "Error")
            );
        }
    };

    return (
        <div style={{ padding: 20 }}>
            <h2>Upload PDF</h2>
            <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                    setResult(null);
                    setFileUrl(null);
                    setFile(e.target.files[0]);
                }}
            />
            <button onClick={handleUpload} style={{ marginLeft: 10 }}>
                Upload & Extract
            </button>

            {file && result && (
                <div style={{ marginTop: 20 }}>
                    <PDFViewer fileUrl={fileUrl} extracted={result} />
                </div>
            )}
        </div>
    );
}
