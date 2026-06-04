"use client";

/**
 * UploadModal — drag-and-drop / file-picker upload for FIT, TCX, GPX files.
 *
 * Flow:
 *  1. User drags or picks a file (.fit | .tcx | .gpx | .fit.gz)
 *  2. Preview shows filename + size
 *  3. "Upload" calls apiUpload → POST /activities/upload multipart/form-data
 *  4. On success: shows confirmation, calls onSuccess(activityId) → parent can navigate
 *  5. On error: inline error message
 *
 * Design spec: docs/09-design-system.md § Modals
 */

import * as React from "react";
import { useState, useRef, useCallback, useEffect } from "react";
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiUpload, ApiError } from "@/lib/api";
import { ERROR_CODES } from "@/lib/errors";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface UploadModalProps {
  onClose: () => void;
  /** Called after a successful upload with the new activity ID */
  onSuccess?: (activityId: string) => void;
}

const ACCEPTED_EXTS = [".fit", ".tcx", ".gpx"];
const ACCEPTED_MIME = [
  "application/octet-stream",
  "application/vnd.ant.fit",
  "application/xml",
  "text/xml",
  "application/gpx+xml",
];
const MAX_MB = 25;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExt(name: string): string {
  return "." + name.split(".").pop()!.toLowerCase();
}

