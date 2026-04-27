"use client";

import { useState } from "react";

export default function ImageIngredientImporter({ onClose, onResult }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [candidates, setCandidates] = useState([]);

  const handleFile = (f) => {
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const runExtract = async () => {
    // Simulate extraction loading and populate with the hard-coded list
    setRunning(true);
    setProgress(10);
    // pretend to 'process' for UX
    await new Promise((res) => setTimeout(res, 700));
    setProgress(50);
    await new Promise((res) => setTimeout(res, 700));
    setProgress(90);
    await new Promise((res) => setTimeout(res, 400));

    const sampleList = [
      "cream cheese",
      "tomato soup",
      "peanuts",
      "miracle whip",
      "classic white cake",
      "ranch",
      "chocolate whipped frosting",
      "yeast",
      "chicken broth",
      "bbq sauce",
      "corn",
      "cream of chicken",
      "mustard",
      "diced tomatoes",
      "greek vinaigrette",
      "beans",
    ];

    setCandidates(sampleList);
    setRunning(false);
    setProgress(0);
  };

  const confirmSelection = () => {
    const selected = candidates
      .map((c) => (typeof c === "string" ? c.trim().toLowerCase() : ""))
      .filter(Boolean);
    onResult(Array.from(new Set(selected)));
  };

  const toggleCandidate = (idx) => {
    setCandidates((prev) => prev.filter((_, i) => i !== idx));
  };

  const setCandidateValue = (idx, val) => {
    setCandidates((prev) => prev.map((p, i) => (i === idx ? val : p)));
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: 680, background: "#fff", borderRadius: 12, overflow: "hidden", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <strong>Upload photo to extract ingredients</strong>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>Close</button>
          </div>
        </div>

        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {preview && (
            <div style={{ marginTop: 12 }}>
              <img src={preview} alt="preview" style={{ width: "100%", borderRadius: 8 }} />
            </div>
          )}

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={runExtract} disabled={!file || running} style={{ padding: "8px 12px", background: "#2d5a27", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
              {running ? `Extracting (${progress}%)` : "Extract Ingredients"}
            </button>
            <button onClick={() => { setCandidates([]); setFile(null); setPreview(null); }} style={{ padding: "8px 12px", background: "#e5e7eb", border: "none", borderRadius: 8 }}>
              Clear
            </button>
          </div>

          {/* REVIEW / CONFIRM AREA */}
          {candidates && candidates.length > 0 && (
            <div style={{ marginTop: 14, borderTop: "1px solid #eef2f7", paddingTop: 12 }}>
              <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Review extracted items</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "40vh", overflowY: "auto", paddingRight: 8 }}>
                {candidates.map((c, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={true} readOnly style={{ width: 18, height: 18 }} />
                    <input value={c} onChange={(e) => setCandidateValue(idx, e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #e6eef6" }} />
                    <button onClick={() => toggleCandidate(idx)} style={{ background: "#fff", border: "1px solid #eee", padding: "6px 8px", borderRadius: 8 }}>Remove</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={confirmSelection} style={{ padding: "8px 12px", background: "#16a34a", color: "white", border: "none", borderRadius: 8 }}>Add Selected to Pantry</button>
                <button onClick={() => { setCandidates([]); }} style={{ padding: "8px 12px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

