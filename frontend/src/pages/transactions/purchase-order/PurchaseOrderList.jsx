import React from "react";
import moment from "moment";
import numeral from "numeral";
import { calcOrderTotals } from "./purchaseOrderUtils";

const PurchaseOrderList = ({ orders, loading, deleting, listMessage, onNew, onEdit, onDelete }) => {
  return (
    <>
      <div className="page-toolbar">
        <span className="page-toolbar-label">Actions</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-primary flex items-center gap-1.5 text-xs normal-case tracking-normal"
            onClick={onNew}
          >
            <i className="bi bi-plus-lg"></i>
            New Purchase Order
          </button>
        </div>
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
              <th>Purchase Order Date</th>
              <th>Purchase Order No</th>
              <th>Vendor</th>
              <th>Status</th>
              <th className="text-end">Items</th>
              <th className="text-end">Qty</th>
              <th className="text-end">GST</th>
              <th className="text-end">Total</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="page-table-empty">
                  Loading purchase orders...
                </td>
              </tr>
            ) : orders.length > 0 ? (
              orders.map((order) => {
                const totals = calcOrderTotals(order.details);
                return (
                  <tr key={order.po_no}>
                    <td>{moment(order.po_date).format("DD-MM-YYYY")}</td>
                    <td className="text-sky-300/90">{order.po_no}</td>
                    <td>{order.vendor}</td>
                    <td>{order.status || "Open"}</td>
                    <td className="text-end">{order.details.length}</td>
                    <td className="text-end">{numeral(totals.qty).format("0,0")}</td>
                    <td className="text-end">{numeral(totals.gstValue).format("0,0.00")}</td>
                    <td className="text-end">{numeral(totals.total).format("0,0.00")}</td>
                    <td>
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          className="page-icon-btn page-icon-btn-sky"
                          title="Edit purchase order"
                          onClick={() => onEdit(order)}
                          disabled={deleting}
                        >
                          <i className="bi bi-pencil-square"></i>
                        </button>
                        <button
                          type="button"
                          className="page-icon-btn text-red-400/80 hover:text-red-300"
                          title="Delete purchase order"
                          onClick={() => onDelete(order.po_no)}
                          disabled={deleting}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="page-table-empty">
                  No purchase orders yet. Create your first order to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default PurchaseOrderList;
