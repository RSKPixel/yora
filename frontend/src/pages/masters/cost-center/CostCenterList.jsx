import React from "react";

const CostCenterList = ({
  costCenters,
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
        <button
          type="button"
          className="btn btn-primary"
          onClick={onNew}
        >
          <i className="bi bi-plus-lg"></i>
          New Cost Center
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
        placeholder="Search by name…"
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
            <th>Name</th>
            <th>Under</th>
            <th className="text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={3} className="page-table-empty">
                Loading cost centers…
              </td>
            </tr>
          ) : costCenters.length > 0 ? (
            costCenters.map((costCenter) => (
              <tr key={costCenter.id}>
                <td className="text-sky-300/90">{costCenter.cost_center_name}</td>
                <td>{costCenter.under_name}</td>
                <td>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className="page-icon-btn page-icon-btn-sky"
                      title="Edit cost center"
                      onClick={() => onEdit(costCenter)}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="page-table-empty">
                No cost centers found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </>
);

export default CostCenterList;
