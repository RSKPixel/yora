import React, { useMemo, useState } from 'react';
import moment from 'moment';
import numeral from 'numeral';

const createBlankStockItem = () => ({
  stock_item: '',
  qty: 0,
});

const createBlankRow = () => ({
  no_of_carton: 0,
  qty_per_carton: 0,
  stock_items: [createBlankStockItem()],
});

const computeRowTotalQty = (row) =>
  Number(row.no_of_carton || 0) * Number(row.qty_per_carton || 0);

const getPackedTotals = (packingList) => {
  const totals = {};
  packingList.forEach((row) => {
    row.stock_items.forEach((item) => {
      if (!item.stock_item) return;
      totals[item.stock_item] = (totals[item.stock_item] || 0) + Number(item.qty || 0);
    });
  });
  return totals;
};

const getInvoiceQtyMap = (details) =>
  Object.fromEntries(details.map((d) => [d.stock_item, Number(d.qty)]));

const getPackingListErrors = (packingList, remainingByItem) => {
  const errors = [];

  if (remainingByItem.some((item) => item.remaining < 0)) {
    errors.push('Packed quantity exceeds invoice quantity for one or more items.');
  }

  if (remainingByItem.some((item) => item.remaining > 0)) {
    errors.push('All invoice items must be fully allocated before submitting.');
  }

  packingList.forEach((row, rowIndex) => {
    const rowTotalQty = computeRowTotalQty(row);
    const stockItemsSum = row.stock_items.reduce(
      (sum, item) => sum + Number(item.qty || 0),
      0
    );
    const hasStockItems = row.stock_items.some((item) => item.stock_item);

    if (!hasStockItems && rowTotalQty === 0) return;

    if (rowTotalQty > 0 && !hasStockItems) {
      errors.push(`Row ${rowIndex + 1}: add stock items for the carton quantities entered.`);
    }

    if (hasStockItems) {
      row.stock_items.forEach((item, itemIndex) => {
        if (!item.stock_item && Number(item.qty) > 0) {
          errors.push(`Row ${rowIndex + 1}, line ${itemIndex + 1}: select a stock item.`);
        }
        if (item.stock_item && Number(item.qty) <= 0) {
          errors.push(`Row ${rowIndex + 1}, line ${itemIndex + 1}: quantity must be greater than 0.`);
        }
      });
    }

    if (rowTotalQty > 0 && stockItemsSum > 0 && rowTotalQty !== stockItemsSum) {
      errors.push(
        `Row ${rowIndex + 1}: carton total (${rowTotalQty}) must match stock item qty sum (${stockItemsSum}).`
      );
    }
  });

  return errors;
};

