import React, { useContext, useEffect, useState } from "react";
import moment from "moment";
import AuthContext from "../../../templates/AuthContext";

const TallyPendingBills = ({
  setSelectedPurchase,
  setShowPendingBills,
  setShowForm,
  importError,
  onClearImportError,
}) => {
  const { api, authFetch } = useContext(AuthContext);
  const [pendingCostingBills, setPendingCostingBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    authFetch(`${api}/purchases/pending-purchase-bills`, { method: "POST" })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          setPendingCostingBills(data.data || []);
        } else {
          setPendingCostingBills([]);
          setError(data.message || "Unable to load pending bills.");
        }
        setLoading(false);
      })
      .catch(() => {
        setPendingCostingBills([]);
        setError("Unable to load pending bills.");
        setLoading(false);
      });
  }, [api, authFetch]);

  return (
    <div className="page-modal-overlay">
      <div className="page-modal page-modal-wide">
        <div className="page-modal-header">
          <span className="page-modal-title flex items-center gap-2">
            <span className="page-card-title-icon">
              <i className="bi bi-cloud-download"></i>
            </span>
            Tally — Pending Import
          </span>
          <button
            type="button"
            className="page-modal-close"
            onClick={() => setShowPendingBills(false)}
            aria-label="Close"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="page-modal-body p-0">
          <p className="px-4 py-3 text-xs text-slate-400 normal-case tracking-normal border-b border-gray-700/60">
            Select a purchase bill to import and update costing.
          </p>

          {(error || importError) && (
            <p className="px-4 py-3 text-xs text-red-300/90 normal-case tracking-normal border-b border-red-900/40 bg-red-950/20">
              {importError || error}
            </p>
          )}

          <div className="page-table-wrap border-0 rounded-none max-h-[60vh]">
            <table className="page-table">
              <thead>
                <tr>
                  <th>Purchase Date</th>
                  <th>Purchase ID</th>
                  <th>Vendor</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="page-table-empty">
                      Loading pending bills…
                    </td>
                  </tr>
                ) : pendingCostingBills.length > 0 ? (
                  pendingCostingBills.map((bill) => {
                    const key = `${bill.purchase_id}-${bill.purchase_date}`;
                    return (
                      <tr
                        key={key}
                        className="cursor-pointer"
                        onClick={() => {
                          onClearImportError?.();
                          setSelectedPurchase(bill);
                          setShowPendingBills(false);
                        }}
                      >
                        <td>{moment(bill.purchase_date).format("DD-MM-YYYY")}</td>
                        <td className="text-sky-300/90">{bill.purchase_id}</td>
                        <td>{bill.vendor}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="page-table-empty">
                      No pending bills to import.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TallyPendingBills;
