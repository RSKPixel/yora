import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import numeral from "numeral";
import AuthContext from "../../templates/AuthContext";
import {
  generatePurchaseOrderReportPdf,
} from "./purchaseOrderReportPdf";

const emptyFilters = () => ({
  po_no: "",
  vendor: "",
  po_date_from: "",
  po_date_to: "",
  purchase_date_from: "",
  purchase_date_to: "",
});

const formatQty = (value) => numeral(value || 0).format("0,0.##");
const formatCount = (value) => numeral(value || 0).format("0,0");

const SortableQtyHeader = ({ label, sortKey, sort, onSort }) => {
  const isAsc = sort.key === sortKey && sort.direction === "asc";
  const isDesc = sort.key === sortKey && sort.direction === "desc";

  return (
    <th className="text-end">
      <div className="inline-flex items-center justify-end gap-1.5 w-full">
        <span>{label}</span>
        <span className="inline-flex items-center gap-0.5">
          <button
            type="button"
            className={`page-icon-btn page-icon-btn-xs page-icon-btn-xs-sky ${
              isAsc ? "border-sky-500/60 text-sky-300" : ""
            }`}
            title={`Sort ${label} ascending`}
            aria-label={`Sort ${label} ascending`}
            aria-pressed={isAsc}
            onClick={() => onSort(sortKey, "asc")}
          >
            <i className="bi bi-caret-up-fill"></i>
          </button>
          <button
            type="button"
            className={`page-icon-btn page-icon-btn-xs page-icon-btn-xs-sky ${
              isDesc ? "border-sky-500/60 text-sky-300" : ""
            }`}
            title={`Sort ${label} descending`}
            aria-label={`Sort ${label} descending`}
            aria-pressed={isDesc}
            onClick={() => onSort(sortKey, "desc")}
          >
            <i className="bi bi-caret-down-fill"></i>
          </button>
        </span>
      </div>
    </th>
  );
};

