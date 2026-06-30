export function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}-${month}-${year}`;
}

export function todayIsoDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

export const emptyServiceRecord = () => ({
  id: "",
  machinery_id: "",
  machine_id: "",
  service_date: todayIsoDate(),
  complaint_description: "",
  service_description: "",
});

export function mapServiceRecordFromApi(data) {
  return {
    id: data.id != null ? String(data.id) : "",
    machinery_id: String(data.machinery_id),
    machine_id: data.machine_id || "",
    service_date: data.service_date || "",
    complaint_description: data.complaint_description || "",
    service_description: data.service_description || "",
  };
}

export function validateServiceRecord(record) {
  const errors = [];

  if (!record.machinery_id) {
    errors.push("Machine is required.");
  }

  if (!record.service_date?.trim()) {
    errors.push("Service date is required.");
  }

  if (!record.service_description?.trim()) {
    errors.push("Service description is required.");
  }

  return errors;
}
