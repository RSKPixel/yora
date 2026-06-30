import React from "react";
import { formatDate, formatNumber, qualityStatusClass } from "./mouldMasterUtils";

const MouldMasterList = ({
  moulds,
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
          New Mould
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
        placeholder="Search by tool ID, name, or manufacturer…"
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
            <th>Tool ID</th>
            <th>Mould Name</th>
            <th>Type</th>
            <th>Purchase Date</th>
            <th>Manufacturer</th>
            <th>Quality</th>
            <th>Machine</th>
            <th>Location</th>
            <th className="text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={9} className="page-table-empty">
                Loading mould masters…
              </td>
            </tr>
          ) : moulds.length > 0 ? (
            moulds.map((mould) => (
              <tr key={mould.id}>
                <td className="text-sky-300/90 font-medium">{mould.tool_id}</td>
                <td>{mould.mould_name}</td>
                <td>{mould.mould_type}</td>
                <td>{formatDate(mould.purchase_date)}</td>
                <td>{mould.manufactured_by || "—"}</td>
                <td className={qualityStatusClass(mould.tool_quality_status)}>
                  {mould.tool_quality_status}
                </td>
                <td>{mould.compatible_machine_name || "—"}</td>
                <td>{mould.inventory_location_name || "—"}</td>
                <td>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className="page-icon-btn page-icon-btn-sky"
                      title="Edit mould"
                      onClick={() => onEdit(mould)}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9} className="page-table-empty">
                No moulds found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </>
);

export default MouldMasterList;
