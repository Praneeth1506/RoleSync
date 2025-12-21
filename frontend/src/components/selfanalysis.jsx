import React, { useRef, useState, useCallback, useContext, useEffect } from "react";
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
  const [jobRole, setJobRole] = useState("");

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [responseData, setResponseData] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
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
      setProgress(0);
      setResponseData(null);
      setInfo("");
      setError("");
    },
    [files, maxSizeBytes]
  );

  const friendlySize = (n) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    if (n < 1024 * 1024 * 1024) return `${Math.round(n / (1024 * 1024))} MB`;
    return `${Math.round(n / (1024 * 1024 * 1024))} GB`;
  };

  const removeFile = (idToRemove) => setFiles((prev) => prev.filter((f) => f.id !== idToRemove));
  const clearAll = () => {
    setFiles([]);
    setProgress(0);
    setResponseData(null);
    setError("");
    setInfo("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  /* ---------------- Upload & Analyse ---------------- */

  const uploadAll = async () => {
    if (files.length === 0 && !jobRole.trim()) {
      setError("Please select a file or enter a job role");
      return;
    }

    setError("");
    setInfo("Uploading...");
    setUploading(true);
    setProgress(0);
    setResponseData(null);

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Access token missing");
      setUploading(false);
      setInfo("");
      return;
    }

    try {
      const fd = new FormData();
      if (files.length > 0) fd.append("file", files[0].file);
      if (jobRole.trim()) {
        fd.append("job_role", jobRole.trim());
        fd.append("text", jobRole.trim());
      }

      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            setResponseData(data);
            setInfo("Analysis received.");
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch {}
          } catch {
            setError("Failed to parse response");
            setInfo("");
          }
          if (files.length > 0) uploadResume?.(files[0]);
        } else {
          setError(`Upload failed: ${xhr.status}`);
          setInfo("");
        }
        setUploading(false);
      };

      xhr.onerror = () => {
        setError("Upload failed");
        setInfo("");
        setUploading(false);
      };

      xhr.send(fd);
    } catch (err) {
      setError("Upload failed");
      setInfo("");
      setUploading(false);
    }
  };

  /* ---------------- Load previous analysis ---------------- */

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setResponseData(JSON.parse(raw));
        setInfo("Loaded previous analysis from localStorage.");
      }
    } catch {}
  }, []);

  /* ---------------- Render analysis ---------------- */

  const renderAnalysis = (d) => {
    if (!d) return null;
    const ats = d.ats_score ?? d.ATS_score ?? null;
    const match = d.match_score ?? null;
    const skillGap = d.skill_gap ?? d.skillGap ?? [];
    const feedback = d.feedback ?? {};
    const learning = d.learning_path ?? {};
    const timestamp = d.timestamp ?? d.time ?? null;

    return (
      <div className="analysis-card" style={{ marginTop: 18 }}>
        <h3>Self-analysis result</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          {ats != null && (
            <div className="metric" style={{ padding: 10, borderRadius: 8, minWidth: 120 }}>
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

        {feedback.summary && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>Summary</div>
            <div style={{ marginTop: 6 }}>{feedback.summary}</div>
          </div>
        )}

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

        {timestamp && <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>Result timestamp: {new Date(timestamp).toLocaleString()}</div>}

        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={() => setShowRaw((s) => !s)}>
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

  /* ---------------- Render UI ---------------- */

  return (
    <div className="fd-wrapper fd-full">
      <div className="sa-layout">
        {/* LEFT PANEL */}
        <div className="sa-left">
          <h2 className="fd-title">Self Analysis</h2>
          <p className="fd-sub">Job Description (PDF or .docx)</p>

          <div
            className={`fd-dropzone ${dragOver ? "drag-over" : ""}`}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
              setDragOver(false);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} className="fd-input" type="file" accept={accept} multiple={multiple} onChange={(e) => addFiles(e.target.files)} />
            <div className="fd-inner">
              <button type="button" className="fd-choose">📁 Choose File</button>
              {uploading && <div>Uploading… {progress}%</div>}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
            {files.map((f) => (
              <div key={f.id} className="fd-file">
                <div>{f.file.name} ({friendlySize(f.file.size)})</div>
                {f.error && <div style={{ color: "crimson" }}>{f.error}</div>}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button className="fd-upload" onClick={uploadAll} disabled={uploading}>{uploading ? "Uploading…" : "Upload & Analyse"}</button>
            <button className="fd-clear" onClick={clearAll}>Clear</button>
          </div>

          <div style={{ marginTop: 18 }}>
            <label>Enter Job role</label>
            <input value={jobRole} onChange={(e) => setJobRole(e.target.value)} className="sa-job-input" placeholder="Job role (optional)" />
          </div>

          {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}
          {info && <div style={{ color: "green", marginTop: 8 }}>{info}</div>}
        </div>

        {/* RIGHT PANEL */}
        <div className="sa-right">
          <div className="sa-results-container">
            {!responseData && !uploading && <div>Upload the file to analyse</div>}
            {responseData && renderAnalysis(responseData)}
          </div>
        </div>
      </div>
    </div>
  );
}
