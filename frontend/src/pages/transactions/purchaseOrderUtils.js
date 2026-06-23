export const emptyLine = () => ({
  stock_item: "",
  parent: "",
  unit: "",
  hsn_code: "",
  qty: "",
  unit_price: "",
  discount_pct: "",
  gst: "",
  description: "",
  show_description: false,
});

export const VENDOR_PRIMARY_GROUP = "Sundry Creditors";

export const PO_STATUS_OPEN = "Open";
export const PO_STATUS_PARTIAL_COMPLETE = "Partial Complete";
export const PO_STATUS_SUPPLY_COMPLETE = "Supply Complete";
export const PO_STATUS_DISPUTED = "Disputed";
export const PO_STATUS_ON_HOLD = "On Hold";
export const PO_STATUS_CANCELLED = "Cancelled";

export const PO_STATUS_OPTIONS = [
  PO_STATUS_OPEN,
  PO_STATUS_PARTIAL_COMPLETE,
  PO_STATUS_SUPPLY_COMPLETE,
  PO_STATUS_DISPUTED,
  PO_STATUS_ON_HOLD,
  PO_STATUS_CANCELLED,
];

export const DEFAULT_PO_STATUS = PO_STATUS_OPEN;

export const emptyOrder = () => ({
  po_no: "",
  vendor: "",
  po_date: new Date().toISOString().slice(0, 10),
  status: DEFAULT_PO_STATUS,
  vendor_quotation_no: "",
  shipping: "",
  insurance: "",
  payment_terms: "",
  delivery_terms: "",
  details: [emptyLine()],
});

const normalizeLine = ({ show_description, ...line }) => line;

export const normalizeOrderSnapshot = (order) => {
  const activeDetails = order.details
    .filter(
      (line) =>
        line.stock_item?.trim() ||
        line.qty ||
        line.unit_price ||
        line.discount_pct ||
        line.gst ||
        line.description?.trim(),
    )
    .map(normalizeLine);

  return {
    po_date: order.po_date || "",
    vendor: order.vendor?.trim() || "",
    status: order.status || DEFAULT_PO_STATUS,
    vendor_quotation_no: order.vendor_quotation_no?.trim() || "",
    shipping: order.shipping?.trim() || "",
    insurance: order.insurance?.trim() || "",
    payment_terms: order.payment_terms?.trim() || "",
    delivery_terms: order.delivery_terms?.trim() || "",
    details: activeDetails,
  };
};

export const isOrderDirty = (current, snapshot) =>
  JSON.stringify(normalizeOrderSnapshot(current)) !== JSON.stringify(snapshot);

export const getDisplayPoNo = ({ isSaved, poNo, isDirty }) => {
  if (!isSaved) return "Draft";
  if (isDirty && poNo) return `${poNo} (revised)`;
  return poNo || "—";
};

export const getPoPdfFileName = (displayPoNo) => {
  if (!displayPoNo || displayPoNo === "—") return "purchase-order.pdf";
  if (displayPoNo === "Draft") return "purchase-order-draft.pdf";
  return `${displayPoNo.replace(/\s+\(revised\)$/i, "-revised")}.pdf`;
};

export const calcLine = (line) => {
  const qty = parseFloat(line.qty) || 0;
  const unitPrice = parseFloat(line.unit_price) || 0;
  const discountPct = Math.min(
    Math.max(parseFloat(line.discount_pct) || 0, 0),
    100,
  );
  const gstPct = parseFloat(line.gst) || 0;
  const discountedUnitPrice = unitPrice * (1 - discountPct / 100);
  const amount = qty * discountedUnitPrice;
  const gstValue = amount * (gstPct / 100);
  const total = amount + gstValue;

  return { amount, gstValue, total, discountedUnitPrice };
};

export const calcOrderTotals = (details) =>
  details.reduce(
    (acc, line) => {
      const { amount, gstValue, total } = calcLine(line);
      acc.qty += parseFloat(line.qty) || 0;
      acc.amount += amount;
      acc.gstValue += gstValue;
      acc.total += total;
      return acc;
    },
    { qty: 0, amount: 0, gstValue: 0, total: 0 },
  );

const isActiveLine = (line) =>
  Boolean(line.stock_item?.trim() || String(line.qty ?? "").trim());

export const getOrderLinesForSave = (details) =>
  details
    .filter((line) => line.stock_item?.trim() && parseFloat(line.qty) > 0)
    .map(normalizeLine);

export const buildPurchaseOrderFormData = (
  order,
  { includePoNo = false } = {},
) => {
  const fd = new FormData();
  if (includePoNo && order.po_no) {
    fd.append("po_no", order.po_no);
  }
  fd.append("po_date", order.po_date);
  fd.append("vendor", order.vendor);
  fd.append("status", order.status || DEFAULT_PO_STATUS);
  fd.append("vendor_quotation_no", order.vendor_quotation_no || "");
  fd.append("shipping", order.shipping || "");
  fd.append("insurance", order.insurance || "");
  fd.append("payment_terms", order.payment_terms || "");
  fd.append("delivery_terms", order.delivery_terms || "");
  fd.append("details", JSON.stringify(getOrderLinesForSave(order.details)));
  return fd;
};

export const validateOrder = (order) => {
  const errors = [];

  if (!order.vendor?.trim()) {
    errors.push("Vendor is required.");
  }
  if (!order.po_date) {
    errors.push("Purchase order date is required.");
  }
  if (!order.status?.trim() || !PO_STATUS_OPTIONS.includes(order.status)) {
    errors.push("Status is required.");
  }

  const activeLines = order.details.filter(isActiveLine);

  if (activeLines.length === 0) {
    errors.push("Add at least one line item with quantity.");
  }

  activeLines.forEach((line, index) => {
    const row = index + 1;
    if (!line.stock_item?.trim()) {
      errors.push(`Line ${row}: item is required.`);
    }
    if (!(parseFloat(line.qty) > 0)) {
      errors.push(`Line ${row}: quantity must be greater than zero.`);
    }
    const discountPct = parseFloat(line.discount_pct);
    if (line.discount_pct !== "" && line.discount_pct != null) {
      if (
        !Number.isFinite(discountPct) ||
        discountPct < 0 ||
        discountPct > 100
      ) {
        errors.push(`Line ${row}: discount must be between 0 and 100.`);
      }
    }
  });

  return errors;
};
