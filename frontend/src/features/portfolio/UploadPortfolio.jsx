import { useRef, useState } from "react";

export default function UploadPortfolio({
  file,
  onFileSelect,
  onSubmit,
  loading = false,
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    onFileSelect?.(nextFile);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const nextFile = event.dataTransfer.files?.[0] || null;
    onFileSelect?.(nextFile);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="portfolio-upload">
      <div>
        <h2>Upload your CAMS statement</h2>
        <p>PDF only. We will extract holdings and compute health metrics.</p>
      </div>

      <div
        className={`portfolio-dropzone ${isDragging ? "is-dragging" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="portfolio-file-input"
        />
        <div>
          <p className="portfolio-drop-title">Drag & drop your CAMS PDF</p>
          <p className="portfolio-drop-subtitle">or click to browse files</p>
        </div>
      </div>

      <div className="portfolio-file-row">
        <span className="portfolio-file-pill">
          {file ? file.name : "No file selected"}
        </span>
        <button
          type="button"
          className="portfolio-button"
          onClick={onSubmit}
          disabled={loading}
        >
          Analyze Portfolio
        </button>
      </div>
    </div>
  );
}
