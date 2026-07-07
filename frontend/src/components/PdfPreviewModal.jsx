import React, { useEffect } from "react";
import { createPortal } from "react-dom";

const PdfPreviewModal = ({
  open,
  title,
  fileName,
  pdfUrl,
  loading = false,
  onClose,
  onDownload,
}) => {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="page-modal-overlay page-modal-overlay-top"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="page-modal page-modal-pdf"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-preview-title"
      >
        <div className="page-modal-pdf-header">
          <span id="pdf-preview-title" className="page-modal-pdf-title">
            <span className="page-modal-pdf-title-icon" aria-hidden="true">
              <i className="bi bi-file-earmark-pdf"></i>
            </span>
            <span className="truncate">{title}</span>
          </span>
          <button
            type="button"
            className="page-modal-pdf-close"
            onClick={onClose}
            aria-label="Close PDF preview"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="page-modal-body page-modal-pdf-body">
          {loading || !pdfUrl ? (
            <div className="page-modal-pdf-loading">
              <i className="bi bi-arrow-repeat animate-spin"></i>
              <span>Generating PDF preview...</span>
            </div>
          ) : (
            <iframe
              src={pdfUrl}
              title={title}
              className="page-modal-pdf-frame"
            />
          )}
        </div>

        <div className="page-modal-pdf-footer">
          {fileName ? (
            <p className="page-modal-pdf-filename" title={fileName}>
              {fileName}
            </p>
          ) : (
            <span />
          )}
          <div className="page-modal-pdf-actions">
            <button type="button" className="page-modal-pdf-btn" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="page-modal-pdf-btn page-modal-pdf-btn-primary"
              onClick={onDownload}
              disabled={loading || !pdfUrl}
            >
              <i className="bi bi-download"></i>
              Download
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PdfPreviewModal;
