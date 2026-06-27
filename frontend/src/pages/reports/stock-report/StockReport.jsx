import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import moment from "moment";
import numeral from "numeral";
import AuthContext from "../../../templates/AuthContext";
import { getCurrentAccountingYear } from "../../../utils/DatePeriods";

const createDefaultFilters = (mode = "detail") => {
  if (mode === "summary") {
    return {
      as_on: moment().format("YYYY-MM-DD"),
      group: "",
    };
  }

  const { date_from, date_to } = getCurrentAccountingYear();
  return {
    date_from,
    date_to,
    group: "",
    item_wise: true,
  };
};

const buildRequestFilters = (activeFilters, isSummary) => {
  if (isSummary) {
    return {
      date_from: "",
      date_to: activeFilters.as_on || "",
      group: activeFilters.group || "",
    };
  }

  return activeFilters;
};

const formatQty = (value) => numeral(value || 0).format("0,0.##");
const formatCount = (value) => numeral(value || 0).format("0,0");
const formatPrice = (value) =>
  value == null || value === "" ? "—" : numeral(value).format("0,0.00");

const qtyValue = (value) => Number(value) || 0;

const needsReorder = (row) =>
  Boolean(row.needs_reorder) ||
  (qtyValue(row.reorder_level) > 0 && qtyValue(row.closing_qty) < qtyValue(row.reorder_level));

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

