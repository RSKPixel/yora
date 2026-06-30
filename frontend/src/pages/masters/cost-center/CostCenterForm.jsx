import React, { useEffect, useRef } from "react";
import { validateCostCenter } from "./costCenterUtils";

const Field = ({ label, icon, children, className = "" }) => (
  <div className={`page-master-form-field ${className}`.trim()}>
    <label className="page-form-label">{label}</label>
    <div className="page-field-wrap">
      <span className="page-field-icon" aria-hidden="true">
        <i className={`bi ${icon}`}></i>
      </span>
      {children}
    </div>
  </div>
);

const CostCenterForm = ({
  costCenter,
  isEditing,
  saving,
  formMessage,
  underOptions,
  underOptionsLoading,
  onCostCenterChange,
  onSave,
  onCancel,
}) => {
  const nameRef = useRef(null);

  useEffect(() => {
    if (!isEditing) {
      nameRef.current?.focus();
    }
  }, [isEditing]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const errors = validateCostCenter(costCenter);
    if (errors.length > 0) {
      onSave(null, errors);
      return;
    }
    onSave(costCenter);
  };

  return (
    <form className="page-master-form mx-auto" onSubmit={handleSubmit}>
      <div className="page-master-form-body">
        <div className="page-master-form-fields">
          <div className="page-master-form-grid">
            <Field label="Cost Center Name *" icon="bi-tag">
              <input
                ref={nameRef}
                type="text"
                name="cost_center_name"
                className="page-field-input w-full min-w-0"
                value={costCenter.cost_center_name}
                onChange={(event) =>
                  onCostCenterChange({ ...costCenter, cost_center_name: event.target.value })
                }
                maxLength={100}
                autoComplete="off"
                placeholder="Enter cost center name"
              />
            </Field>

            <Field label="Under" icon="bi-diagram-3">
              <select
                name="under_id"
                className="page-field-input w-full min-w-0"
                value={costCenter.under_id}
                disabled={underOptionsLoading}
                onChange={(event) =>
                  onCostCenterChange({ ...costCenter, under_id: event.target.value })
                }
              >
                {underOptions.map((option) => (
                  <option key={option.id ?? "primary"} value={option.id ?? ""}>
                    {option.cost_center_name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {formMessage && (
          <div
            className={`mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm normal-case tracking-normal ${
              formMessage.type === "success"
                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                : "border-red-500/30 bg-red-950/20 text-red-400"
            }`}
          >
            <i
              className={`bi mt-0.5 shrink-0 ${
                formMessage.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"
              }`}
            ></i>
            {Array.isArray(formMessage.message) ? (
              <div className="space-y-1">
                {formMessage.message.map((msg) => (
                  <p key={msg}>{msg}</p>
                ))}
              </div>
            ) : (
              <span>{formMessage.message}</span>
            )}
          </div>
        )}
      </div>

      <div className="page-master-form-actions">
        <button
          type="submit"
          className="btn btn-success"
          disabled={saving || underOptionsLoading}
        >
          <i className="bi bi-check-lg"></i>
          {saving ? "Saving…" : isEditing ? "Update Cost Center" : "Save Cost Center"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={saving}
          onClick={onCancel}
        >
          <i className="bi bi-x-lg"></i>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default CostCenterForm;
