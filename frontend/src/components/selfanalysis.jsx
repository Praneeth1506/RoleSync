import React, { useRef, useState, useCallback, useContext } from "react";
import "../components-css/Fileupload.css";
import { ResumeContext } from "../components/ResumeProvider";

export default function Selfan({
  multiple = true,
  accept = ".pdf,.doc,.docx,image/*",
  maxSizeBytes = 1073741824,
  endpoint = "http://127.0.0.1:8000/api/ai/self_analysis",
}) {
  const { uploadResume } = useContext(ResumeContext);
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [info, setInfo] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [responseData, setResponseData] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const STORAGE_KEY = "selfAnalysisResponse_v1";

  const id = (f) => `${f.name}_${f.size}_${f.lastModified}`;

  const addFiles = useCallback(
    (fileList) => {
      const arr = Array.from(fileList);
      const next = [...files];

      arr.forEach((f) => {
        const fid = id(f);
        if (!next.some((x) => x.id === fid)) {
          let err = null;
          if (maxSizeBytes && f.size > maxSizeBytes) err = "File exceeds max size";
          next.push({ file: f, id: fid, error: err, progress: 0 });
        }
      });

      setFiles(next);
    },
    [files, maxSizeBytes]
  );

  const handleInputChange = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const removeFile = (idToRemove) => {
    setFiles((prev) => prev.filter((f) => f.id !== idToRemove));
  };

  const clearAll = () => {
    setFiles([]);
    setInfo("");
    setResponseData(null);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  };

  const friendlySize = (n) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    if (n < 1024 * 1024 * 1024) return `${Math.round(n / (1024 * 1024))} MB`;
    return `${Math.round(n / (1024 * 1024 * 1024))} GB`;
  };

  // Build FormData, send request with Bearer token from localStorage.accessToken
  const uploadAll = async () => {
    setError(null);
    setResponseData(null);

    // Check token
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("No access token found in localStorage under key 'accessToken'.");
      return;
    }

    // If no file and no jobRole, warn
    if (files.length === 0 && (!jobRole || jobRole.trim() === "")) {
      setInfo("Please choose a file or enter a job role.");
      return;
    }

    setLoading(true);
    setInfo("Uploading...");
    try {
      const fd = new FormData();
      // attach first file (or all files as 'files[]' depending on backend)
      if (files.length > 0) {
        // If backend expects single file field 'file' use fd.append('file', files[0].file)
        // We will attach all files as 'files' for safety and also attach first as 'file'
        files.forEach((f, i) => {
          fd.append("files", f.file); // many backends accept 'files' array
        });
        // also send single file field
        fd.append("file", files[0].file);
      }

      // attach job role / text input
      if (jobRole && jobRole.trim() !== "") {
        fd.append("job_role", jobRole.trim());
        fd.append("text", jobRole.trim()); // add a fallback key name
      }

      // If you want to show that resume was uploaded to context also call uploadResume
      if (files.length > 0 && typeof uploadResume === "function") {
        // uploadResume expects a single file object (as you used before)
        try {
          uploadResume(files[0]); // passive UI context update
        } catch (ctxErr) {
          // ignore; context upload is optional
        }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          // DO NOT set Content-Type when sending FormData — the browser sets the boundary automatically
          Authorization: `Bearer ${token}`,
          // Accept: "application/json" // optional
        },
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text}`);
      }

      // Expecting JSON
      const data = await res.json();
      setResponseData(data);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn("Failed to persist analysis to localStorage", e);
      }
      setInfo("Analysis received.");
    } catch (err) {
      setError(err.message || "Upload failed.");
      setInfo("");
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setResponseData(parsed);
        setInfo("Loaded previous analysis from localStorage.");
      }
    } catch (e) {
      // ignore parse errors
      console.warn("Failed to load persisted analysis", e);
    }
  }, []);
  // helper to render structured response (based on sample you supplied)
  const renderAnalysis = (d) => {
    if (!d) return null;

    // defensive access with fallbacks
    const ats = d.ats_score ?? d.ATS_score ?? null;
    const match = d.match_score ?? null;
    const skillGap = d.skill_gap ?? d.skill_gap ?? d.skillGap ?? [];
    const feedback = d.feedback ?? {};
    const learning = d.learning_path ?? {};
    const timestamp = d.timestamp ?? d.time ?? null;
    
    return (
      <div className="analysis-card" style={{ marginTop: 18 }}>
        <h3>Self-analysis result</h3>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          {ats != null && (
            <div className="metric" style={{ padding: 10, borderRadius: 8, boxShadow: "var(--shadow, 0 1px 4px rgba(0,0,0,0.06))", minWidth: 120 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>ATS Score</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{ats}</div>
            </div>
          )}
          {match != null && (
            <div className="metric" style={{ padding: 10, borderRadius: 8, minWidth: 120 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Match Score</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{match}</div>
            </div>
          )}
          {d.candidate_id && (
            <div style={{ padding: 10, borderRadius: 8, minWidth: 160 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Candidate ID</div>
              <div style={{ fontSize: 14 }}>{d.candidate_id}</div>
            </div>
          )}
        </div>

        {/* Summary */}
        {feedback.summary && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>Summary</div>
            <div style={{ marginTop: 6 }}>{feedback.summary}</div>
          </div>
        )}

        {/* Skill gaps */}
        {Array.isArray(skillGap) && skillGap.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>Skill gaps</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {skillGap.map((s, i) => (
                <span key={i} style={{ padding: "6px 10px", background: "#f3f4f6", borderRadius: 999, fontSize: 13 }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {Array.isArray(feedback.recommendations) && feedback.recommendations.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>Recommendations</div>
            <ul style={{ marginTop: 8 }}>
              {feedback.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Learning path */}
        {learning.next_steps && Array.isArray(learning.next_steps) && learning.next_steps.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>Learning path — next steps</div>
            <ol style={{ marginTop: 8 }}>
              {learning.next_steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {timestamp && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
            Result timestamp: {new Date(timestamp).toLocaleString() || timestamp}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={() => setShowRaw((s) => !s)} style={{ cursor: "pointer" }}>
            {showRaw ? "Hide raw JSON" : "Show raw JSON"}
          </button>
        </div>

        {showRaw && (
          <pre style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "#0f172a", color: "#e6eef8", overflowX: "auto" }}>
            {JSON.stringify(d, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <div className="fd-wrapper">
      <h2 className="fd-title">Self Analysis</h2>
      <p className="fd-sub">Job Description (PDF or .docx)</p>

      <div
        className={`fd-dropzone ${dragOver ? "drag-over" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        onClick={() => inputRef.current && inputRef.current.click()}
      >
        <input
          ref={inputRef}
          className="fd-input"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
        />

        <div className="fd-inner">
          <button
            type="button"
            className="fd-choose"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current && inputRef.current.click();
            }}
          >
            <span className="fd-choose-icon">📁</span>
            <span className="fd-choose-text">Choose File</span>
            <span className="fd-choose-arrow">▾</span>
          </button>

          <div className="fd-note" style={{ fontSize: "11px" }}>
            Max file size {friendlySize(maxSizeBytes)}.
          </div>

          <div className="fd-draghint">or drag & drop files here</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", marginTop: "18px" }}>
        <div className="fd-files" style={{ flex: 1 }}>
          {files.length === 0 ? (
            <div className="fd-empty" style={{ padding: "6px 10px", fontSize: "12px", textAlign: "left" }}>
              No files selected
            </div>
          ) : (
            files.map((f) => (
              <div className="fd-file" key={f.id}>
                <div className="fd-file-left">
                  <div className="fd-file-name">{f.file.name}</div>
                  <div className="fd-file-meta" style={{ fontSize: "11px" }}>
                    {friendlySize(f.file.size)}
                  </div>
                  {f.error && <div className="fd-file-error">{f.error}</div>}
                </div>

                <div className="fd-file-right">
                  <button className="fd-remove" onClick={() => removeFile(f.id)} title="Remove file">
                    ✕
                  </button>

                  <div className="fd-progress-outer" aria-hidden>
                    <div className="fd-progress" style={{ width: `${f.progress}%` }} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="fd-actions" style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "120px" }}>
          <button className="fd-clear" onClick={clearAll} disabled={files.length === 0 && !jobRole} style={{ width: "100%" }}>
            Clear
          </button>
          <button className="fd-upload" onClick={uploadAll} disabled={loading} style={{ width: "100%" }}>
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: "18px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "var(--text)" }}>Enter Job role</label>
        <input
          value={jobRole}
          onChange={(e) => setJobRole(e.target.value)}
          type="text"
          placeholder="Job role (e.g., ML Engineer)"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #e6edf8",
            fontSize: "14px",
            color: "#374151",
            fontFamily: "inherit",
            boxSizing: "border-box",
            transition: "border-color 200ms ease, box-shadow 200ms ease",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#6366f1";
            e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#e6edf8";
            e.target.style.boxShadow = "none";
          }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="fd-info" style={{ color: error ? "crimson" : "#374151" }}>
          {error ? `Error: ${error}` : info}
        </div>
      </div>

      {/* Render analysis result */}
      <div style={{ marginTop: 18 }}>{renderAnalysis(responseData)}</div>
    </div>
  );
}