const StockReport = ({ mode = "detail" }) => {
  const { api, authFetch } = useContext(AuthContext);
  const isSummary = mode === "summary";
  const [filters, setFilters] = useState(() => createDefaultFilters(mode));
  const [appliedFilters, setAppliedFilters] = useState(() => createDefaultFilters(mode));
  const [stockItems, setStockItems] = useState([]);
  const [report, setReport] = useState(null);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [message, setMessage] = useState(null);
  const [sort, setSort] = useState({ key: "stock_item", direction: "asc" });
  const [reorderOnly, setReorderOnly] = useState(false);

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

  const isItemWise = isSummary || filters.item_wise;

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
        if (!checked) {
          setReorderOnly(false);
        }
      }

      return next;
    });
  };

  const fetchReport = useCallback(async (activeFilters) => {
    if (isSummary) {
      if (!activeFilters.as_on) {
        setMessage({ type: "error", text: "As on date is required." });
        return;
      }
    } else if (
      activeFilters.date_from &&
      activeFilters.date_to &&
      activeFilters.date_from > activeFilters.date_to
    ) {
      setMessage({ type: "error", text: "From date cannot be after to date." });
      return;
    }

    const requestFilters = buildRequestFilters(activeFilters, isSummary);

    setLoadingReport(true);
    setMessage(null);

    try {
      const fd = new FormData();
      Object.entries(requestFilters).forEach(([key, value]) => {
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
  }, [api, authFetch, isSummary]);

  const runReport = useCallback(() => {
    fetchReport(filters);
  }, [fetchReport, filters]);

  useEffect(() => {
    fetchReport(createDefaultFilters(mode));
  }, [fetchReport, mode]);

  const clearFilters = () => {
    const cleared = createDefaultFilters(mode);
    setFilters(cleared);
    setAppliedFilters(cleared);
    setReport(null);
    setMessage(null);
    setSort({ key: "stock_item", direction: "asc" });
    setReorderOnly(false);
  };

  const handleSort = (key) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const itemRows = report?.rows || [];
  const filteredItemRows = useMemo(() => {
    if (!isItemWise || !reorderOnly) return itemRows;
    return itemRows.filter(needsReorder);
  }, [itemRows, isItemWise, reorderOnly]);

  const displayRows = useMemo(
    () => (isItemWise ? filteredItemRows : aggregateToGroups(itemRows)),
    [filteredItemRows, itemRows, isItemWise]
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

  const showTotals = sortedRows.length > 0;
  const totals = useMemo(
    () => (showTotals ? sumRowTotals(sortedRows) : null),
    [showTotals, sortedRows]
  );
  const periodLabel = useMemo(() => {
    if (isSummary) {
      return appliedFilters.as_on || "—";
    }

    const { date_from: from, date_to: to } = appliedFilters;
    if (from && to) return `${from} to ${to}`;
    if (from) return `from ${from}`;
    if (to) return `up to ${to}`;
    return "all dates";
  }, [appliedFilters, isSummary]);

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

  const columnCount = isSummary ? 7 : isItemWise ? 9 : 6;
  const reorderCount = useMemo(
    () => (isItemWise ? itemRows.filter(needsReorder).length : 0),
    [itemRows, isItemWise]
  );

  return (
    <div className="w-full">
      <div className="page-card">
        <div className="page-card-header">
          <div>
            <div className="page-card-title">
              <span className="page-card-title-icon">
                <i className={`bi ${isSummary ? "bi-clipboard-data" : "bi-boxes"}`}></i>
              </span>
              {isSummary ? "Stock Summary" : "Stock Report"}
            </div>
          </div>
        </div>

        <div className="page-card-body">
          <div className="page-report-filters">
            <div className="page-report-filters-grid">
              {isSummary ? (
                <FilterField label="As on" className="w-[8.75rem]">
                  <input
                    className="page-select page-select-compact w-full"
                    type="date"
                    name="as_on"
                    value={filters.as_on}
                    onChange={handleFilterChange}
                  />
                </FilterField>
              ) : (
                <>
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
                </>
              )}

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

              {!isSummary && (
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
              )}

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
                {!isSummary && (
                  <span>
                    View:{" "}
                    <span className="text-sky-300/90">
                      {isItemWise ? "Item wise" : "Group wise"}
                    </span>
                  </span>
                )}
                <span>
                  {isSummary ? "As on" : "Period"}:{" "}
                  <span className="text-sky-300/90">{periodLabel}</span>
                </span>
                <span>
                  Rows:{" "}
                  <span className="text-slate-200">
                    {sortedRows.length}
                    {reorderOnly && itemRows.length > 0 && (
                      <span className="text-slate-500"> / {formatCount(itemRows.length)}</span>
                    )}
                  </span>
                </span>
                {isItemWise && reorderCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    Reorder:
                    {reorderOnly ? (
                      <>
                        <span className="text-amber-300/90">{formatCount(reorderCount)}</span>
                        <button
                          type="button"
                          className="page-report-reorder-clear"
                          title="Clear reorder filter"
                          onClick={() => setReorderOnly(false)}
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="page-report-reorder-link"
                        title="Show reorder items only"
                        onClick={() => setReorderOnly(true)}
                      >
                        {formatCount(reorderCount)}
                      </button>
                    )}
                  </span>
                )}
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
                {isSummary ? (
                  <tr>
                    <TextSortHeader label="Item" sortKey="stock_item" />
                    <TextSortHeader label="Group" sortKey="group" />
                    <th>Unit</th>
                    <SortableHeader label="Closing" sortKey="closing_qty" />
                    <th className="text-center">Status</th>
                    <SortableHeader label="Avg Cost Price" sortKey="avg_price" />
                    <SortableHeader label="Avg Selling Price" sortKey="avg_selling_price" />
                  </tr>
                ) : isItemWise ? (
                  <tr>
                    <TextSortHeader label="Item" sortKey="stock_item" />
                    <TextSortHeader label="Group" sortKey="group" />
                    <th>Unit</th>
                    <SortableHeader label="Opening" sortKey="opening_qty" />
                    <SortableHeader label="Purchase" sortKey="purchase_qty" />
                    <SortableHeader label="Sales" sortKey="sales_qty" />
                    <SortableHeader label="Closing" sortKey="closing_qty" />
                    <SortableHeader label="Reorder Level" sortKey="reorder_level" />
                    <th className="text-center">Status</th>
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
                    sortedRows.map((row) => {
                      const reorder = needsReorder(row);

                      if (isSummary) {
                        return (
                          <tr
                            key={row.stock_item}
                            className={reorder ? "page-table-row-reorder" : undefined}
                          >
                            <td>{row.stock_item}</td>
                            <td className="text-slate-400">{row.group}</td>
                            <td>{row.unit}</td>
                            <td className={`text-end ${reorder ? "text-amber-300" : "text-sky-300"}`}>
                              {formatQty(row.closing_qty)}
                            </td>
                            <td className="text-center">
                              {reorder ? (
                                <span className="page-table-reorder-badge">Reorder</span>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                            <td className="text-end text-slate-500">{formatPrice(row.avg_price)}</td>
                            <td className="text-end text-slate-500">{formatPrice(row.avg_selling_price)}</td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={row.stock_item}
                          className={reorder ? "page-table-row-reorder" : undefined}
                        >
                          <td>{row.stock_item}</td>
                          <td className="text-slate-400">{row.group}</td>
                          <td>{row.unit}</td>
                          <td className="text-end">{formatQty(row.opening_qty)}</td>
                          <td className="text-end">{formatQty(row.purchase_qty)}</td>
                          <td className="text-end">{formatQty(row.sales_qty)}</td>
                          <td className={`text-end ${reorder ? "text-amber-300" : "text-sky-300"}`}>
                            {formatQty(row.closing_qty)}
                          </td>
                          <td className="text-end">{formatQty(row.reorder_level)}</td>
                          <td className="text-center">
                            {reorder ? (
                              <span className="page-table-reorder-badge">Reorder</span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
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
                      {reorderOnly
                        ? "No reorder items match the selected filters."
                        : report || loadingReport
                          ? "No stock movements match the selected filters."
                          : `Run a search to view the stock ${isSummary ? "summary" : "report"}.`}
                    </td>
                  </tr>
                )}
              </tbody>
              {showTotals && (
                <tfoot>
                  <tr className="font-medium">
                    {isSummary ? (
                      <>
                        <td colSpan={3} className="text-end">
                          Totals
                        </td>
                        <td className="text-end text-sky-300">{formatQty(totals.closing_qty)}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                      </>
                    ) : isItemWise ? (
                      <>
                        <td colSpan={3} className="text-end">
                          Totals
                        </td>
                        <td className="text-end">{formatQty(totals.opening_qty)}</td>
                        <td className="text-end">{formatQty(totals.purchase_qty)}</td>
                        <td className="text-end">{formatQty(totals.sales_qty)}</td>
                        <td className="text-end text-sky-300">{formatQty(totals.closing_qty)}</td>
                        <td></td>
                        <td></td>
                      </>
                    ) : (
                      <>
                        <td colSpan={2} className="text-end">
                          Totals
                        </td>
                        <td className="text-end">{formatQty(totals.opening_qty)}</td>
                        <td className="text-end">{formatQty(totals.purchase_qty)}</td>
                        <td className="text-end">{formatQty(totals.sales_qty)}</td>
                        <td className="text-end text-sky-300">{formatQty(totals.closing_qty)}</td>
                      </>
                    )}
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
