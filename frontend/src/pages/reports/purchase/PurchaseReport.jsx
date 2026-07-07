import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import numeral from "numeral";
import AuthContext from "../../../templates/AuthContext";
import DashboardBackLink from "../../../components/DashboardBackLink";
import PdfPreviewModal from "../../../components/PdfPreviewModal";
import { getCurrentAccountingYear } from "../../../utils/DatePeriods";
import { formatDisplayDateRange } from "../../../utils/formatDisplayDate";
import { createPurchaseReportPdfBlob } from "./purchaseReportPdf";

const createDefaultFilters = () => {
  const { date_from, date_to } = getCurrentAccountingYear();
  return {
    date_from,
    date_to,
    vendor: "",
    group: "",
  };
};

const formatQty = (value) => numeral(value || 0).format("0,0.##");
const formatPrice = (value) =>
  value == null || value === "" ? "—" : numeral(value).format("0,0.00");

const FilterField = ({ label, title, children, className = "" }) => (
  <label className={`page-report-filter-field ${className}`} title={title}>
    <span className="page-report-filter-label">{label}</span>
    {children}
  </label>
);

const PurchaseReport = () => {
  const { api, authFetch, company } = useContext(AuthContext);
  const [filters, setFilters] = useState(createDefaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(createDefaultFilters);
  const [vendors, setVendors] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [report, setReport] = useState(null);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [message, setMessage] = useState(null);
  const [pdfMessage, setPdfMessage] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [sort, setSort] = useState({ key: "stock_item", direction: "asc" });

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

  const loadStockItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const response = await authFetch(`${api}/masters/stock-items`, {
        method: "POST",
      });
      const data = await response.json();
      setStockItems(data.status === "success" ? data.data || [] : []);
    } catch {
      setStockItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, [api, authFetch]);

  useEffect(() => {
    loadVendors();
    loadStockItems();
  }, [loadVendors, loadStockItems]);

  useEffect(() => {
    return () => {
      if (pdfPreview?.url) {
        URL.revokeObjectURL(pdfPreview.url);
      }
    };
  }, [pdfPreview?.url]);

  const groupOptions = useMemo(() => {
    const groups = new Set(
      stockItems.map((item) => (item.parent || "").trim()).filter(Boolean)
    );
    return [...groups].sort((a, b) => a.localeCompare(b));
  }, [stockItems]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const runReport = useCallback(async () => {
    if (!filters.date_from || !filters.date_to) {
      setMessage({ type: "error", text: "Select a date range to generate the report." });
      return;
    }

    if (!filters.vendor) {
      setMessage({ type: "error", text: "Select a vendor to generate the report." });
      return;
    }

    if (filters.date_from > filters.date_to) {
      setMessage({ type: "error", text: "From date cannot be after to date." });
      return;
    }

    setLoadingReport(true);
    setMessage(null);
    setPdfMessage(null);

    try {
      const fd = new FormData();
      fd.append("date_from", filters.date_from);
      fd.append("date_to", filters.date_to);
      fd.append("vendor", filters.vendor);
      if (filters.group) {
        fd.append("group", filters.group);
      }

      const response = await authFetch(`${api}/purchases/report`, {
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

  const closePdfPreview = () => {
    setPdfPreview((current) => {
      if (current?.url) {
        URL.revokeObjectURL(current.url);
      }
      return null;
    });
  };

  const clearFilters = () => {
    const cleared = createDefaultFilters();
    setFilters(cleared);
    setAppliedFilters(cleared);
    setReport(null);
    setMessage(null);
    setPdfMessage(null);
    closePdfPreview();
    setSort({ key: "stock_item", direction: "asc" });
  };

  const loadCompanyForPdf = useCallback(async () => {
    try {
      const response = await authFetch(`${api}/masters/company`, { method: "POST" });
      const data = await response.json();
      if (data.status === "success" && data.data) {
        return data.data;
      }
    } catch {
      // Fall back to cached company details.
    }
    return company;
  }, [api, authFetch, company]);

  const handleSort = (key) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const rows = report?.rows || [];
  const sortedRows = useMemo(() => {
    if (!sort.key || rows.length === 0) return rows;

    return [...rows].sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];

      if (sort.key === "carton" || sort.key === "qty" || sort.key === "list_price") {
        const leftNum = Number(left) || 0;
        const rightNum = Number(right) || 0;
        if (leftNum === rightNum) {
          return String(a.stock_item).localeCompare(String(b.stock_item));
        }
        return sort.direction === "asc" ? leftNum - rightNum : rightNum - leftNum;
      }

      const comparison = String(left || "").localeCompare(String(right || ""));
      if (comparison !== 0) {
        return sort.direction === "asc" ? comparison : -comparison;
      }
      return String(a.stock_item).localeCompare(String(b.stock_item));
    });
  }, [rows, sort]);

  const handleOpenPdf = useCallback(async () => {
    setPdfMessage(null);

    if (!report?.rows?.length) {
      setPdfMessage({ type: "error", text: "Generate the report before opening the PDF." });
      return;
    }

    closePdfPreview();
    setLoadingPdf(true);
    setPdfPreview({ url: "", fileName: "" });

    try {
      const companyForPdf = await loadCompanyForPdf();
      const { blob, fileName } = await createPurchaseReportPdfBlob({
        company: companyForPdf,
        filters: appliedFilters,
        report,
        rows: sortedRows,
      });
      const url = URL.createObjectURL(blob);
      setPdfPreview({ url, fileName });
    } catch (err) {
      console.error("PDF generation failed:", err);
      closePdfPreview();
      setPdfMessage({
        type: "error",
        text: err?.message || "Failed to generate PDF. Please try again.",
      });
    } finally {
      setLoadingPdf(false);
    }
  }, [appliedFilters, loadCompanyForPdf, report, sortedRows]);

  const handleDownloadPdf = () => {
    if (!pdfPreview?.url || !pdfPreview?.fileName) return;

    const link = document.createElement("a");
    link.href = pdfPreview.url;
    link.download = pdfPreview.fileName;
    link.click();
    setPdfMessage({ type: "success", text: "Purchase report PDF downloaded." });
  };

  const totals = report?.totals;
  const filtersLoading = loadingVendors || loadingItems;
  const sortIcon = (key) => {
    if (sort.key !== key) return "bi-arrow-down-up text-slate-600";
    return sort.direction === "asc" ? "bi-sort-alpha-down" : "bi-sort-alpha-up";
  };
  const numericSortIcon = (key) => {
    if (sort.key !== key) return "bi-arrow-down-up text-slate-600";
    return sort.direction === "asc" ? "bi-sort-numeric-down" : "bi-sort-numeric-up";
  };

  return (
    <div className="w-full">
      <div className="page-card">
        <div className="page-card-header">
          <div>
            <div className="page-card-title">
              <span className="page-card-title-icon">
                <i className="bi bi-cart-check"></i>
              </span>
              Purchase Report
            </div>
            <p className="page-card-subtitle mt-0.5 ps-10">
              Purchases grouped by stock item for the selected vendor
            </p>
          </div>
          <DashboardBackLink />
        </div>

        <div className="page-card-body">
          <form
            autoComplete="off"
            onSubmit={(event) => {
              event.preventDefault();
              runReport();
            }}
          >
            <div className="page-report-filters">
              <div className="page-report-filters-grid">
                <FilterField label="From" className="w-[8.75rem]">
                  <input
                    className="page-select page-select-compact w-full"
                    type="date"
                    name="date_from"
                    value={filters.date_from}
                    onChange={handleFilterChange}
                    autoComplete="off"
                    required
                  />
                </FilterField>

                <FilterField label="To" className="w-[8.75rem]">
                  <input
                    className="page-select page-select-compact w-full"
                    type="date"
                    name="date_to"
                    value={filters.date_to}
                    onChange={handleFilterChange}
                    autoComplete="off"
                    required
                  />
                </FilterField>

                <FilterField label="Vendor *" className="w-full sm:w-52">
                  <select
                    className="page-select page-select-compact w-full"
                    name="vendor"
                    value={filters.vendor}
                    onChange={handleFilterChange}
                    disabled={filtersLoading}
                    autoComplete="off"
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

                <FilterField label="Group" className="w-full sm:w-48">
                  <select
                    className="page-select page-select-compact w-full"
                    name="group"
                    value={filters.group}
                    onChange={handleFilterChange}
                    disabled={filtersLoading}
                    autoComplete="off"
                  >
                    <option value="">All groups</option>
                    {groupOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </FilterField>

                <div className="page-report-filter-actions sm:ml-auto">
                  <button
                    type="submit"
                    className="page-icon-btn page-icon-btn-sky"
                    title="Generate report"
                    disabled={loadingReport}
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
                      className="page-icon-btn page-icon-btn-danger"
                      title="View PDF"
                      onClick={handleOpenPdf}
                      disabled={loadingReport || loadingPdf}
                    >
                      <i className="bi bi-file-earmark-pdf"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>

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
                  Period:{" "}
                  <span className="text-sky-300/90">
                    {formatDisplayDateRange(appliedFilters.date_from, appliedFilters.date_to)}
                  </span>
                </span>
                <span>
                  Vendor: <span className="text-sky-300/90">{appliedFilters.vendor}</span>
                </span>
                {appliedFilters.group && (
                  <span>
                    Group: <span className="text-sky-300/90">{appliedFilters.group}</span>
                  </span>
                )}
                <span>
                  Rows: <span className="text-slate-200">{report.summary.row_count}</span>
                </span>
              </div>
            </div>
          )}

          <div className="page-table-wrap">
            <table className="page-table page-report-table">
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => handleSort("stock_item")}
                    >
                      Stock Item
                      <i className={`bi ${sortIcon("stock_item")}`}></i>
                    </button>
                  </th>
                  <th className="text-end">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 justify-end w-full"
                      onClick={() => handleSort("carton")}
                    >
                      Carton
                      <i className={`bi ${numericSortIcon("carton")}`}></i>
                    </button>
                  </th>
                  <th className="text-end">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 justify-end w-full"
                      onClick={() => handleSort("qty")}
                    >
                      Qty
                      <i className={`bi ${numericSortIcon("qty")}`}></i>
                    </button>
                  </th>
                  <th className="text-end">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 justify-end w-full"
                      onClick={() => handleSort("list_price")}
                    >
                      List Price
                      <i className={`bi ${numericSortIcon("list_price")}`}></i>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingReport ? (
                  <tr>
                    <td colSpan={4} className="page-table-empty">
                      Generating report...
                    </td>
                  </tr>
                ) : sortedRows.length > 0 ? (
                  sortedRows.map((row) => (
                    <tr key={row.stock_item}>
                      <td>{row.stock_item}</td>
                      <td className="text-end">{formatQty(row.carton)}</td>
                      <td className="text-end">{formatQty(row.qty)}</td>
                      <td className="text-end">{formatPrice(row.list_price)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="page-table-empty">
                      {report
                        ? "No purchases match the selected filters."
                        : "Select a vendor and run a search to view the report."}
                    </td>
                  </tr>
                )}
              </tbody>
              {totals && sortedRows.length > 0 && (
                <tfoot>
                  <tr className="font-medium">
                    <td className="text-end">
                      Totals
                    </td>
                    <td className="text-end">{formatQty(totals.carton)}</td>
                    <td className="text-end">{formatQty(totals.qty)}</td>
                    <td className="text-end text-slate-500">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      <PdfPreviewModal
        open={loadingPdf || Boolean(pdfPreview)}
        title="Purchase Report"
        fileName={pdfPreview?.fileName}
        pdfUrl={pdfPreview?.url}
        loading={loadingPdf}
        onClose={() => {
          if (!loadingPdf) {
            closePdfPreview();
          }
        }}
        onDownload={handleDownloadPdf}
      />
    </div>
  );
};

export default PurchaseReport;