const PurchaseOrderReport = () => {
  const { api, authFetch, company } = useContext(AuthContext);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [report, setReport] = useState(null);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [message, setMessage] = useState(null);
  const [sort, setSort] = useState({ key: null, direction: "asc" });
  const [pdfMessage, setPdfMessage] = useState(null);

  const loadVendors = useCallback(async () => {
    setLoadingVendors(true);
    try {
      const response = await authFetch(`${api}/purchase-orders/vendors`, {
        method: "POST",
      });
      const data = await response.json();
      setVendors(data.status === "success" ? data.data || [] : []);
    } catch {
      setVendors([]);
    } finally {
      setLoadingVendors(false);
    }
  }, [api, authFetch]);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const response = await authFetch(`${api}/purchase-orders/list`, {
        method: "POST",
      });
      const data = await response.json();
      setOrders(data.status === "success" ? data.data || [] : []);
    } catch {
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [api, authFetch]);

  useEffect(() => {
    loadVendors();
    loadOrders();
  }, [loadVendors, loadOrders]);

  const poOptions = useMemo(() => {
    if (!filters.vendor) return [];

    let list = orders.filter((order) => order.vendor === filters.vendor);
    if (filters.po_date_from) {
      list = list.filter((order) => order.po_date >= filters.po_date_from);
    }
    if (filters.po_date_to) {
      list = list.filter((order) => order.po_date <= filters.po_date_to);
    }
    return list;
  }, [orders, filters.vendor, filters.po_date_from, filters.po_date_to]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "vendor") {
        const stillValid = orders.some(
          (order) => order.po_no === prev.po_no && order.vendor === value
        );
        if (!stillValid) {
          next.po_no = "";
        }
      }
      return next;
    });
  };

  const runReport = useCallback(async () => {
    if (!filters.vendor) {
      setMessage({ type: "error", text: "Select a vendor to generate the report." });
      return;
    }

    setLoadingReport(true);
    setMessage(null);
    setPdfMessage(null);

    try {
      const fd = new FormData();
      fd.append("vendor", filters.vendor);
      Object.entries(filters).forEach(([key, value]) => {
        if (key !== "vendor" && value) fd.append(key, value);
      });

      const response = await authFetch(`${api}/purchase-orders/report`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        setReport(null);
        setMessage({
          type: "error",
          text: data.message || data.detail || "Unable to generate report.",
        });
        return;
      }

      setAppliedFilters({ ...filters });
      setReport(data.data);
      setMessage({
        type: data.data?.rows?.length ? "success" : "info",
        text: data.message,
      });
    } catch {
      setReport(null);
      setMessage({
        type: "error",
        text: "Unable to generate report. Please try again.",
      });
    } finally {
      setLoadingReport(false);
    }
  }, [api, authFetch, filters]);

  const clearFilters = () => {
    const cleared = emptyFilters();
    setFilters(cleared);
    setAppliedFilters(cleared);
    setReport(null);
    setMessage(null);
    setPdfMessage(null);
    setSort({ key: null, direction: "asc" });
  };

  const handleSavePdf = () => {
    setPdfMessage(null);

    if (!report?.rows?.length) {
      setPdfMessage({ type: "error", text: "Generate the report before saving as PDF." });
      return;
    }

    try {
      generatePurchaseOrderReportPdf({
        company,
        filters: appliedFilters,
        report,
        rows: sortedRows,
      });
      setPdfMessage({ type: "success", text: "Purchase order report PDF downloaded." });
    } catch (err) {
      console.error("PDF generation failed:", err);
      setPdfMessage({
        type: "error",
        text: err?.message || "Failed to generate PDF. Please try again.",
      });
    }
  };

  const handleSort = (key, direction) => {
    setSort((prev) =>
      prev.key === key && prev.direction === direction
        ? { key: null, direction: "asc" }
        : { key, direction }
    );
  };

  const rows = report?.rows || [];
  const sortedRows = useMemo(() => {
    if (!sort.key || rows.length === 0) return rows;

    return [...rows].sort((a, b) => {
      const left = Number(a[sort.key]) || 0;
      const right = Number(b[sort.key]) || 0;
      if (left === right) {
        return a.stock_item.localeCompare(b.stock_item);
      }
      return sort.direction === "asc" ? left - right : right - left;
    });
  }, [rows, sort]);
  const totals = report?.totals;
  const filtersLoading = loadingVendors || loadingOrders;

  return (
    <div className="w-full">
      <div className="page-card">
        <div className="page-card-header">
          <div>
            <div className="page-card-title">
              <span className="page-card-title-icon">
                <i className="bi bi-file-earmark-bar-graph"></i>
              </span>
              Purchase Order Report
            </div>
            <p className="page-card-subtitle mt-0.5 ps-10">
              {appliedFilters.vendor
                ? `Vendor: ${appliedFilters.vendor}`
                : "Compare ordered quantities with purchases received from a vendor"}
            </p>
          </div>
        </div>

        <div className="page-card-body">
          <div className="page-toolbar">
            <span className="page-toolbar-label">Filters</span>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="page-select min-w-52"
                name="vendor"
                value={filters.vendor}
                onChange={handleFilterChange}
                disabled={filtersLoading}
                required
              >
                <option value="">Select vendor</option>
                {vendors.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                className="page-select min-w-40"
                name="po_no"
                value={filters.po_no}
                onChange={handleFilterChange}
                disabled={filtersLoading || !filters.vendor}
              >
                <option value="">All purchase orders</option>
                {poOptions.map((order) => (
                  <option key={order.po_no} value={order.po_no}>
                    {order.po_no}
                  </option>
                ))}
              </select>

              <span className="text-slate-500 text-xs normal-case tracking-normal">PO date</span>
              <input
                className="page-select w-auto"
                type="date"
                name="po_date_from"
                value={filters.po_date_from}
                onChange={handleFilterChange}
              />
              <span className="text-slate-500 text-xs normal-case tracking-normal">to</span>
              <input
                className="page-select w-auto"
                type="date"
                name="po_date_to"
                value={filters.po_date_to}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <div className="page-toolbar mt-2">
            <span className="page-toolbar-label">Purchases</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500 text-xs normal-case tracking-normal">
                Count purchases from
              </span>
              <input
                className="page-select w-auto"
                type="date"
                name="purchase_date_from"
                value={filters.purchase_date_from}
                onChange={handleFilterChange}
                title="Leave blank to count from each PO date"
              />
              <span className="text-slate-500 text-xs normal-case tracking-normal">to</span>
              <input
                className="page-select w-auto"
                type="date"
                name="purchase_date_to"
                value={filters.purchase_date_to}
                onChange={handleFilterChange}
              />
              <button
                type="button"
                className="page-icon-btn page-icon-btn-sky"
                title="Generate report"
                onClick={runReport}
                disabled={loadingReport || !filters.vendor}
              >
                <i className={`bi ${loadingReport ? "bi-arrow-repeat animate-spin" : "bi-search"}`}></i>
              </button>
              <button
                type="button"
                className="page-icon-btn"
                title="Clear filters"
                onClick={clearFilters}
                disabled={loadingReport}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>

          <p className="text-slate-500 text-xs normal-case tracking-normal mt-2 mb-3">
            Items are grouped by stock item. Received quantity is the total purchased from the
            selected vendor for each item, counted from the earliest PO date for that item.
          </p>

          {(pdfMessage || message) && (
            <div
              className={`flex items-start gap-2 text-xs normal-case tracking-normal mb-3 ${
                (pdfMessage || message).type === "error"
                  ? "text-red-400"
                  : (pdfMessage || message).type === "success"
                    ? "text-emerald-400"
                    : "text-slate-400"
              }`}
            >
              <i
                className={`bi mt-0.5 shrink-0 ${
                  (pdfMessage || message).type === "error"
                    ? "bi-exclamation-circle"
                    : (pdfMessage || message).type === "success"
                      ? "bi-check-circle"
                      : "bi-info-circle"
                }`}
              ></i>
              <span>{(pdfMessage || message).text}</span>
            </div>
          )}

          {report?.summary && (
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex flex-wrap gap-4 text-xs normal-case tracking-normal text-slate-400">
              <span>
                Vendor: <span className="text-sky-300/90">{report.vendor}</span>
              </span>
              <span>
                POs: <span className="text-slate-200">{report.summary.po_count}</span>
              </span>
              <span>
                Items: <span className="text-slate-200">{report.summary.item_count}</span>
              </span>
              {appliedFilters.po_no && (
                <span>
                  PO: <span className="text-sky-300/90">{appliedFilters.po_no}</span>
                </span>
              )}
              </div>
              {sortedRows.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary flex items-center gap-1.5 text-xs normal-case tracking-normal shrink-0"
                  onClick={handleSavePdf}
                  disabled={loadingReport}
                >
                  <i className="bi bi-file-earmark-pdf"></i>
                  Save as PDF
                </button>
              )}
            </div>
          )}

          <div className="page-table-wrap">
            <table className="page-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Unit</th>
                  <th className="text-end">No. of PO</th>
                  <th className="text-end">PO Qty</th>
                  <th className="text-end">Received</th>
                  <SortableQtyHeader
                    label="Excess"
                    sortKey="excess"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableQtyHeader
                    label="Shortage"
                    sortKey="shortage"
                    sort={sort}
                    onSort={handleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {loadingReport ? (
                  <tr>
                    <td colSpan={7} className="page-table-empty">
                      Generating report...
                    </td>
                  </tr>
                ) : sortedRows.length > 0 ? (
                  sortedRows.map((row) => (
                    <tr key={row.stock_item}>
                      <td>{row.stock_item}</td>
                      <td>{row.unit}</td>
                      <td className="text-end">{formatCount(row.no_of_po)}</td>
                      <td className="text-end">{formatQty(row.po_qty)}</td>
                      <td className="text-end">{formatQty(row.received_qty)}</td>
                      <td className={`text-end ${Number(row.excess) > 0 ? "text-amber-300" : ""}`}>
                        {formatQty(row.excess)}
                      </td>
                      <td className={`text-end ${Number(row.shortage) > 0 ? "text-red-400" : ""}`}>
                        {formatQty(row.shortage)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="page-table-empty">
                      {!filters.vendor
                        ? "Select a vendor and run a search to view the report."
                        : report
                          ? "No lines match the selected filters."
                          : "Run a search to view the report."}
                    </td>
                  </tr>
                )}
              </tbody>
              {totals && sortedRows.length > 0 && (
                <tfoot>
                  <tr className="font-medium">
                    <td colSpan={2} className="text-end">
                      Totals
                    </td>
                    <td className="text-end text-slate-500">—</td>
                    <td className="text-end">{formatQty(totals.po_qty)}</td>
                    <td className="text-end">{formatQty(totals.received_qty)}</td>
                    <td className="text-end text-amber-300">{formatQty(totals.excess)}</td>
                    <td className="text-end text-red-400">{formatQty(totals.shortage)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderReport;
