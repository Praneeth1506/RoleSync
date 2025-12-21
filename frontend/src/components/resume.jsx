import React from "react";
import FileUpload from "./fileupload";
import "../components-css/resume.css";

export default function ResumePage() {
  return (
    <div className="resume-page">
      <FileUpload multiple={false} />
    </div>
  );
}
