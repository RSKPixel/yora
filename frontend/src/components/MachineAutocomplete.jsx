import AutocompleteField from "../pages/transactions/purchase-order/AutocompleteField";
import { machineOptionLabel } from "../utils/machineryUtils";

const MachineAutocomplete = ({ value, machines, disabled, onSelect }) => (
  <AutocompleteField
    value={value}
    items={machines}
    disabled={disabled}
    placeholder={disabled ? "Loading machines…" : "Search by machine ID or name…"}
    className="w-full min-w-0"
    getLabel={machineOptionLabel}
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
