import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import numeral from "numeral";
import AuthContext from "../../../templates/AuthContext";
import { getCurrentAccountingYear } from "../../../utils/DatePeriods";

const defaultFilters = () => {
  const { date_from, date_to } = getCurrentAccountingYear();
  return {
    date_from,
    date_to,
    group: "",
    item_wise: true,
  };
};

const formatQty = (value) => numeral(value || 0).format("0,0.##");
const formatCount = (value) => numeral(value || 0).format("0,0");

const qtyValue = (value) => Number(value) || 0;

const aggregateToGroups = (items) => {
  const grouped = new Map();

  items.forEach((row) => {
    const group = (row.group || "").trim();
    if (!group) return;

    const entry = grouped.get(group) || {
      group,
      item_count: 0,
      opening_qty: 0,
      purchase_qty: 0,
      sales_qty: 0,
      closing_qty: 0,
    };

    entry.item_count += 1;
    entry.opening_qty += qtyValue(row.opening_qty);
    entry.purchase_qty += qtyValue(row.purchase_qty);
    entry.sales_qty += qtyValue(row.sales_qty);
    entry.closing_qty += qtyValue(row.closing_qty);
    grouped.set(group, entry);
  });

  return [...grouped.values()].sort((a, b) => a.group.localeCompare(b.group));
};

const sumRowTotals = (rows) =>
  rows.reduce(
    (totals, row) => ({
      opening_qty: totals.opening_qty + qtyValue(row.opening_qty),
      purchase_qty: totals.purchase_qty + qtyValue(row.purchase_qty),
      sales_qty: totals.sales_qty + qtyValue(row.sales_qty),
      closing_qty: totals.closing_qty + qtyValue(row.closing_qty),
    }),
    { opening_qty: 0, purchase_qty: 0, sales_qty: 0, closing_qty: 0 }
  );

const FilterField = ({ label, title, children, className = "" }) => (
  <label className={`page-report-filter-field ${className}`} title={title}>
    <span className="page-report-filter-label">{label}</span>
    {children}
  </label>
);

