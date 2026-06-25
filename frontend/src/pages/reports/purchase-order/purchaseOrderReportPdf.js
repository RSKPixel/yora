import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment";
import numeral from "numeral";

const joinParts = (parts, separator = ", ") =>
  parts.filter((part) => part?.trim()).join(separator);

const formatQty = (value) => numeral(value || 0).format("0,0.##");
const formatCount = (value) => numeral(value || 0).format("0,0");

const formatFilterDate = (value) =>
  value ? moment(value).format("DD-MM-YYYY") : "";

const formatDateRange = (from, to) => {
  const start = formatFilterDate(from);
  const end = formatFilterDate(to);
  if (start && end) return `${start} to ${end}`;
  if (start) return `from ${start}`;
  if (end) return `up to ${end}`;
  return "All";
};

const addCenteredLine = (doc, pageWidth, text, y, { fontSize = 9, fontStyle = "normal", lineHeight = 5 } = {}) => {
  if (!text?.trim()) return y;
  doc.setFont("helvetica", fontStyle);
  doc.setFontSize(fontSize);
  doc.text(text, pageWidth / 2, y, { align: "center" });
  return y + lineHeight;
};

const addFilterLine = (doc, label, value, x, y, maxWidth, lineHeight = 4.5) => {
  const text = value?.trim();
  if (!text) return y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`${label}:`, x, y);

  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(text, maxWidth - 28);
  doc.text(lines, x + 28, y);
  return y + Math.max(lineHeight, lines.length * lineHeight);
};

export const getPoReportPdfFileName = (vendor) => {
  const slug = (vendor || "report").replace(/[^\w.-]+/g, "_").slice(0, 40);
  return `po-report-${slug}-${moment().format("YYYYMMDD-HHmm")}.pdf`;
};

export const generatePurchaseOrderReportPdf = ({
  company,
  filters,
  report,
  rows,
}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  y = addCenteredLine(doc, pageWidth, company?.company_name || "Company", y, {
    fontSize: 14,
    fontStyle: "bold",
    lineHeight: 8,
  });

  doc.setFont("helvetica", "normal");
  y = addCenteredLine(doc, pageWidth, joinParts([company?.address, company?.area]), y);
  const cityState = joinParts([company?.city, company?.state]);
  const pincode = company?.pincode?.trim();
  const cityLine = pincode
    ? `${cityState}${cityState ? " - " : ""}${pincode}`
    : cityState;
  y = addCenteredLine(doc, pageWidth, cityLine, y);

  const contactLine = joinParts(
    [
      company?.phone ? `Phone: ${company.phone}` : "",
      company?.email ? `Email: ${company.email}` : "",
    ],
    "    "
  );
  y = addCenteredLine(doc, pageWidth, contactLine, y, { lineHeight: 8 });

  y += 4;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  y = addCenteredLine(doc, pageWidth, "PURCHASE ORDER REPORT", y, {
    fontSize: 16,
    fontStyle: "bold",
    lineHeight: 10,
  });
  y = addCenteredLine(doc, pageWidth, `Generated: ${moment().format("DD-MM-YYYY HH:mm")}`, y, {
    fontSize: 9,
    lineHeight: 8,
  });

  y += 4;
  const filterWidth = pageWidth - margin * 2;
  y = addFilterLine(doc, "Vendor", report?.vendor || filters?.vendor || "—", margin, y, filterWidth);
  y = addFilterLine(
    doc,
    "PO No",
    filters?.po_no?.trim() || "All purchase orders",
    margin,
    y,
    filterWidth
  );
  y = addFilterLine(
    doc,
    "PO Date",
    formatDateRange(filters?.po_date_from, filters?.po_date_to),
    margin,
    y,
    filterWidth
  );
  y = addFilterLine(
    doc,
    "Purchase Date",
    filters?.purchase_date_from || filters?.purchase_date_to
      ? formatDateRange(filters.purchase_date_from, filters.purchase_date_to)
      : "From earliest PO date for each item",
    margin,
    y,
    filterWidth
  );
  y = addFilterLine(
    doc,
    "Shortage filter",
    filters?.exclude_shortage_upto_5 || report?.summary?.exclude_shortage_upto_5
      ? "Show only items with shortage above 5%"
      : "Show all items",
    margin,
    y,
    filterWidth
  );

  if (report?.summary) {
    y = addFilterLine(
      doc,
      "Summary",
      `POs: ${formatCount(report.summary.po_count)}    Items: ${formatCount(report.summary.item_count)}`,
      margin,
      y,
      filterWidth
    );
  }

  const poReferences = report?.po_references || [];
  if (poReferences.length > 0) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Purchase Order References", margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["PO No", "PO Date", "Vendor Quotation No"]],
      body: poReferences.map((po) => [
        po.po_no || "",
        formatFilterDate(po.po_date),
        po.vendor_quotation_no?.trim() || "—",
      ]),
      styles: { fontSize: 8, cellPadding: 2, valign: "middle" },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable.finalY + 6;
  } else {
    y += 4;
  }

  const totals = report?.totals;
  autoTable(doc, {
    startY: y,
    head: [["Item", "Unit", "No. of PO", "PO Qty", "Received", "Excess", "Shortage"]],
    body: rows.map((row) => [
      row.stock_item || "",
      row.unit || "",
      formatCount(row.no_of_po),
      formatQty(row.po_qty),
      formatQty(row.received_qty),
      formatQty(row.excess),
      formatQty(row.shortage),
    ]),
    foot: totals
      ? [
          [
            "Totals",
            "",
            "—",
            formatQty(totals.po_qty),
            formatQty(totals.received_qty),
            formatQty(totals.excess),
            formatQty(totals.shortage),
          ],
        ]
      : undefined,
    styles: { fontSize: 8, cellPadding: 2, valign: "middle" },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  doc.save(getPoReportPdfFileName(report?.vendor || filters?.vendor));
};
