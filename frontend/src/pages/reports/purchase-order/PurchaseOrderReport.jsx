import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import numeral from "numeral";
import AuthContext from "../../../templates/AuthContext";
import {
  generatePurchaseOrderReportPdf,
} from "./purchaseOrderReportPdf";
import DashboardBackLink from "../../../components/DashboardBackLink";

const emptyFilters = () => ({
  po_no: "",
  vendor: "",
  po_date_from: "",
  po_date_to: "",
  purchase_date_from: "",
  purchase_date_to: "",
  exclude_shortage_upto_5: false,
});

const formatQty = (value) => numeral(value || 0).format("0,0.##");
const formatCount = (value) => numeral(value || 0).format("0,0");

const FilterField = ({ label, title, children, className = "" }) => (
  <label className={`page-report-filter-field ${className}`} title={title}>
    <span className="page-report-filter-label">{label}</span>
    {children}
  </label>
);

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
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;
    setFilters((prev) => {
      const next = { ...prev, [name]: nextValue };
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
        if (key === "vendor") return;
        if (key === "exclude_shortage_upto_5") {
          if (value) fd.append(key, "true");
          return;
        }
        if (value) fd.append(key, value);
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
          <DashboardBackLink />
        </div>

        <div className="page-card-body">
          <div className="page-report-filters">
            <div className="page-report-filters-grid">
              <FilterField label="Vendor *" className="w-full sm:w-52">
                <select
                  className="page-select page-select-compact w-full"
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
              </FilterField>

              <FilterField label="PO" className="w-full sm:w-36">
                <select
                  className="page-select page-select-compact w-full"
                  name="po_no"
                  value={filters.po_no}
                  onChange={handleFilterChange}
                  disabled={filtersLoading || !filters.vendor}
                >
                  <option value="">All</option>
                  {poOptions.map((order) => (
                    <option key={order.po_no} value={order.po_no}>
                      {order.po_no}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="PO from" className="w-[8.75rem]">
                <input
                  className="page-select page-select-compact w-full"
                  type="date"
                  name="po_date_from"
                  value={filters.po_date_from}
                  onChange={handleFilterChange}
                />
              </FilterField>

              <FilterField label="PO to" className="w-[8.75rem]">
                <input
                  className="page-select page-select-compact w-full"
                  type="date"
                  name="po_date_to"
                  value={filters.po_date_to}
                  onChange={handleFilterChange}
                />
              </FilterField>

              <FilterField
                label="Purchase from"
                title="Leave blank to count from each item's earliest PO date"
                className="w-[8.75rem]"
              >
                <input
                  className="page-select page-select-compact w-full"
                  type="date"
                  name="purchase_date_from"
                  value={filters.purchase_date_from}
                  onChange={handleFilterChange}
                />
              </FilterField>

              <FilterField label="Purchase to" className="w-[8.75rem]">
                <input
                  className="page-select page-select-compact w-full"
                  type="date"
                  name="purchase_date_to"
                  value={filters.purchase_date_to}
                  onChange={handleFilterChange}
                />
              </FilterField>

              <label
                className="inline-flex items-center gap-1.5 pb-1 text-[11px] normal-case tracking-normal text-slate-300 cursor-pointer shrink-0"
                title="Hide fully received items and shortages up to 5%"
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-gray-600/60 bg-neutral-800/90 text-sky-500 focus:ring-sky-500/40"
                  name="exclude_shortage_upto_5"
                  checked={filters.exclude_shortage_upto_5}
                  onChange={handleFilterChange}
                />
                Shortage &gt;5% only
              </label>

              <div className="page-report-filter-actions sm:ml-auto">
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
                {sortedRows.length > 0 && (
                  <button
                    type="button"
                    className="page-icon-btn page-icon-btn-sky"
                    title="Save as PDF"
                    onClick={handleSavePdf}
                    disabled={loadingReport}
                  >
                    <i className="bi bi-file-earmark-pdf"></i>
                  </button>
                )}
              </div>
            </div>
          </div>

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
            <div className="page-report-summary">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
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
                {appliedFilters.exclude_shortage_upto_5 && (
                  <span className="text-slate-500">Shortage &gt;5% only</span>
                )}
              </div>
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
