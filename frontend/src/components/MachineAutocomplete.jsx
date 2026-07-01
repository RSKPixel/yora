import AutocompleteField from "../pages/transactions/purchase-order/AutocompleteField";
import { machineOptionLabel } from "../utils/machineryUtils";

const machineNameLabel = (machine) => machine?.machine_name?.trim() || "";

const machineSearchText = (machine) =>
  [machine?.machine_id, machine?.machine_name].filter(Boolean).join(" ");

const MachineAutocomplete = ({ value, machines, disabled, onSelect, nameOnly = false }) => (
  <AutocompleteField
    value={value}
    items={machines}
    disabled={disabled}
    placeholder={
      disabled
        ? "Loading machines…"
        : nameOnly
          ? "Search by machine name…"
          : "Search by machine ID or name…"
    }
    className="w-full min-w-0"
    getLabel={nameOnly ? machineNameLabel : machineOptionLabel}
    getSearchText={nameOnly ? machineSearchText : undefined}
    getKey={(machine) => machine.id}
    getMeta={(machine) => machine.machine_type}
    onSelect={(_label, machine) => {
      if (!machine) {
        onSelect("");
        return;
      }
      onSelect(String(machine.id));
    }}
  />
);

export default MachineAutocomplete;
