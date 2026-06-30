export const PRIMARY_UNDER_LABEL = "Primary";

export const emptyCostCenter = () => ({
  id: "",
  cost_center_name: "",
  under_id: "",
});

export function formatUnderId(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return String(value);
}

export function mapCostCenterFromApi(data) {
  return {
    id: String(data.id),
    cost_center_name: data.cost_center_name,
    under_id: formatUnderId(data.under_id),
  };
}

export function validateCostCenter(costCenter) {
  const errors = [];
  if (!costCenter.cost_center_name?.trim()) {
    errors.push("Cost center name is required.");
  }
  return errors;
}
