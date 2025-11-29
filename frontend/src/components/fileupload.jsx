import React, { useRef, useState, useCallback, useContext } from "react";
import { ResumeContext } from "./ResumeProvider";

export default function FileUpload({
  multiple = true,
  accept = ".pdf,.doc,.docx,image/*",
  maxSizeBytes = 1073741824,
}) {
  const { setResume } = useContext(ResumeContext);
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [info, setInfo] = useState("");

  const id = (f) => `${f.name}_${f.size}_${f.lastModified}`;

  const addFiles = useCallback(
    (fileList) => {
      const arr = Array.from(fileList);
      const next = [...files];

      arr.forEach((f) => {
        const fid = id(f);
        if (!next.some((x) => x.id === fid)) {
          let error = null;
          if (maxSizeBytes && f.size > maxSizeBytes) {
            error = "File exceeds max size";
          }
          next.push({ file: f, id: fid, error, progress: 0 });
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
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeFile = (idToRemove) => {
    setFiles((prev) => prev.filter((f) => f.id !== idToRemove));
  };

  const clearAll = () => setFiles([]);

  const friendlySize = (n) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    if (n < 1024 * 1024 * 1024) return `${Math.round(n / (1024 * 1024))} MB`;
    return `${Math.round(n / (1024 * 1024 * 1024))} GB`;
  };

  // === MAIN UPLOAD FUNCTION ===
  // === MAIN UPLOAD FUNCTION (replace your current uploadAll) ===
const uploadAll = async () => {
  if (files.length === 0) {
    setInfo("No files to upload.");
    return;
  }

  const file = files[0].file; // Only first file

  try {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setInfo("No token found. Please login.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      "http://127.0.0.1:8000/upload/profile/upload_resume",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // DO NOT set Content-Type — browser sets multipart/form-data with boundary
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const err = await response.text();
      setInfo("Upload failed: " + err);
      return;
    }

    const data = await response.json();
    // adapt field names if your backend returns different keys
    const resumeUrl = data.url || data.file_url || data.filename && (`/uploads/${data.filename}`) || null;
    const resumeFilename = data.filename || file.name;

    if (!resumeUrl) {
      // If backend doesn't return a URL, but returns filename, you may need to construct URL.
      // For now store whatever backend returned.
      setInfo("Upload returned unexpected response: " + JSON.stringify(data));
      return;
    }

    const resumeObj = {
      url: resumeUrl,
      file: { name: resumeFilename, size: file.size },
      uploaded_at: new Date().toISOString(),
    };

    // persist for other parts of app (sidebar)
    try {
      localStorage.setItem("resume", JSON.stringify(resumeObj));
      // notify other components/tabs
      if (typeof setResume === "function") setResume(resumeObj);
      window.dispatchEvent(new CustomEvent("resume-updated", { detail: resumeObj }));
    } catch (e) {
      console.warn("Failed to persist resume to localStorage:", e);
    }

    setInfo("Uploaded successfully: " + resumeFilename);
    // optionally remove the uploaded file from queue
    setFiles((prev) => prev.filter((x) => x.id !== id(file)));
  } catch (err) {
    console.error(err);
    setInfo("Error uploading file.");
  }
};


  return (
    <div className="fd-wrapper">
      <h2 className="fd-title">File upload</h2>
      <p className="fd-sub"></p>

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

          <div className="fd-note">
            Max file size {friendlySize(maxSizeBytes)}.
          </div>

          <div className="fd-draghint">or drag & drop files here</div>
        </div>
      </div>

      <div className="fd-files">
        {files.length === 0 ? (
          <div className="fd-empty">No files selected</div>
        ) : (
          files.map((f) => (
            <div className="fd-file" key={f.id}>
              <div className="fd-file-left">
                <div className="fd-file-name">{f.file.name}</div>
                <div className="fd-file-meta">
                  {friendlySize(f.file.size)}
                </div>
                {f.error && (
                  <div className="fd-file-error">{f.error}</div>
                )}
              </div>

              <div className="fd-file-right">
                <button
                  className="fd-remove"
                  onClick={() => removeFile(f.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="fd-actions">
        <button
          className="fd-clear"
          onClick={clearAll}
          disabled={files.length === 0}
        >
          Clear
        </button>
        <button
          className="fd-upload"
          onClick={uploadAll}
          disabled={files.length === 0}
        >
          Upload
        </button>
      </div>

      <div className="fd-info">{info}</div>
    </div>
  );
}
