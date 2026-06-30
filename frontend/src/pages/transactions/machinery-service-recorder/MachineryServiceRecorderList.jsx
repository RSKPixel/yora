import React from "react";
import { formatDate } from "./machineryServiceRecorderUtils";

const MachineryServiceRecorderList = ({
  records,
  loading,
  deleting,
  searchQuery,
  listMessage,
  onSearchChange,
  onNew,
  onEdit,
  onDelete,
}) => (
  <>
    <div className="page-toolbar page-master-toolbar">
      <span className="page-toolbar-label">Actions</span>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={onNew}>
          <i className="bi bi-plus-lg"></i>
          New Service Record
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
        placeholder="Search by machine ID, name, or description…"
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
            <th>Service Date</th>
            <th>Machine ID</th>
            <th>Machine Name</th>
            <th>Complaint Description</th>
            <th>Service Description</th>
            <th className="text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="page-table-empty">
                Loading service records…
              </td>
            </tr>
          ) : records.length > 0 ? (
            records.map((record) => (
              <tr key={record.id}>
                <td>{formatDate(record.service_date)}</td>
                <td className="text-sky-300/90 font-medium">{record.machine_id}</td>
                <td>{record.machine_name}</td>
                <td>{record.complaint_description || "—"}</td>
                <td>{record.service_description}</td>
                <td>
                  <div className="flex justify-center gap-1">
                    <button
                      type="button"
                      className="page-icon-btn page-icon-btn-sky"
                      title="Edit service record"
                      onClick={() => onEdit(record)}
                      disabled={deleting}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button
                      type="button"
                      className="page-icon-btn text-red-400/80 hover:text-red-300"
                      title="Delete service record"
                      onClick={() => onDelete(record)}
                      disabled={deleting}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="page-table-empty">
                No service records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </>
);

export default MachineryServiceRecorderList;
