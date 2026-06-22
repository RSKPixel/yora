import React, { useContext, useEffect, useMemo, useState } from "react";
import numeral from "numeral";
import AuthContext from "../../templates/AuthContext";
import { calcLine, calcOrderTotals, emptyLine, INSURANCE_OPTIONS, SHIPPING_OPTIONS, VENDOR_PRIMARY_GROUP, validateOrder } from "./purchaseOrderUtils";
import StockItemAutocomplete from "./StockItemAutocomplete";
import AutocompleteField from "./AutocompleteField";
import { generatePurchaseOrderPdf } from "./purchaseOrderPdf";

const Field = ({ label, icon, children }) => (
  <div className="space-y-2">
    <label className="page-form-label">{label}</label>
    <div className="page-field-wrap">
      <span className="page-field-icon" aria-hidden="true">
        <i className={`bi ${icon}`}></i>
      </span>
      {children}
    </div>
  </div>
);

const numInput = (value, onChange, { min, max, step = "0.01" } = {}) => (
  <input
    type="number"
    className="page-field-input page-field-input-number w-full min-w-0"
    value={value}
    min={min}
    max={max}
    step={step}
    onChange={onChange}
  />
);

const formatVendorAddress = (vendor) => {
  const lines = [
    vendor.address_1,
    vendor.address_2,
    vendor.address_3,
    vendor.address_4,
  ].filter((line) => line?.trim());

  if (!lines.length && !vendor.pincode?.trim()) return "";

  const address = lines.join(", ");
  const pincode = vendor.pincode?.trim();
  return pincode ? `${address}${address ? " - " : ""}${pincode}` : address;
};

const VendorDetail = ({ label, value }) => {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="page-table-detail-label">{label}</p>
      <p className="text-white/85 normal-case tracking-normal mt-0.5">{value}</p>
    </div>
  );
};

