export function machineOptionLabel(machine) {
  if (!machine?.machine_id) {
    return machine?.machine_name || "";
  }
  return `${machine.machine_id} — ${machine.machine_name}`;
}