function isValidFile(file: File): string | null {
  const ext = getFileExt(file.name);
  if (!ACCEPTED_EXTS.includes(ext)) {
    return `File type "${ext}" is not supported. Use .fit, .tcx, or .gpx.`;
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return `File is too large (max ${MAX_MB} MB).`;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  // BUG-1 fix: track duplicate activity ID for 409 responses
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Close on Escape ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !uploading) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, uploading]);

  /* ── File selection ── */
  const acceptFile = useCallback((incoming: File) => {
    setUploadError(null);
    const err = isValidFile(incoming);
    if (err) {
      setFileError(err);
      setFile(null);
    } else {
      setFileError(null);
      setFile(incoming);
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) acceptFile(f);
    },
    [acceptFile],
  );

  /* ── Drag and drop ── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) acceptFile(f);
    },
    [acceptFile],
  );

  /* ── Upload ── */
  const handleUpload = useCallback(async () => {
    if (!file || uploading) return;
    setUploading(true);
    setUploadError(null);
    setDuplicateId(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const result = await apiUpload<{ id: string }>("/activities/upload", form);

      setUploadedId(result.id);
      onSuccess?.(result.id);
    } catch (err) {
      // BUG-1 fix: detect 409 DUPLICATE and extract the existingId
      if (err instanceof ApiError && err.status === 409 && err.code === ERROR_CODES.DUPLICATE) {
        // Use existingId if present; fall back to "" so the duplicate UI still renders
        const existingId = typeof err.data?.existingId === "string" ? err.data.existingId : "";
        setDuplicateId(existingId);
      } else {
        const msg = err instanceof Error ? err.message : "Upload failed. Please try again.";
        setUploadError(msg);
      }
    } finally {
      setUploading(false);
    }
  }, [file, uploading, onSuccess]);

  /* ── State: success ── */
  const isSuccess = !!uploadedId;

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      aria-describedby="upload-modal-desc"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading) onClose();
      }}
    >
      {/* Dialog panel */}
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
          maxWidth: 480,
          width: "100%",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
          animation: "fadeInScale 200ms ease-out",
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-md)",
                background: "var(--color-accent-12)",
                border: "1px solid var(--color-accent-25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <Upload size={18} style={{ color: "var(--color-accent)" }} />
            </div>
            <div>
              <h2
                id="upload-modal-title"
                style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}
              >
                Upload Activity
              </h2>
              <p
                id="upload-modal-desc"
                style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: 0 }}
              >
                Supports .fit, .tcx, .gpx (max {MAX_MB} MB)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            aria-label="Close upload dialog"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: uploading ? "not-allowed" : "pointer",
              padding: 4,
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Duplicate state ── */}
        {duplicateId !== null ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              padding: "var(--space-6) 0",
              textAlign: "center",
            }}
          >
            <AlertCircle size={48} style={{ color: "var(--color-warning, #f59e0b)" }} aria-hidden="true" />
            <div>
              <p style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                Activity already exists
              </p>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                This file has already been imported. You can view the existing activity.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button id="duplicate-close-btn" variant="secondary" size="md" onClick={onClose}>
                Close
              </Button>
              <Button
                id="duplicate-view-btn"
                variant="primary"
                size="md"
                onClick={() => {
                  onClose();
                  if (duplicateId) window.location.href = `/activities/${duplicateId}`;
                }}
                leftIcon={<ExternalLink size={14} />}
              >
                View existing activity
              </Button>
            </div>
          </div>
        ) : isSuccess ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              padding: "var(--space-6) 0",
              textAlign: "center",
            }}
          >
            <CheckCircle size={48} style={{ color: "var(--color-success)" }} aria-hidden="true" />
            <div>
              <p style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                Upload successful!
              </p>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                Your activity is being processed and will appear in your list shortly.
              </p>
            </div>
            <Button id="upload-close-btn" variant="primary" size="md" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            {/* ── Drop zone ── */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !uploading && inputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Drop zone — click or drag a file here"
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !uploading) {
                  inputRef.current?.click();
                }
              }}
              style={{
                border: `2px dashed ${isDragOver ? "var(--color-accent)" : file ? "var(--color-success)" : "var(--border-default)"}`,
                borderRadius: "var(--radius-md)",
                padding: "var(--space-8) var(--space-6)",
                textAlign: "center",
                cursor: uploading ? "not-allowed" : "pointer",
                background: isDragOver
                  ? "var(--color-accent-6)"
                  : file
                    ? "var(--color-success-8)"
                    : "var(--bg-input)",
                transition: "all var(--duration-micro) ease-out",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".fit,.tcx,.gpx"
                onChange={handleInputChange}
                style={{ display: "none" }}
                aria-hidden="true"
                disabled={uploading}
              />

              {file ? (
                /* Selected file preview */
                <>
                  <FileText size={32} style={{ color: "var(--color-success)" }} aria-hidden="true" />
                  <div>
                    <p
                      style={{
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginBottom: 2,
                        wordBreak: "break-all",
                      }}
                    >
                      {file.name}
                    </p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                      {formatBytes(file.size)}
                    </p>
                  </div>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setFileError(null);
                        if (inputRef.current) inputRef.current.value = "";
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        fontSize: "var(--text-xs)",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </>
              ) : (
                /* Empty drop zone */
                <>
                  <Upload size={32} style={{ color: isDragOver ? "var(--color-accent)" : "var(--text-muted)" }} aria-hidden="true" />
                  <div>
                    <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                      {isDragOver ? "Drop your file here" : "Drag & drop or click to browse"}
                    </p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                      .fit, .tcx, .gpx — up to {MAX_MB} MB
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* File validation error */}
            {fileError && (
              <div
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  background: "var(--color-danger-8)",
                  border: "1px solid var(--color-danger-20)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-danger)",
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
                {fileError}
              </div>
            )}

            {/* Upload error */}
            {uploadError && (
              <div
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  background: "var(--color-danger-8)",
                  border: "1px solid var(--color-danger-20)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-danger)",
                }}
              >
                <AlertCircle size={16} aria-hidden="true" />
                {uploadError}
              </div>
            )}

            {/* ── Actions ── */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button
                id="upload-cancel-btn"
                variant="secondary"
                size="md"
                onClick={onClose}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                id="upload-submit-btn"
                variant="primary"
                size="md"
                onClick={handleUpload}
                disabled={!file || uploading || !!fileError}
                loading={uploading}
                leftIcon={uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              >
                {uploading ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
