import React from "react";
import { formatDate } from "./machineryMasterUtils";

const MachineryMasterList = ({
  machines,
  loading,
  searchQuery,
  listMessage,
  onSearchChange,
  onNew,
  onEdit,
}) => (
  <>
    <div className="page-toolbar page-master-toolbar">
      <span className="page-toolbar-label">Actions</span>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={onNew}>
          <i className="bi bi-plus-lg"></i>
          New Machine
        </button>
      </div>
    </div>

    <div className="page-field-wrap page-master-search">
      <span className="page-field-icon" aria-hidden="true">
        <i className="bi bi-search"></i>
      </span>
      <input
        type="text"
        className="page-field-input w-full min-w-0"
        placeholder="Search by machine ID, name, type, or supplier…"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </div>

    {listMessage && (
      <div
        className={`flex items-start gap-2 text-xs normal-case tracking-normal mb-3 ${
          listMessage.type === "success" ? "text-emerald-400" : "text-red-400"
        }`}
      >
        <i
          className={`bi mt-0.5 shrink-0 ${
            listMessage.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"
          }`}
        ></i>
        <span>{listMessage.message}</span>
      </div>
    )}

    <div className="page-table-wrap">
      <table className="page-table">
        <thead>
          <tr>
            <th>Machine ID</th>
            <th>Machine Name</th>
            <th>Type</th>
            <th>Purchase Date</th>
            <th>Supplier</th>
            <th>AMC/Warranty Validity</th>
            <th className="text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} className="page-table-empty">
                Loading machinery master…
              </td>
            </tr>
          ) : machines.length > 0 ? (
            machines.map((machine) => (
              <tr key={machine.id}>
                <td className="text-sky-300/90 font-medium">{machine.machine_id}</td>
                <td>{machine.machine_name}</td>
                <td>{machine.machine_type}</td>
                <td>{formatDate(machine.purchase_date)}</td>
                <td>{machine.supplier_name || "—"}</td>
                <td>{formatDate(machine.amc_warranty_validity)}</td>
                <td>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className="page-icon-btn page-icon-btn-sky"
                      title="Edit machine"
                      onClick={() => onEdit(machine)}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="page-table-empty">
                No machines found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </>
);

export default MachineryMasterList;
