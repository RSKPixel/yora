export const MOULD_TYPES = ["Blow Mould", "Injection Mould"];

export const TOOL_QUALITY_STATUSES = [
  "Good",
  "Service Required",
  "Damaged",
  "Unusable",
  "Need to Be replaced",
];

export const emptyMould = () => ({
  id: "",
  tool_id: "",
  mould_name: "",
  mould_type: MOULD_TYPES[0],
  purchase_date: "",
  manufactured_by: "",
  tool_quality_status: TOOL_QUALITY_STATUSES[0],
  neck_size_mm: "",
  capacity_ml: "",
  compatible_machine_id: "",
  inventory_location_id: "",
});

export function formatOptionalId(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return String(value);
}

export function mapMouldFromApi(data) {
  return {
    id: String(data.id),
    tool_id: data.tool_id || "",
    mould_name: data.mould_name,
    mould_type: data.mould_type,
    purchase_date: data.purchase_date || "",
    manufactured_by: data.manufactured_by || "",
    tool_quality_status: data.tool_quality_status || TOOL_QUALITY_STATUSES[0],
    neck_size_mm:
      data.neck_size_mm === null || data.neck_size_mm === undefined
        ? ""
        : String(data.neck_size_mm),
    capacity_ml:
      data.capacity_ml === null || data.capacity_ml === undefined
        ? ""
        : String(data.capacity_ml),
    compatible_machine_id: formatOptionalId(data.compatible_machine_id),
    inventory_location_id: formatOptionalId(data.inventory_location_id),
  };
}

export function validateMould(mould) {
  const errors = [];

  if (!mould.mould_name?.trim()) {
    errors.push("Mould name is required.");
  }

  if (!mould.mould_type?.trim()) {
    errors.push("Mould type is required.");
  } else if (!MOULD_TYPES.includes(mould.mould_type)) {
    errors.push("Invalid mould type.");
  }

  if (!mould.purchase_date?.trim()) {
    errors.push("Purchase date is required.");
  }

  if (!mould.tool_quality_status?.trim()) {
    errors.push("Tool quality status is required.");
  } else if (!TOOL_QUALITY_STATUSES.includes(mould.tool_quality_status)) {
    errors.push("Invalid tool quality status.");
  }

  if (mould.neck_size_mm !== "" && mould.neck_size_mm !== null && mould.neck_size_mm !== undefined) {
    const neck = Number(mould.neck_size_mm);
    if (Number.isNaN(neck) || neck < 0) {
      errors.push("Neck size must be a valid non-negative number.");
    }
  }

  if (mould.capacity_ml !== "" && mould.capacity_ml !== null && mould.capacity_ml !== undefined) {
    const capacity = Number(mould.capacity_ml);
    if (Number.isNaN(capacity) || capacity < 0) {
      errors.push("Capacity must be a valid non-negative number.");
    }
  }

  if (!mould.compatible_machine_id) {
    errors.push("Compatible machine is required.");
  }

  if (!mould.inventory_location_id) {
    errors.push("Current inventory location is required.");
  }

  return errors;
}

export function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}-${month}-${year}`;
}

export function qualityStatusClass(status) {
  switch (status) {
    case "Good":
      return "text-emerald-400";
    case "Service Required":
      return "text-amber-400";
    case "Damaged":
      return "text-orange-400";
    case "Unusable":
    case "Need to Be replaced":
      return "text-red-400";
    default:
      return "text-slate-300";
  }
}
