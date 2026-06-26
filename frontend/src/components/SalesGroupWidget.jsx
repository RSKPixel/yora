import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import numeral from "numeral";
import AuthContext from "../templates/AuthContext";

const formatQty = (value) => numeral(value || 0).format("0,0.##");

const SalesGroupWidget = () => {
  const { api, authFetch } = useContext(AuthContext);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    authFetch(`${api}/dashboard/sales-by-group`, { method: "POST" })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        if (data.status === "success") {
          setSummary(data.data);
          setError("");
        } else {
          setSummary(null);
          setError(data.message || "Unable to load sales summary.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null);
          setError("Unable to load sales summary.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, authFetch]);

  return (
    <aside className="dashboard-panel dashboard-sales-widget" aria-label="Sales by stock group">
      <div className="dashboard-sales-widget-header">
        <div>
          <p className="dashboard-sales-widget-title">Sales by Group</p>
          {summary && (
            <p className="dashboard-sales-widget-subtitle">
              {summary.previous_month.label} vs {summary.current_month.label}
            </p>
          )}
        </div>
        <Link to="/transactions/sales" className="dashboard-sales-widget-link" title="Open sales">
          <i className="bi bi-receipt" aria-hidden="true"></i>
        </Link>
      </div>

      {loading ? (
        <p className="dashboard-sales-widget-empty">Loading sales summary…</p>
      ) : error ? (
        <p className="dashboard-sales-widget-error">{error}</p>
      ) : !summary?.rows?.length ? (
        <p className="dashboard-sales-widget-empty">No grouped sales for these months.</p>
      ) : (
        <div className="dashboard-sales-widget-table-wrap">
          <table className="dashboard-sales-widget-table">
            <thead>
              <tr>
                <th scope="col">Group</th>
                <th scope="col" className="dashboard-sales-widget-num">
                  {summary.previous_month.label}
                </th>
                <th scope="col" className="dashboard-sales-widget-num">
                  {summary.current_month.label}
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row) => (
                <tr key={row.group}>
                  <td>{row.group}</td>
                  <td className="dashboard-sales-widget-num">{formatQty(row.previous_month_qty)}</td>
                  <td className="dashboard-sales-widget-num">{formatQty(row.current_month_qty)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td className="dashboard-sales-widget-num">
                  {formatQty(summary.totals.previous_month_qty)}
                </td>
                <td className="dashboard-sales-widget-num">
                  {formatQty(summary.totals.current_month_qty)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </aside>
  );
};

export default SalesGroupWidget;