const PurchaseOrderForm = ({
  order,
  onOrderChange,
  formMessage,
  onBack,
  onSave,
  isEditing,
}) => {
  const { api, authFetch, company } = useContext(AuthContext);
  const [stockItems, setStockItems] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [pdfMessage, setPdfMessage] = useState(null);
  const totals = calcOrderTotals(order.details);

  useEffect(() => {
    authFetch(`${api}/masters/stock-items`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setStockItems(data.data || []);
        }
      });

    const ledgerFd = new FormData();
    ledgerFd.append("primary_group", VENDOR_PRIMARY_GROUP);
    authFetch(`${api}/masters/ledger`, { method: "POST", body: ledgerFd })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setLedgers(data.data || []);
        }
      });
  }, [api, authFetch]);

  const vendorDetails = useMemo(() => {
    const ledger = ledgers.find((item) => item.name === order.vendor);
    return {
      address_1: order.vendor_address_1 || ledger?.address_1 || "",
      address_2: order.vendor_address_2 || ledger?.address_2 || "",
      address_3: order.vendor_address_3 || ledger?.address_3 || "",
      address_4: order.vendor_address_4 || ledger?.address_4 || "",
      pincode: order.vendor_pincode || ledger?.pincode || "",
      gstin: order.vendor_gstin || ledger?.gstin || "",
      pan: order.vendor_pan || ledger?.pan || "",
      representative: order.vendor_representative || ledger?.representative || "",
    };
  }, [order, ledgers]);

  const vendorAddress = formatVendorAddress(vendorDetails);

  const updateHeader = (field, value) => {
    onOrderChange({ ...order, [field]: value });
  };

  const updateLine = (index, field, value) => {
    const details = order.details.map((line, i) =>
      i === index ? { ...line, [field]: value } : line
    );
    onOrderChange({ ...order, details });
  };

  const handleVendorSelect = (vendorName, ledger) => {
    if (!vendorName) {
      onOrderChange({
        ...order,
        vendor: "",
        vendor_address_1: "",
        vendor_address_2: "",
        vendor_address_3: "",
        vendor_address_4: "",
        vendor_pincode: "",
        vendor_gstin: "",
        vendor_pan: "",
        vendor_representative: "",
      });
      return;
    }
    onOrderChange({
      ...order,
      vendor: vendorName,
      vendor_address_1: ledger?.address_1 ?? "",
      vendor_address_2: ledger?.address_2 ?? "",
      vendor_address_3: ledger?.address_3 ?? "",
      vendor_address_4: ledger?.address_4 ?? "",
      vendor_pincode: ledger?.pincode ?? "",
      vendor_gstin: ledger?.gstin ?? "",
      vendor_pan: ledger?.pan ?? "",
      vendor_representative: ledger?.representative ?? "",
    });
  };

  const handleStockItemSelect = (index, stockItemName) => {
    const master = stockItems.find((item) => item.stock_item === stockItemName);
    const details = order.details.map((line, i) => {
      if (i !== index) return line;
      if (!stockItemName) {
        return { ...line, stock_item: "", parent: "", unit: "", hsn_code: "", gst: "" };
      }
      return {
        ...line,
        stock_item: stockItemName,
        parent: master?.parent ?? "",
        unit: master?.unit ?? "",
        hsn_code: master?.hsn_code ?? "",
        gst: master?.gst != null ? String(master.gst) : "",
      };
    });
    onOrderChange({ ...order, details });
  };

  const addLineAfter = (index) => {
    const details = [...order.details];
    details.splice(index + 1, 0, emptyLine());
    onOrderChange({ ...order, details });
  };

  const removeLine = (index) => {
    if (order.details.length === 1) return;
    onOrderChange({
      ...order,
      details: order.details.filter((_, i) => i !== index),
    });
  };

  const handleSavePdf = () => {
    setPdfMessage(null);
    const errors = validateOrder(order);
    if (errors.length > 0) {
      setPdfMessage({ type: "error", message: errors });
      return;
    }

    try {
      generatePurchaseOrderPdf({
        order,
        company,
        vendorAddress,
        vendorDetails,
      });
      setPdfMessage({ type: "success", message: "Purchase order PDF downloaded." });
    } catch (err) {
      console.error("PDF generation failed:", err);
      setPdfMessage({
        type: "error",
        message: err?.message || "Failed to generate PDF. Please try again.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 min-h-0">
      <section className="rounded-lg border border-gray-700/80 bg-neutral-800/50 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="page-form-label">Purchase Order No</label>
              <p className="page-field-input flex items-center font-semibold text-sky-300/90 min-h-[42px]">
                {order.po_no || "—"}
              </p>
            </div>
            <Field label="Vendor" icon="bi-building">
              <AutocompleteField
                value={order.vendor}
                items={ledgers}
                onSelect={handleVendorSelect}
                getLabel={(ledger) => ledger.name}
                getKey={(ledger) => ledger.name}
                getMeta={(ledger) => ledger.gstin}
                placeholder="Search vendor"
                className="w-full"
              />
            </Field>
            <Field label="Purchase Order Date" icon="bi-calendar3">
              <input
                type="date"
                className="page-field-input"
                value={order.po_date}
                onChange={(e) => updateHeader("po_date", e.target.value)}
              />
            </Field>
          </div>
          {order.vendor && (
            <div className="mt-4 pt-4 border-t border-gray-700/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              {vendorAddress && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="page-table-detail-label">Address</p>
                  <p className="text-white/85 normal-case tracking-normal mt-0.5">
                    {vendorAddress}
                  </p>
                </div>
              )}
              <VendorDetail label="GSTIN" value={vendorDetails.gstin} />
              <VendorDetail label="PAN" value={vendorDetails.pan} />
              <VendorDetail label="Representative" value={vendorDetails.representative} />
            </div>
          )}
        </section>

        <div className="page-table-wrap overflow-x-auto">
          <table className="page-table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="text-end w-40 min-w-40">Qty</th>
                <th className="text-end w-44 min-w-44">Unit Price</th>
                <th className="text-end w-24">GST %</th>
                <th className="text-end w-28">GST Value</th>
                <th className="text-end w-28">Total</th>
                <th className="text-center w-20"></th>
              </tr>
            </thead>
            <tbody>
              {order.details.map((line, index) => {
                const { gstValue, total } = calcLine(line);
                return (
                  <tr key={index}>
                    <td className={`min-w-48 ${line.show_description ? "align-top" : "align-middle"}`}>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1">
                          <div className="flex-1 min-w-0">
                            <StockItemAutocomplete
                              value={line.stock_item}
                              stockItems={stockItems}
                              onSelect={(stockItemName) =>
                                handleStockItemSelect(index, stockItemName)
                              }
                            />
                          </div>
                          {!line.show_description && (
                            <button
                              type="button"
                              className="page-icon-btn-xs page-icon-btn-xs-sky shrink-0"
                              title="Add description"
                              onClick={() => updateLine(index, "show_description", true)}
                            >
                              <i className="bi bi-plus"></i>
                            </button>
                          )}
                        </div>
                        {line.show_description && (
                          <div>
                            <label className="page-table-detail-label">Description</label>
                            <textarea
                              className="page-field-textarea w-full"
                              rows={2}
                              value={line.description || ""}
                              onChange={(e) => updateLine(index, "description", e.target.value)}
                              placeholder="Item description"
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="w-40 min-w-40 align-top">
                      {numInput(line.qty, (e) => updateLine(index, "qty", e.target.value), {
                        min: "0",
                        step: "1",
                      })}
                    </td>
                    <td className="w-44 min-w-44 align-top">
                      {numInput(
                        line.unit_price,
                        (e) => updateLine(index, "unit_price", e.target.value),
                        { min: "0" }
                      )}
                    </td>
                    <td className="align-top">
                      {numInput(line.gst, (e) => updateLine(index, "gst", e.target.value), {
                        min: "0",
                      })}
                    </td>
                    <td className="text-end tabular-nums text-white/95 align-middle">
                      {numeral(gstValue).format("0,0.00")}
                    </td>
                    <td className="text-end tabular-nums font-medium text-white align-middle">
                      {numeral(total).format("0,0.00")}
                    </td>
                    <td className="align-top">
                      <div className="flex justify-center gap-1">
                        {index === order.details.length - 1 && (
                          <button
                            type="button"
                            className="page-icon-btn page-icon-btn-sky"
                            title="Add line"
                            onClick={() => addLineAfter(index)}
                          >
                            <i className="bi bi-plus-lg"></i>
                          </button>
                        )}
                        <button
                          type="button"
                          className="page-icon-btn text-red-400/80 hover:text-red-300"
                          title="Remove line"
                          onClick={() => removeLine(index)}
                          disabled={order.details.length === 1}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="text-white/90">Total</td>
                <td className="text-end tabular-nums text-white/90 w-40 min-w-40">
                  {numeral(totals.qty).format("0,0.##")}
                </td>
                <td className="text-end tabular-nums text-white/90 w-44 min-w-44">
                  {numeral(totals.amount).format("0,0.00")}
                </td>
                <td></td>
                <td className="text-end tabular-nums text-white/90">
                  {numeral(totals.gstValue).format("0,0.00")}
                </td>
                <td className="text-end tabular-nums text-sky-300/90">
                  {numeral(totals.total).format("0,0.00")}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          <div className="page-po-extra-fields flex flex-wrap gap-4 px-3 py-3 border-t border-gray-700/40">
            <div className="w-44">
              <label className="page-table-detail-label">Shipping</label>
              <select
                className="page-field-input w-full"
                value={order.shipping || ""}
                onChange={(e) => updateHeader("shipping", e.target.value)}
              >
                <option value="">Select</option>
                {SHIPPING_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-44">
              <label className="page-table-detail-label">Insurance</label>
              <select
                className="page-field-input w-full"
                value={order.insurance || ""}
                onChange={(e) => updateHeader("insurance", e.target.value)}
              >
                <option value="">Select</option>
                {INSURANCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

      {(pdfMessage || formMessage) && (
        <div
          className={`flex items-start gap-2 text-xs normal-case tracking-normal ${
            (pdfMessage || formMessage).type === "success" ? "text-emerald-400" : "text-red-400"
          }`}
        >
          <i
            className={`bi mt-0.5 shrink-0 ${
              (pdfMessage || formMessage).type === "success"
                ? "bi-check-circle"
                : "bi-exclamation-circle"
            }`}
          ></i>
          {Array.isArray((pdfMessage || formMessage).message) ? (
            <ul className="list-disc ps-4 space-y-0.5">
              {(pdfMessage || formMessage).message.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          ) : (
            <span>{(pdfMessage || formMessage).message}</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="btn btn-secondary flex items-center gap-1.5 normal-case tracking-normal"
          onClick={onBack}
        >
          <i className="bi bi-arrow-left"></i>
          Back to list
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-secondary flex items-center gap-1.5 normal-case tracking-normal"
            onClick={handleSavePdf}
          >
            <i className="bi bi-file-earmark-pdf"></i>
            Save as PDF
          </button>
          <button
            type="button"
            className="btn btn-primary flex items-center gap-1.5"
            onClick={onSave}
          >
            <i className="bi bi-check-lg"></i>
            {isEditing ? "Update" : "Save"} Purchase Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderForm;