const PackingList = ({ salesInvoice, setShowPackingList }) => {
  const [packingList, setPackingList] = useState([createBlankRow()]);
  const [formMessage, setFormMessage] = useState(null);

  const invoiceQtyMap = useMemo(
    () => getInvoiceQtyMap(salesInvoice.details),
    [salesInvoice.details]
  );

  const packedTotals = useMemo(
    () => getPackedTotals(packingList),
    [packingList]
  );

  const remainingByItem = useMemo(() => {
    return salesInvoice.details.map((detail) => {
      const invoiceQty = invoiceQtyMap[detail.stock_item] || 0;
      const packedQty = packedTotals[detail.stock_item] || 0;
      return {
        stock_item: detail.stock_item,
        invoiceQty,
        packedQty,
        remaining: invoiceQty - packedQty,
      };
    });
  }, [salesInvoice.details, invoiceQtyMap, packedTotals]);

  const packingErrors = useMemo(
    () => getPackingListErrors(packingList, remainingByItem),
    [packingList, remainingByItem]
  );

  const canSubmit = packingErrors.length === 0;

  const remainingMap = useMemo(
    () => Object.fromEntries(remainingByItem.map((item) => [item.stock_item, item.remaining])),
    [remainingByItem]
  );

  const updateRow = (rowIndex, field, value) => {
    setPackingList((prev) =>
      prev.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row
      )
    );
    setFormMessage(null);
  };

  const updateStockItem = (rowIndex, itemIndex, field, value) => {
    setPackingList((prev) =>
      prev.map((row, index) => {
        if (index !== rowIndex) return row;
        return {
          ...row,
          stock_items: row.stock_items.map((item, stockIndex) =>
            stockIndex === itemIndex ? { ...item, [field]: value } : item
          ),
        };
      })
    );
    setFormMessage(null);
  };

  const addRow = () => {
    setPackingList((prev) => [...prev, createBlankRow()]);
    setFormMessage(null);
  };

  const removeRow = (rowIndex) => {
    setPackingList((prev) => {
      if (prev.length === 1) return [createBlankRow()];
      return prev.filter((_, index) => index !== rowIndex);
    });
    setFormMessage(null);
  };

  const addStockItem = (rowIndex) => {
    setPackingList((prev) =>
      prev.map((row, index) =>
        index === rowIndex
          ? { ...row, stock_items: [...row.stock_items, createBlankStockItem()] }
          : row
      )
    );
    setFormMessage(null);
  };

  const removeStockItem = (rowIndex, itemIndex) => {
    setPackingList((prev) =>
      prev.map((row, index) => {
        if (index !== rowIndex) return row;
        const stockItems =
          row.stock_items.length === 1
            ? [createBlankStockItem()]
            : row.stock_items.filter((_, stockIndex) => stockIndex !== itemIndex);
        return { ...row, stock_items: stockItems };
      })
    );
    setFormMessage(null);
  };

  const getAvailableStockItems = (rowIndex, itemIndex) => {
    const selectedInRow = packingList[rowIndex].stock_items
      .map((item, index) => (index === itemIndex ? null : item.stock_item))
      .filter(Boolean);

    return salesInvoice.details.filter(
      (detail) =>
        !selectedInRow.includes(detail.stock_item) &&
        (remainingMap[detail.stock_item] ?? 0) > 0
    );
  };

  const validatePackingList = () => getPackingListErrors(packingList, remainingByItem);

  const handleSubmit = () => {
    const errors = validatePackingList();
    if (errors.length > 0) {
      setFormMessage({ type: 'error', message: errors[0] });
      return;
    }

    console.log(packingList);

    setFormMessage({
      type: 'success',
      message: 'Packing list is valid. Save API is not connected yet.',
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
      <div className="flex flex-col w-full  max-h-[90vh] shadow-2xl overflow-hidden rounded-lg border border-sky-900/80">
        <div className="flex flex-row w-full justify-between items-center px-4 py-1 text-sm font-bold shrink-0 border-b border-sky-900 bg-sky-950">
          <span className="flex items-center gap-2 text-white/90">
            <i className="bi bi-box-seam text-sky-400"></i>
            Packing List
          </span>
          <button
            type="button"
            className="text-white/50 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-white/5"
            onClick={() => setShowPackingList(false)}
            aria-label="Close"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="flex flex-row flex-1 min-h-0 bg-neutral-900">
          {/* Left panel — invoice summary + remaining */}
          <aside className="w-96 shrink-0 flex flex-col gap-3 p-4 border-r border-gray-700/80 min-h-0">
            <section className="shrink-0 rounded-lg border border-gray-700/80 bg-neutral-800/50 p-3">
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-white/40">No</dt>
                  <dd className="font-semibold text-white/90">{salesInvoice.invoice_no}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-white/40">Date</dt>
                  <dd className="font-semibold text-white/90">
                    {moment(salesInvoice.invoice_date).format('DD-MM-YYYY')}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] uppercase tracking-wider text-white/40">Buyer</dt>
                  <dd className="font-semibold text-white/90 wrap_break-word">{salesInvoice.buyer}</dd>
                </div>
              </dl>
            </section>

            <section className="flex-1 min-h-0 rounded-lg border border-sky-800/60 bg-neutral-800/60 p-4 flex flex-col shadow-inner">
              <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 mb-1">
                Remaining by line
              </h3>
              <p className="text-[10px] text-white/40 mb-4">Packed vs invoice quantity per item</p>
              <div className="flex-1 space-y-3 overflow-y-auto pr-1 min-h-0">
                {remainingByItem.map((item) => {
                  const pct =
                    item.invoiceQty > 0
                      ? Math.min(100, (item.packedQty / item.invoiceQty) * 100)
                      : 0;
                  const isOver = item.remaining < 0;
                  const isComplete = item.remaining === 0 && item.packedQty > 0;

                  return (
                    <div
                      key={item.stock_item}
                      className={`rounded-lg p-3 border ${isOver
                        ? 'border-red-500/60 bg-red-950/40'
                        : isComplete
                          ? 'border-emerald-500/40 bg-emerald-950/30'
                          : 'border-gray-600/60 bg-neutral-900/70'
                        }`}
                    >
                      <div
                        className="text-sm font-semibold text-white/90 mb-2 leading-snug"
                        title={item.stock_item}
                      >
                        {item.stock_item}
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-700 overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${isOver ? 'bg-red-500' : isComplete ? 'bg-emerald-500' : 'bg-sky-500'
                            }`}
                          style={{ width: `${isOver ? 100 : pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-xs text-white/50">
                          {numeral(item.packedQty).format('0,0')} / {numeral(item.invoiceQty).format('0,0')}
                        </span>
                        <span
                          className={`text-sm font-bold tabular-nums ${isOver
                            ? 'text-red-400'
                            : isComplete
                              ? 'text-emerald-400'
                              : 'text-sky-300'
                            }`}
                        >
                          {isOver
                            ? `+${numeral(Math.abs(item.remaining)).format('0,0')}`
                            : numeral(item.remaining).format('0,0')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>

          {/* Right panel — table + actions */}
          <main className="flex-1 min-w-0 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-800 text-white/70 text-xs uppercase tracking-wide">
                    <th className="text-left px-3 py-2 rounded-tl-md border border-gray-600/80">Cartons</th>
                    <th className="text-left px-3 py-2 border border-gray-600/80">Qty / carton</th>
                    <th className="text-left px-3 py-2 border border-gray-600/80">Stock Item</th>
                    <th className="text-left px-3 py-2 border border-gray-600/80">Qty</th>
                    <th className="text-center px-3 py-2 rounded-tr-md border border-gray-600/80 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {packingList.map((row, rowIndex) =>
                    row.stock_items.map((item, itemIndex) => {
                      const rowSpan = row.stock_items.length;
                      const rowTotalQty = computeRowTotalQty(row);
                      const stockItemsSum = row.stock_items.reduce(
                        (sum, stockItem) => sum + Number(stockItem.qty || 0),
                        0
                      );
                      const rowQtyMismatch =
                        rowTotalQty > 0 &&
                        stockItemsSum > 0 &&
                        rowTotalQty !== stockItemsSum;
                      const cartonCellClass = rowQtyMismatch
                        ? 'ring-1 ring-inset ring-yellow-500/50'
                        : '';

                      return (
                        <tr
                          key={`${rowIndex}-${itemIndex}`}
                          className="group hover:bg-white/2 transition-colors"
                        >
                          {itemIndex === 0 && (
                            <>
                              <td
                                rowSpan={rowSpan}
                                className={`px-2 py-1.5 border border-gray-600/80 align-top bg-neutral-800/30 ${cartonCellClass}`}
                              >
                                <input
                                  type="number"
                                  min="0"
                                  name="no_of_carton"
                                  value={row.no_of_carton}
                                  className="w-full text-sm!"
                                  onChange={(e) =>
                                    updateRow(rowIndex, 'no_of_carton', e.target.value)
                                  }
                                />
                              </td>
                              <td
                                rowSpan={rowSpan}
                                className={`px-2 py-1.5 border border-gray-600/80 align-top bg-neutral-800/30 ${cartonCellClass}`}
                              >
                                <input
                                  type="number"
                                  min="0"
                                  name="qty_per_carton"
                                  value={row.qty_per_carton}
                                  className="w-full text-sm!"
                                  onChange={(e) =>
                                    updateRow(rowIndex, 'qty_per_carton', e.target.value)
                                  }
                                />
                              </td>
                            </>
                          )}
                          <td className="px-2 py-1.5 border border-gray-600/80">
                            <select
                              name="stock_item"
                              value={item.stock_item}
                              className="w-full text-sm!"
                              onChange={(e) =>
                                updateStockItem(rowIndex, itemIndex, 'stock_item', e.target.value)
                              }
                            >
                              <option value="">Select Stock Item</option>
                              {getAvailableStockItems(rowIndex, itemIndex).map((stockItem) => (
                                <option key={stockItem.stock_item} value={stockItem.stock_item}>
                                  {stockItem.stock_item}
                                </option>
                              ))}
                              {item.stock_item &&
                                !getAvailableStockItems(rowIndex, itemIndex).some(
                                  (stockItem) => stockItem.stock_item === item.stock_item
                                ) && (
                                  <option value={item.stock_item}>{item.stock_item}</option>
                                )}
                            </select>
                          </td>
                          <td className="px-2 py-1.5 border border-gray-600/80">
                            <input
                              type="number"
                              min="0"
                              name="qty"
                              value={item.qty}
                              className={`w-full text-sm! ${item.stock_item &&
                                (remainingByItem.find((r) => r.stock_item === item.stock_item)?.remaining ?? 0) < 0
                                ? 'text-red-400!'
                                : ''
                                }`}
                              onChange={(e) =>
                                updateStockItem(rowIndex, itemIndex, 'qty', e.target.value)
                              }
                            />
                          </td>
                          {itemIndex === 0 && (
                            <td
                              rowSpan={rowSpan}
                              className="px-2 py-1.5 border border-gray-600/80 align-top text-center"
                            >
                              <div className="flex flex-col gap-1.5 items-center">
                                <button
                                  type="button"
                                  title="Add stock item"
                                  className="w-7 h-7 rounded-md flex items-center justify-center bg-emerald-900/40 text-emerald-400 hover:bg-emerald-800/60 transition-colors"
                                  onClick={() => addStockItem(rowIndex)}
                                >
                                  <i className="bi bi-plus-lg text-sm"></i>
                                </button>
                                <button
                                  type="button"
                                  title="Remove row"
                                  className="w-7 h-7 rounded-md flex items-center justify-center bg-red-900/40 text-red-400 hover:bg-red-800/60 transition-colors"
                                  onClick={() => removeRow(rowIndex)}
                                >
                                  <i className="bi bi-trash text-sm"></i>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="shrink-0 border-t border-gray-700/80 px-4 py-3 bg-neutral-800/40">
              <div className="flex flex-row gap-2 justify-between items-center">
                <button type="button" className="btn btn-secondary flex items-center gap-1.5" onClick={addRow}>
                  <i className="bi bi-plus-lg"></i>
                  Add Row
                </button>
                <span className="flex flex-row gap-2">
                  <button
                    type="button"
                    className="btn btn-primary w-28"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger w-28"
                    onClick={() => setShowPackingList(false)}
                  >
                    Cancel
                  </button>
                </span>
              </div>
              {formMessage && (
                <div
                  className={`text-xs italic text-center mt-2 ${formMessage.type === 'success' ? 'text-green-500' : 'text-red-500'
                    }`}
                >
                  {formMessage.message}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PackingList;
