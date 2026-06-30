import React, { useEffect, useRef } from "react";
import { validateMachine } from "./machineryMasterUtils";

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

const MachineryMasterForm = ({
  machine,
  isEditing,
  saving,
  formMessage,
  lookups,
  lookupsLoading,
  onMachineChange,
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
    const errors = validateMachine(machine);
    if (errors.length > 0) {
      onSave(null, errors);
      return;
    }
    onSave(machine);
  };

  return (
    <form className="page-master-form mx-auto" onSubmit={handleSubmit}>
      <div className="page-master-form-body">
        <div className="page-master-form-fields">
          <div className="page-master-form-grid">
            <Field label="Machine ID (Auto generated)" icon="bi-upc-scan">
              <input
                type="text"
                className="page-field-input w-full min-w-0"
                value={isEditing ? machine.machine_id : ""}
                placeholder="Auto generated"
                readOnly
                disabled
              />
            </Field>

            <Field label="Machine Type *" icon="bi-layers">
              <select
                name="machine_type"
                className="page-field-input w-full min-w-0"
                value={machine.machine_type}
                disabled={lookupsLoading}
                onChange={(event) =>
                  onMachineChange({ ...machine, machine_type: event.target.value })
                }
              >
                {lookups.machine_types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Machine Name *" icon="bi-tag" className="page-master-form-field-full">
              <input
                ref={nameRef}
                type="text"
                name="machine_name"
                className="page-field-input w-full min-w-0"
                value={machine.machine_name}
                onChange={(event) =>
                  onMachineChange({ ...machine, machine_name: event.target.value })
                }
                maxLength={150}
                autoComplete="off"
                placeholder="Enter machine name"
              />
            </Field>

            <Field label="Purchase Date *" icon="bi-calendar-event">
              <input
                type="date"
                name="purchase_date"
                className="page-field-input w-full min-w-0"
                value={machine.purchase_date}
                onChange={(event) =>
                  onMachineChange({ ...machine, purchase_date: event.target.value })
                }
              />
            </Field>

            <Field label="AMC/Warranty Validity" icon="bi-shield-check">
              <input
                type="date"
                name="amc_warranty_validity"
                className="page-field-input w-full min-w-0"
                value={machine.amc_warranty_validity}
                onChange={(event) =>
                  onMachineChange({ ...machine, amc_warranty_validity: event.target.value })
                }
              />
            </Field>

            <Field label="Machine Supplier Name" icon="bi-truck" className="page-master-form-field-full">
              <input
                type="text"
                name="supplier_name"
                className="page-field-input w-full min-w-0"
                value={machine.supplier_name}
                maxLength={150}
                onChange={(event) =>
                  onMachineChange({ ...machine, supplier_name: event.target.value })
                }
                placeholder="Supplier name"
              />
            </Field>

            <div className="page-master-form-field page-master-form-field-full space-y-2">
              <label className="page-form-label" htmlFor="machine_description">
                Machine Description
              </label>
              <textarea
                id="machine_description"
                name="machine_description"
                className="page-field-textarea"
                rows={3}
                value={machine.machine_description}
                onChange={(event) =>
                  onMachineChange({ ...machine, machine_description: event.target.value })
                }
                placeholder="Machine description"
              />
            </div>
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
          disabled={saving || lookupsLoading}
        >
          <i className="bi bi-check-lg"></i>
          {saving ? "Saving…" : isEditing ? "Update Machine" : "Save Machine"}
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

export default MachineryMasterForm;
