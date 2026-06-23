import React, { useEffect, useRef } from "react";

const ConfirmModal = ({
  open,
  title,
  message,
  detail,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  variant = "danger",
  onConfirm,
  onClose,
}) => {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  const iconClass =
    variant === "danger"
      ? "bi-exclamation-triangle text-red-400"
      : "bi-question-circle text-sky-400";

  const iconWrapClass =
    variant === "danger"
      ? "bg-red-500/10 border-red-500/20"
      : "bg-sky-500/10 border-sky-500/20";

  return (
    <div
      className="page-modal-overlay"
      onClick={loading ? undefined : onClose}
      role="presentation"
    >
      <div
        className="page-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="page-confirm-modal-body">
          <div className={`page-confirm-modal-icon ${iconWrapClass}`}>
            <i className={`bi ${iconClass}`} aria-hidden="true"></i>
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-modal-title" className="page-confirm-modal-title">
              {title}
            </h2>
            <p id="confirm-modal-message" className="page-confirm-modal-message">
              {message}
            </p>
            {detail ? (
              <p className="page-confirm-modal-detail">{detail}</p>
            ) : null}
          </div>
        </div>

        <div className="page-confirm-modal-actions">
          <button
            type="button"
            className="btn btn-secondary normal-case tracking-normal"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn normal-case tracking-normal ${
              variant === "danger" ? "btn-danger" : "btn-primary"
            }`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="bi bi-arrow-repeat animate-spin me-1.5"></i>
                {confirmLabel}...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
