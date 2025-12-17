// FileUpload.jsx
import React, {
  useRef,
  useState,
  useCallback,
  useContext,
  useEffect,
} from "react";
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
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);

  const id = (f) => `${f.name}_${f.size}_${f.lastModified}`;

  const addFiles = useCallback(
    (fileList) => {
      const arr = Array.from(fileList || []);
      if (arr.length === 0) return;
      setFiles((prev) => {
        const next = [...prev];
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
        return next;
      });
    },
    [maxSizeBytes]
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
  const uploadAll = async () => {
    if (files.length === 0) {
      setInfo("No files to upload.");
      return;
    }

    const file = files[0].file; // current behaviour: upload first file only
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setInfo("Please log in to upload.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const resp = await fetch(
        "http://127.0.0.1:8000/upload/profile/upload_resume",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // DO NOT set Content-Type for multipart/form-data
          },
          body: formData,
        }
      );

      // Try to parse JSON if possible, but gracefully handle non-JSON
      let data = null;
      try {
        data = await resp.clone().json();
      } catch (jsonErr) {
        // Not JSON — we'll still handle status codes and show friendly messages
        data = null;
      }

      if (!resp.ok) {
        // Prefer a short friendly message. If backend gives `message`, show it briefly.
        const serverMessage =
          (data && (data.message || data.error || data.detail)) || null;
        console.error("Upload failed:", { status: resp.status, data });
        setInfo(serverMessage ? `Upload failed: ${serverMessage}` : "Upload failed.");
        setUploadSuccess(false);
        return;
      }

      // success
      // adapt to common response shapes
      const resumeUrl =
        (data && (data.url || data.file_url)) ||
        (data && data.filename ? `/uploads/${data.filename}` : null) ||
        null;
      const resumeFilename = (data && data.filename) || file.name;

      // Build stored object; if URL missing we still store a minimal object
      const resumeObj = {
        url: resumeUrl,
        file: { name: resumeFilename, size: file.size },
        uploaded_at: new Date().toISOString(),
      };

      // persist for other parts of app (sidebar)
      try {
        localStorage.setItem("resume", JSON.stringify(resumeObj));
        if (typeof setResume === "function") setResume(resumeObj);
        window.dispatchEvent(
          new CustomEvent("resume-updated", { detail: resumeObj })
        );
      } catch (e) {
        console.warn("Failed to persist resume to localStorage:", e);
      }

      // show friendly notice to user
      setInfo(`Uploaded successfully: ${resumeFilename}`);
      setUploadSuccess(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setUploadSuccess(false);
        toastTimerRef.current = null;
      }, 3000);

      // remove uploaded file from queue
      setFiles((prev) => prev.filter((x) => x.id !== id(file)));

      // keep server response in console for debugging only
      console.log("Upload response:", data);
    } catch (err) {
      console.error("Error uploading file:", err);
      setInfo("Error uploading file.");
      setUploadSuccess(false);
    }
  };

  return (
    <div className="fd-wrapper fd-full">
      <div className="sa-layout sa-center">
        <div className="sa-left">
          {uploadSuccess && (
            <div
              className="fd-uploaded-popup"
              role="status"
              aria-live="polite"
            >
              File uploaded
            </div>
          )}

          <h2 className="fd-title">File Upload</h2>
          <p className="fd-sub"> (PDF or .docx)</p>

          <div
            className={`fd-dropzone ${dragOver ? "drag-over" : ""} ${
              uploadSuccess ? "upload-success" : ""
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            role="button"
            onClick={() => inputRef.current && inputRef.current.click()}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                inputRef.current && inputRef.current.click();
              }
            }}
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

              <div className="fd-note">Max file size {friendlySize(maxSizeBytes)}.</div>

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
                    <div className="fd-file-meta">{friendlySize(f.file.size)}</div>
                    {f.error && <div className="fd-file-error">{f.error}</div>}
                  </div>

                  <div className="fd-file-right">
                    <button className="fd-remove" onClick={() => removeFile(f.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="fd-actions">
            <button className="fd-clear" onClick={clearAll} disabled={files.length === 0}>
              Clear
            </button>
            <button className="fd-upload" onClick={uploadAll} disabled={files.length === 0}>
              Upload
            </button>
          </div>

          <aside className="fd-side-info" aria-hidden={false}>
            <h3 className="fd-side-title">Quick Tips</h3>
            <ul>
              <li>Prefer PDF for best formatting and parsing.</li>
              <li>Keep contact information on the top of the resume.</li>
              <li>Remove sensitive personal data if sharing publicly.</li>
            </ul>
          </aside>

          <div className={`fd-info ${uploadSuccess ? "fd-info--success" : ""}`}>{info}</div>
        </div>
      </div>
    </div>
  );
}