const StockReport = () => {
  const { api, authFetch } = useContext(AuthContext);
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [stockItems, setStockItems] = useState([]);
  const [report, setReport] = useState(null);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [message, setMessage] = useState(null);
  const [sort, setSort] = useState({ key: "stock_item", direction: "asc" });

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
    loadStockItems();
  }, [loadStockItems]);

  const groupOptions = useMemo(() => {
    const groups = new Set(
      stockItems.map((item) => (item.parent || "").trim()).filter(Boolean)
    );
    return [...groups].sort((a, b) => a.localeCompare(b));
  }, [stockItems]);

  const isAllGroups = !appliedFilters.group;
  const isItemWise = filters.item_wise;

  const handleFilterChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFilters((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "item_wise") {
        setSort({
          key: checked ? "stock_item" : "group",
          direction: "asc",
        });
      }

      return next;
    });
  };

  const fetchReport = useCallback(async (activeFilters) => {
    if (
      activeFilters.date_from &&
      activeFilters.date_to &&
      activeFilters.date_from > activeFilters.date_to
    ) {
      setMessage({ type: "error", text: "From date cannot be after to date." });
      return;
    }

    setLoadingReport(true);
    setMessage(null);

    try {
      const fd = new FormData();
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (key === "item_wise") return;
        if (value) fd.append(key, value);
      });

      const response = await authFetch(`${api}/reports/stock`, {
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

      setAppliedFilters({ ...activeFilters });
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
  }, [api, authFetch]);

  const runReport = useCallback(() => {
    fetchReport(filters);
  }, [fetchReport, filters]);

  useEffect(() => {
    fetchReport(defaultFilters());
  }, [fetchReport]);

  const clearFilters = () => {
    const cleared = defaultFilters();
    setFilters(cleared);
    setAppliedFilters(cleared);
    setReport(null);
    setMessage(null);
    setSort({ key: "stock_item", direction: "asc" });
  };

  const handleSort = (key) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const itemRows = report?.rows || [];
  const displayRows = useMemo(
    () => (isItemWise ? itemRows : aggregateToGroups(itemRows)),
    [itemRows, isItemWise]
  );

  const sortedRows = useMemo(() => {
    if (!displayRows.length) return displayRows;

    return [...displayRows].sort((a, b) => {
      if (sort.key === "stock_item" || sort.key === "group") {
        const left = a[sort.key] || "";
        const right = b[sort.key] || "";
        const cmp = left.localeCompare(right);
        if (cmp !== 0) {
          return sort.direction === "asc" ? cmp : -cmp;
        }
        return (a.stock_item || a.group || "").localeCompare(b.stock_item || b.group || "");
      }

      if (sort.key === "item_count") {
        const left = Number(a.item_count) || 0;
        const right = Number(b.item_count) || 0;
        if (left === right) {
          return (a.group || "").localeCompare(b.group || "");
        }
        return sort.direction === "asc" ? left - right : right - left;
      }

      const left = Number(a[sort.key]) || 0;
      const right = Number(b[sort.key]) || 0;
      const tieBreak = isItemWise
        ? (a.stock_item || "").localeCompare(b.stock_item || "")
        : (a.group || "").localeCompare(b.group || "");
      if (left === right) return tieBreak;
      return sort.direction === "asc" ? left - right : right - left;
    });
  }, [displayRows, sort, isItemWise]);

  const showTotals = isAllGroups && sortedRows.length > 0;
  const totals = useMemo(
    () => (showTotals ? sumRowTotals(sortedRows) : null),
    [showTotals, sortedRows]
  );
  const periodLabel = useMemo(() => {
    const { date_from: from, date_to: to } = appliedFilters;
    if (from && to) return `${from} to ${to}`;
    if (from) return `from ${from}`;
    if (to) return `up to ${to}`;
    return "all dates";
  }, [appliedFilters]);

  const SortableHeader = ({ label, sortKey, align = "text-end" }) => {
    const isActive = sort.key === sortKey;
    const icon = isActive
      ? sort.direction === "asc"
        ? "bi-caret-up-fill"
        : "bi-caret-down-fill"
      : "bi-arrow-down-up";

    return (
      <th className={align}>
        <button
          type="button"
          className="inline-flex items-center justify-end gap-1 w-full text-inherit hover:text-sky-300"
          onClick={() => handleSort(sortKey)}
        >
          <span>{label}</span>
          <i className={`bi ${icon} text-[10px] ${isActive ? "text-sky-300" : "text-slate-500"}`}></i>
        </button>
      </th>
    );
  };

  const TextSortHeader = ({ label, sortKey }) => {
    const isActive = sort.key === sortKey;
    const icon = isActive
      ? sort.direction === "asc"
        ? "bi-caret-up-fill"
        : "bi-caret-down-fill"
      : "bi-arrow-down-up";

    return (
      <th>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-inherit hover:text-sky-300"
          onClick={() => handleSort(sortKey)}
        >
          <span>{label}</span>
          <i className={`bi ${icon} text-[10px] ${isActive ? "text-sky-300" : "text-slate-500"}`}></i>
        </button>
      </th>
    );
  };

  const columnCount = isItemWise ? 7 : 6;

  return (
    <div className="w-full">
      <div className="page-card">
        <div className="page-card-header">
          <div>
            <div className="page-card-title">
              <span className="page-card-title-icon">
                <i className="bi bi-boxes"></i>
              </span>
              Stock Report
            </div>
            <p className="page-card-subtitle mt-0.5 ps-10">
              Opening + purchase - sales = closing by item or group
            </p>
          </div>
        </div>

        <div className="page-card-body">
          <div className="page-report-filters">
            <div className="page-report-filters-grid">
              <FilterField label="From" className="w-[8.75rem]">
                <input
                  className="page-select page-select-compact w-full"
                  type="date"
                  name="date_from"
                  value={filters.date_from}
                  onChange={handleFilterChange}
                />
              </FilterField>

              <FilterField label="To" className="w-[8.75rem]">
                <input
                  className="page-select page-select-compact w-full"
                  type="date"
                  name="date_to"
                  value={filters.date_to}
                  onChange={handleFilterChange}
                />
              </FilterField>

              <FilterField label="Group" className="w-full sm:w-48">
                <select
                  className="page-select page-select-compact w-full"
                  name="group"
                  value={filters.group}
                  onChange={handleFilterChange}
                  disabled={loadingItems}
                >
                  <option value="">All groups</option>
                  {groupOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </FilterField>

              <label
                className="inline-flex items-center gap-1.5 pb-1 text-[11px] normal-case tracking-normal text-slate-300 cursor-pointer shrink-0"
                title="Show one row per stock item; uncheck for group totals"
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-gray-600/60 bg-neutral-800/90 text-sky-500 focus:ring-sky-500/40"
                  name="item_wise"
                  checked={filters.item_wise}
                  onChange={handleFilterChange}
                />
                Item wise
              </label>

              <div className="page-report-filter-actions sm:ml-auto">
                <button
                  type="button"
                  className="page-icon-btn page-icon-btn-sky"
                  title="Generate report"
                  onClick={runReport}
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
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`flex items-start gap-2 text-xs normal-case tracking-normal mb-3 ${
                message.type === "error"
                  ? "text-red-400"
                  : message.type === "success"
                    ? "text-emerald-400"
                    : "text-slate-400"
              }`}
            >
              <i
                className={`bi mt-0.5 shrink-0 ${
                  message.type === "error"
                    ? "bi-exclamation-circle"
                    : message.type === "success"
                      ? "bi-check-circle"
                      : "bi-info-circle"
                }`}
              ></i>
              <span>{message.text}</span>
            </div>
          )}

          {report?.summary && (
            <div className="page-report-summary">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  View:{" "}
                  <span className="text-sky-300/90">{isItemWise ? "Item wise" : "Group wise"}</span>
                </span>
                <span>
                  Period: <span className="text-sky-300/90">{periodLabel}</span>
                </span>
                <span>
                  Rows: <span className="text-slate-200">{sortedRows.length}</span>
                </span>
                {appliedFilters.group && (
                  <span>
                    Group: <span className="text-sky-300/90">{appliedFilters.group}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="page-table-wrap">
            <table className="page-table">
              <thead>
                {isItemWise ? (
                  <tr>
                    <TextSortHeader label="Item" sortKey="stock_item" />
                    <TextSortHeader label="Group" sortKey="group" />
                    <th>Unit</th>
                    <SortableHeader label="Opening" sortKey="opening_qty" />
                    <SortableHeader label="Purchase" sortKey="purchase_qty" />
                    <SortableHeader label="Sales" sortKey="sales_qty" />
                    <SortableHeader label="Closing" sortKey="closing_qty" />
                  </tr>
                ) : (
                  <tr>
                    <TextSortHeader label="Group" sortKey="group" />
                    <SortableHeader label="Items" sortKey="item_count" />
                    <SortableHeader label="Opening" sortKey="opening_qty" />
                    <SortableHeader label="Purchase" sortKey="purchase_qty" />
                    <SortableHeader label="Sales" sortKey="sales_qty" />
                    <SortableHeader label="Closing" sortKey="closing_qty" />
                  </tr>
                )}
              </thead>
              <tbody>
                {loadingReport ? (
                  <tr>
                    <td colSpan={columnCount} className="page-table-empty">
                      Generating report...
                    </td>
                  </tr>
                ) : sortedRows.length > 0 ? (
                  isItemWise ? (
                    sortedRows.map((row) => (
                      <tr key={row.stock_item}>
                        <td>{row.stock_item}</td>
                        <td className="text-slate-400">{row.group}</td>
                        <td>{row.unit}</td>
                        <td className="text-end">{formatQty(row.opening_qty)}</td>
                        <td className="text-end">{formatQty(row.purchase_qty)}</td>
                        <td className="text-end">{formatQty(row.sales_qty)}</td>
                        <td className="text-end text-sky-300">{formatQty(row.closing_qty)}</td>
                      </tr>
                    ))
                  ) : (
                    sortedRows.map((row) => (
                      <tr key={row.group}>
                        <td>{row.group}</td>
                        <td className="text-end">{formatCount(row.item_count)}</td>
                        <td className="text-end">{formatQty(row.opening_qty)}</td>
                        <td className="text-end">{formatQty(row.purchase_qty)}</td>
                        <td className="text-end">{formatQty(row.sales_qty)}</td>
                        <td className="text-end text-sky-300">{formatQty(row.closing_qty)}</td>
                      </tr>
                    ))
                  )
                ) : (
                  <tr>
                    <td colSpan={columnCount} className="page-table-empty">
                      {report || loadingReport
                        ? "No stock movements match the selected filters."
                        : "Run a search to view the stock report."}
                    </td>
                  </tr>
                )}
              </tbody>
              {showTotals && (
                <tfoot>
                  <tr className="font-medium">
                    <td colSpan={isItemWise ? 3 : 2} className="text-end">
                      Totals
                    </td>
                    <td className="text-end">{formatQty(totals.opening_qty)}</td>
                    <td className="text-end">{formatQty(totals.purchase_qty)}</td>
                    <td className="text-end">{formatQty(totals.sales_qty)}</td>
                    <td className="text-end text-sky-300">{formatQty(totals.closing_qty)}</td>
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

export default StockReport;
