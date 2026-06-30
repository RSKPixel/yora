import React, { useEffect, useRef } from "react";
import { validateMould } from "./mouldMasterUtils";

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

const MouldMasterForm = ({
  mould,
  isEditing,
  saving,
  formMessage,
  lookups,
  lookupsLoading,
  onMouldChange,
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
    const errors = validateMould(mould);
    if (errors.length > 0) {
      onSave(null, errors);
      return;
    }
    onSave(mould);
  };

  return (
    <form className="page-master-form mx-auto" onSubmit={handleSubmit}>
      <div className="page-master-form-body">
        <div className="page-master-form-fields">
          <div className="page-master-form-grid">
            <Field label="Tool ID (Auto generated)" icon="bi-upc-scan">
              <input
                type="text"
                className="page-field-input w-full min-w-0"
                value={isEditing ? mould.tool_id : ""}
                placeholder="Auto generated"
                readOnly
                disabled
              />
            </Field>

            <Field label="Mould Type *" icon="bi-layers">
              <select
                name="mould_type"
                className="page-field-input w-full min-w-0"
                value={mould.mould_type}
                disabled={lookupsLoading}
                onChange={(event) =>
                  onMouldChange({ ...mould, mould_type: event.target.value })
                }
              >
                {lookups.mould_types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Mould Name *" icon="bi-tag" className="page-master-form-field-full">
              <input
                ref={nameRef}
                type="text"
                name="mould_name"
                className="page-field-input w-full min-w-0"
                value={mould.mould_name}
                onChange={(event) =>
                  onMouldChange({ ...mould, mould_name: event.target.value })
                }
                maxLength={150}
                autoComplete="off"
                placeholder="Enter mould name"
              />
            </Field>

            <Field label="Purchase Date *" icon="bi-calendar-event">
              <input
                type="date"
                name="purchase_date"
                className="page-field-input w-full min-w-0"
                value={mould.purchase_date}
                onChange={(event) =>
                  onMouldChange({ ...mould, purchase_date: event.target.value })
                }
              />
            </Field>

            <Field label="Manufactured By" icon="bi-building-gear">
              <input
                type="text"
                name="manufactured_by"
                className="page-field-input w-full min-w-0"
                value={mould.manufactured_by}
                maxLength={150}
                onChange={(event) =>
                  onMouldChange({ ...mould, manufactured_by: event.target.value })
                }
                placeholder="Manufacturer name"
              />
            </Field>

            <Field label="Tool Quality Status *" icon="bi-shield-check">
              <select
                name="tool_quality_status"
                className="page-field-input w-full min-w-0"
                value={mould.tool_quality_status}
                disabled={lookupsLoading}
                onChange={(event) =>
                  onMouldChange({ ...mould, tool_quality_status: event.target.value })
                }
              >
                {lookups.tool_quality_statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Neck Size (mm)" icon="bi-rulers">
              <input
                type="number"
                name="neck_size_mm"
                className="page-field-input w-full min-w-0"
                value={mould.neck_size_mm}
                min="0"
                step="0.01"
                onChange={(event) =>
                  onMouldChange({ ...mould, neck_size_mm: event.target.value })
                }
                placeholder="Neck size in mm"
              />
            </Field>

            <Field label="Capacity (ml)" icon="bi-droplet">
              <input
                type="number"
                name="capacity_ml"
                className="page-field-input w-full min-w-0"
                value={mould.capacity_ml}
                min="0"
                step="0.01"
                onChange={(event) =>
                  onMouldChange({ ...mould, capacity_ml: event.target.value })
                }
                placeholder="Capacity in ml"
              />
            </Field>

            <Field label="Compatible Machine *" icon="bi-gear-wide-connected">
              <select
                name="compatible_machine_id"
                className="page-field-input w-full min-w-0"
                value={mould.compatible_machine_id}
                disabled={lookupsLoading}
                onChange={(event) =>
                  onMouldChange({ ...mould, compatible_machine_id: event.target.value })
                }
              >
                <option value="">Select machine…</option>
                {lookups.machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.cost_center_name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Current Inventory Location *" icon="bi-geo-alt">
              <select
                name="inventory_location_id"
                className="page-field-input w-full min-w-0"
                value={mould.inventory_location_id}
                disabled={lookupsLoading}
                onChange={(event) =>
                  onMouldChange({ ...mould, inventory_location_id: event.target.value })
                }
              >
                <option value="">Select location…</option>
                {lookups.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.cost_center_name}
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
          disabled={saving || lookupsLoading}
        >
          <i className="bi bi-check-lg"></i>
          {saving ? "Saving…" : isEditing ? "Update Mould" : "Save Mould"}
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

export default MouldMasterForm;
