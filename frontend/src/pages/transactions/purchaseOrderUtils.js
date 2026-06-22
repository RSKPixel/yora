export const emptyLine = () => ({
  stock_item: "",
  parent: "",
  unit: "",
  hsn_code: "",
  qty: "",
  unit_price: "",
  gst: "",
  description: "",
  show_description: false,
});

export const SHIPPING_OPTIONS = ["To Pay", "Paid"];
export const INSURANCE_OPTIONS = ["Not Applicable", "Insured"];
export const VENDOR_PRIMARY_GROUP = "Sundry Creditors";

export const emptyOrder = () => ({
  po_no: "",
  vendor: "",
  vendor_address_1: "",
  vendor_address_2: "",
  vendor_address_3: "",
  vendor_address_4: "",
  vendor_pincode: "",
  vendor_gstin: "",
  vendor_pan: "",
  vendor_representative: "",
  po_date: new Date().toISOString().slice(0, 10),
  shipping: "",
  insurance: "",
  details: [emptyLine()],
});

export const calcLine = (line) => {
  const qty = parseFloat(line.qty) || 0;
  const unitPrice = parseFloat(line.unit_price) || 0;
  const gstPct = parseFloat(line.gst) || 0;
  const amount = qty * unitPrice;
  const gstValue = amount * (gstPct / 100);
  const total = amount + gstValue;

  return { amount, gstValue, total };
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
    { qty: 0, amount: 0, gstValue: 0, total: 0 }
  );

export const validateOrder = (order) => {
  const errors = [];

  if (!order.vendor?.trim()) {
    errors.push("Vendor is required.");
  }
  if (!order.po_date) {
    errors.push("PO date is required.");
  }

  const validLines = order.details.filter(
    (line) => line.stock_item?.trim() || line.qty || line.unit_price || line.gst
  );

  if (validLines.length === 0) {
    errors.push("Add at least one line item.");
  }

  validLines.forEach((line, index) => {
    const row = index + 1;
    if (!line.stock_item?.trim()) {
      errors.push(`Line ${row}: item name is required.`);
    }
    if (!(parseFloat(line.qty) > 0)) {
      errors.push(`Line ${row}: quantity must be greater than zero.`);
    }
    if (!(parseFloat(line.unit_price) >= 0)) {
      errors.push(`Line ${row}: unit price is required.`);
    }
    if (parseFloat(line.gst) < 0) {
      errors.push(`Line ${row}: GST cannot be negative.`);
    }
  });

  return errors;
};
