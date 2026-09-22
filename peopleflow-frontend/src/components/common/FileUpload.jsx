import React, { useId, useState } from 'react';
import { UploadCloud, FileCheck2 } from 'lucide-react';

/**
 * Click or drag-and-drop file picker. Validates size client-side so users get
 * instant feedback instead of waiting for the upload to be rejected.
 */
export function FileUpload({
  label,
  hint = 'PDF, DOC, DOCX, PNG or JPG (max. 10MB)',
  accept,
  maxSizeMb = 10,
  onSelect,
  onError,
  disabled = false,
  uploading = false,
  selectedName,
}) {
  const id = useId();
  const [dragging, setDragging] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > maxSizeMb * 1024 * 1024) {
      onError?.(`File must be smaller than ${maxSizeMb}MB`);
      return;
    }
    onSelect(file);
  };

  return (
    <div className="form-group">
      {label && <span className="form-label">{label}</span>}
      <label
        htmlFor={id}
        className={`file-upload-box ${dragging ? 'dragging' : ''}`}
        style={disabled || uploading ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          id={id}
          type="file"
          accept={accept}
          disabled={disabled || uploading}
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <div className="upload-icon-wrapper">
          {uploading ? <span className="spinner" /> : selectedName ? <FileCheck2 size={22} /> : <UploadCloud size={22} />}
        </div>
        <p className="text-sm text-bold">
          {uploading ? 'Uploading…' : selectedName || (
            <>Click to upload <span className="text-muted" style={{ fontWeight: 400 }}>or drag and drop</span></>
          )}
        </p>
        <span className="text-xs text-faint">{hint}</span>
      </label>
    </div>
  );
}
