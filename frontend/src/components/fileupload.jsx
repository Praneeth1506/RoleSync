import React, { useRef, useState, useCallback } from "react";
import "../components-css/Fileupload.css";

/**
 * FileDrop
 * - Drag & drop + "Choose Files" button
 * - Shows selected file(s) list and sizes
 * - Provides upload hooks (you can wire axios in uploadAll)
 *
 * Props:
 *  - multiple (bool) default true
 *  - accept (string) e.g. ".pdf,.doc,.docx,image/*"
 *  - maxSizeBytes (number) optional, to show max file notice
 *  - onUpload(fileList) optional callback invoked when user clicks Upload
 */
export default function FileUpload({
  multiple = true,
  accept = ".pdf,.doc,.docx,image/*",
  maxSizeBytes = 1073741824, // 1 GB by default (for display only)
  onUpload = null,
}) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]); // { file, id, error, progress }
  const [dragOver, setDragOver] = useState(false);
  const [info, setInfo] = useState("");

  const id = (f) => `${f.name}_${f.size}_${f.lastModified}`;

  const addFiles = useCallback(
    (fileList) => {
      const arr = Array.from(fileList);
      const next = [...files];

      arr.forEach((f) => {
        const fid = id(f);
        // avoid duplicates
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

  function handleInputChange(e) {
    addFiles(e.target.files);
    // reset input to allow re-selecting same file if needed
    e.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function removeFile(idToRemove) {
    setFiles((prev) => prev.filter((f) => f.id !== idToRemove));
  }

  function clearAll() {
    setFiles([]);
  }

  // Example upload handler — NOT wired to axios here.
  // If you want to use axios, replace the body of this function.
  async function uploadAll() {
    if (files.length === 0) {
      setInfo("No files to upload.");
      return;
    }
    setInfo("Starting upload...");

    // If onUpload prop provided, call it with list of File objects
    if (typeof onUpload === "function") {
      try {
        await onUpload(files.map((f) => f.file));
        setInfo("Upload finished (callback succeeded).");
      } catch (err) {
        setInfo("Upload callback failed.");
      }
      return;
    }

    // Local fake progress demo to show UI behavior
    setFiles((prev) => prev.map((f) => ({ ...f, progress: 0 })));
    for (let i = 0; i < files.length; i++) {
      // simulate upload in steps
      for (let p = 0; p <= 100; p += 10) {
        await new Promise((r) => setTimeout(r, 25));
        setFiles((prev) =>
          prev.map((x, idx) => (idx === i ? { ...x, progress: p } : x))
        );
      }
    }
    setInfo("All uploads simulated (no network).");
  }

  const friendlySize = (n) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    if (n < 1024 * 1024 * 1024) return `${Math.round(n / (1024 * 1024))} MB`;
    return `${Math.round(n / (1024 * 1024 * 1024))} GB`;
  };

  return (
    <div className="fd-wrapper">
      <h2 className="fd-title">Resume Shortlister</h2>
      <p className="fd-sub">File upload</p>

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
            <span className="fd-choose-text">Choose Files</span>
            <span className="fd-choose-arrow">▾</span>
          </button>

          <div className="fd-note">
            Max file size {friendlySize(maxSizeBytes)}.
            <a
              className="fd-link"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setInfo("Sign up link clicked (demo).");
              }}
            >
              {" "}
              Sign Up
            </a>{" "}
            for more
          </div>

          <div className="fd-draghint">or drag & drop files here</div>
        </div>
      </div>

      {/* Files list */}
      <div className="fd-files">
        {files.length === 0 ? (
          <div className="fd-empty">No files selected</div>
        ) : (
          files.map((f) => (
            <div className="fd-file" key={f.id}>
              <div className="fd-file-left">
                <div className="fd-file-name">{f.file.name}</div>
                <div className="fd-file-meta">{friendlySize(f.file.size)}</div>
                {f.error && <div className="fd-file-error">{f.error}</div>}
              </div>

              <div className="fd-file-right">
                <button
                  className="fd-remove"
                  onClick={() => removeFile(f.id)}
                  title="Remove file"
                >
                  ✕
                </button>

                <div className="fd-progress-outer" aria-hidden>
                  <div
                    className="fd-progress"
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="fd-actions">
        <button className="fd-clear" onClick={clearAll} disabled={files.length === 0}>
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
