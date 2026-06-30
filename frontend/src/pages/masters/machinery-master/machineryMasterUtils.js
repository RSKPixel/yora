export const MACHINE_TYPES = [
  "Blow Moulding Machine",
  "Injection Moulding Machine",
  "Compressor",
  "Air Dryer",
  "Chiller",
  "Auxiliary Equipment",
  "Other",
];

export const emptyMachine = () => ({
  id: "",
  machine_id: "",
  machine_name: "",
  machine_type: MACHINE_TYPES[0],
  machine_description: "",
  purchase_date: "",
  supplier_name: "",
  amc_warranty_validity: "",
});

export function mapMachineFromApi(data) {
  return {
    id: String(data.id),
    machine_id: data.machine_id || "",
    machine_name: data.machine_name,
    machine_type: data.machine_type,
    machine_description: data.machine_description || "",
    purchase_date: data.purchase_date || "",
    supplier_name: data.supplier_name || "",
    amc_warranty_validity: data.amc_warranty_validity || "",
  };
}

export function validateMachine(machine) {
  const errors = [];

  if (!machine.machine_name?.trim()) {
    errors.push("Machine name is required.");
  }

  if (!machine.machine_type?.trim()) {
    errors.push("Machine type is required.");
  } else if (!MACHINE_TYPES.includes(machine.machine_type)) {
    errors.push("Invalid machine type.");
  }

  if (!machine.purchase_date?.trim()) {
    errors.push("Purchase date is required.");
  }

  if (machine.amc_warranty_validity?.trim() && machine.purchase_date?.trim()) {
    if (machine.amc_warranty_validity < machine.purchase_date) {
      errors.push("AMC/Warranty validity cannot be before purchase date.");
    }
  }

  return errors;
}

export function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}-${month}-${year}`;
}
