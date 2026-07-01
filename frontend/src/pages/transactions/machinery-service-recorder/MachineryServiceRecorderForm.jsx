import React, { useEffect, useRef } from "react";
import MachineAutocomplete from "../../../components/MachineAutocomplete";
import { validateServiceRecord } from "./machineryServiceRecorderUtils";

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

const MachineryServiceRecorderForm = ({
  record,
  isEditing,
  saving,
  formMessage,
  machines,
  machinesLoading,
  onRecordChange,
  onSave,
  onCancel,
}) => {
  const descriptionRef = useRef(null);

  useEffect(() => {
    if (!isEditing) {
      descriptionRef.current?.focus();
    }
  }, [isEditing]);

  const selectedMachine = machines.find(
    (machine) => String(machine.id) === String(record.machinery_id)
  );
  const machineDisplayValue = selectedMachine?.machine_name?.trim() || "";

  const handleMachineSelect = (machineryId, machineId) => {
    onRecordChange({
      ...record,
      machinery_id: machineryId,
      machine_id: machineId,
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const errors = validateServiceRecord(record);
    if (errors.length > 0) {
      onSave(null, errors);
      return;
    }
    onSave(record);
  };

  return (
    <form className="page-master-form mx-auto" onSubmit={handleSubmit} autoComplete="off">
      <div className="page-master-form-body">
        <div className="page-master-form-fields">
          <div className="page-master-form-grid">
            <Field
              label="Machine *"
              icon="bi-gear-wide-connected"
              className="page-master-form-field-full"
            >
              <MachineAutocomplete
                value={machineDisplayValue}
                machines={machines}
                disabled={machinesLoading}
                nameOnly
                onSelect={(machineryId) => {
                  const selected = machines.find(
                    (machine) => String(machine.id) === String(machineryId)
                  );
                  handleMachineSelect(machineryId, selected?.machine_id || "");
                }}
              />
            </Field>

            <Field label="Machine ID" icon="bi-upc-scan">
              <input
                type="text"
                className="page-field-input w-full min-w-0"
                value={record.machine_id}
                placeholder="Select a machine"
                readOnly
                disabled
              />
            </Field>

            <Field label="Service Date *" icon="bi-calendar-event">
              <input
                type="date"
                name="service_date"
                className="page-field-input w-full min-w-0"
                value={record.service_date}
                onChange={(event) =>
                  onRecordChange({ ...record, service_date: event.target.value })
                }
              />
            </Field>

            <div className="page-master-form-field page-master-form-field-full space-y-2">
              <label className="page-form-label" htmlFor="complaint_description">
                Complaint Description
              </label>
              <textarea
                id="complaint_description"
                name="complaint_description"
                className="page-field-textarea"
                rows={3}
                value={record.complaint_description}
                onChange={(event) =>
                  onRecordChange({ ...record, complaint_description: event.target.value })
                }
                placeholder="Describe the complaint or issue"
              />
            </div>

            <div className="page-master-form-field page-master-form-field-full space-y-2">
              <label className="page-form-label" htmlFor="service_description">
                Service Description *
              </label>
              <textarea
                id="service_description"
                ref={descriptionRef}
                name="service_description"
                className="page-field-textarea"
                rows={4}
                value={record.service_description}
                onChange={(event) =>
                  onRecordChange({ ...record, service_description: event.target.value })
                }
                placeholder="Describe the service performed…"
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
        <button type="submit" className="btn btn-success" disabled={saving || machinesLoading}>
          <i className="bi bi-check-lg"></i>
          {saving ? "Saving…" : isEditing ? "Update Service Record" : "Save Service Record"}
        </button>
        <button type="button" className="btn btn-secondary" disabled={saving} onClick={onCancel}>
          <i className="bi bi-x-lg"></i>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default MachineryServiceRecorderForm;
