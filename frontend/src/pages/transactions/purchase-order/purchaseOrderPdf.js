import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment";
import numeral from "numeral";
import {
  addPdfReportTitle,
  drawCompanyLetterhead,
} from "../../../utils/pdfCompanyLetterhead";
import {
  loadPdfCandaraFonts,
  PDF_CANDARA_FAMILY,
  registerPdfCandaraFonts,
  setPdfCandaraFont,
} from "../../../utils/pdfCandaraFont";
import {
  drawPdfCompanyRoundSeal,
  loadPdfCompanyRoundSeal,
  PDF_COMPANY_ROUND_SEAL_SIZE_MM,
} from "../../../utils/pdfCompanyRoundSeal";
import { calcLine, calcOrderTotals, getPoPdfFileName } from "./purchaseOrderUtils";

const BODY_FONT_SIZE = 9;
const TABLE_FONT_SIZE = 8;
const LABEL_FONT_SIZE = 9;

const formatQty = (value) => numeral(value || 0).format("0,0");
const formatAmount = (value) => numeral(value || 0).format("0,0.00");

const drawLabelValue = (doc, label, value, x, y, maxWidth) => {
  const text = value?.trim() ? String(value).trim() : "—";
  setPdfCandaraFont(doc, "bold");
  doc.setFontSize(LABEL_FONT_SIZE);
  doc.text(`${label}`, x, y);
  const labelWidth = doc.getTextWidth(`${label} `);

  setPdfCandaraFont(doc, "normal");
  const lines = doc.splitTextToSize(text, Math.max(10, maxWidth - labelWidth));
  doc.text(lines[0] || "", x + labelWidth, y);
  let nextY = y + 4.2;
  for (let i = 1; i < lines.length; i += 1) {
    doc.text(lines[i], x, nextY);
    nextY += 4.2;
  }
  return nextY;
};

const drawWrappedText = (doc, text, x, y, maxWidth, lineHeight = 4) => {
  if (!text?.trim()) return y;
  setPdfCandaraFont(doc, "normal");
  doc.setFontSize(BODY_FONT_SIZE);
  const lines = doc.splitTextToSize(text.trim(), maxWidth);
  lines.forEach((line) => {
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
};

const ensureSpace = (doc, y, needed, margin) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed <= pageHeight - margin) return y;
  doc.addPage();
  return margin + 8;
};

export async function buildPurchaseOrderPdf({
  order,
  poDisplayNo,
  company,
  vendorAddress,
  vendorDetails,
}) {
  const [fonts, companySeal] = await Promise.all([
    loadPdfCandaraFonts(),
    loadPdfCompanyRoundSeal().catch(() => null),
  ]);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  registerPdfCandaraFonts(doc, fonts);

  const { y: letterheadY, pageWidth, margin } = drawCompanyLetterhead(doc, company);
  let y = addPdfReportTitle(doc, pageWidth, "Purchase Order", letterheadY);

  const poNoLabel = poDisplayNo || order.po_no || "—";
  const contentWidth = pageWidth - margin * 2;
  const leftWidth = Math.round(contentWidth * 0.58 * 10) / 10;
  const rightWidth = contentWidth - leftWidth;
  const leftX = margin;
  const rightX = margin + leftWidth;
  const boxPad = 3;
  const boxTop = y;

  // --- Party / voucher meta boxes (Tally-style) ---
  setPdfCandaraFont(doc, "bold");
  doc.setFontSize(LABEL_FONT_SIZE);
  doc.text("Party :", leftX + boxPad, boxTop + 5);

  setPdfCandaraFont(doc, "bold");
  doc.setFontSize(10);
  const vendorName = order.vendor?.trim() || "—";
  const vendorNameLines = doc.splitTextToSize(vendorName, leftWidth - boxPad * 2);
  let leftY = boxTop + 10;
  doc.text(vendorNameLines, leftX + boxPad, leftY);
  leftY += vendorNameLines.length * 4.5 + 1;

  leftY = drawWrappedText(
    doc,
    vendorAddress,
    leftX + boxPad,
    leftY,
    leftWidth - boxPad * 2,
    4
  );

  const partyExtras = [
    vendorDetails?.gstin ? `GSTIN: ${vendorDetails.gstin}` : "",
    vendorDetails?.pan ? `PAN: ${vendorDetails.pan}` : "",
    vendorDetails?.representative
      ? `Representative: ${vendorDetails.representative}`
      : "",
  ].filter(Boolean);

  partyExtras.forEach((line) => {
    setPdfCandaraFont(doc, "normal");
    doc.setFontSize(BODY_FONT_SIZE);
    const wrapped = doc.splitTextToSize(line, leftWidth - boxPad * 2);
    doc.text(wrapped, leftX + boxPad, leftY);
    leftY += wrapped.length * 4;
  });

  let rightY = boxTop + 5;
  rightY = drawLabelValue(
    doc,
    "No. :",
    poNoLabel,
    rightX + boxPad,
    rightY,
    rightWidth - boxPad * 2
  );
  rightY = drawLabelValue(
    doc,
    "Date :",
    order.po_date ? moment(order.po_date).format("DD-MM-YYYY") : "—",
    rightX + boxPad,
    rightY,
    rightWidth - boxPad * 2
  );
  if (order.vendor_quotation_no?.trim()) {
    rightY = drawLabelValue(
      doc,
      "Quotation No. :",
      order.vendor_quotation_no,
      rightX + boxPad,
      rightY,
      rightWidth - boxPad * 2
    );
  }

  const boxBottom = Math.max(leftY, rightY) + 3;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(leftX, boxTop, contentWidth, boxBottom - boxTop);
  doc.line(rightX, boxTop, rightX, boxBottom);

  y = boxBottom + 4;

  const lines = order.details.filter((line) => line.stock_item?.trim());
  const totals = calcOrderTotals(lines);
  const itemFontSize = TABLE_FONT_SIZE + 0.5;
  const descFontSize = TABLE_FONT_SIZE - 0.5;
  // Fixed numeric/meta columns; Description takes remaining width so table
  // edges match letterhead / party box (contentWidth).
  const colWidths = {
    index: 8,
    hsn: 16,
    qty: 22,
    unit: 12,
    rate: 18,
    disc: 14,
    gst: 14,
    amount: 20,
  };
  const fixedColsWidth = Object.values(colWidths).reduce((sum, w) => sum + w, 0);
  const itemColWidth = contentWidth - fixedColsWidth;
  const ptToMm = 0.352778;
  const lineHeightFactor = 1.15;
  const getLineHeight = (size) => ptToMm * size * lineHeightFactor;

  const getCellPadding = (cell) => {
    const pad = cell.styles.cellPadding;
    if (typeof pad === "number") {
      return { top: pad, right: pad, bottom: pad, left: pad };
    }
    return {
      top: pad?.top ?? 1.5,
      right: pad?.right ?? 1.5,
      bottom: pad?.bottom ?? 1.5,
      left: pad?.left ?? 1.5,
    };
  };

  const getItemColWidth = (cell, column) =>
    cell.width || column?.width || itemColWidth;

  const measureItemContent = (line, maxWidth) => {
    if (!line || maxWidth <= 0) {
      return {
        itemLines: [],
        descLines: [],
        contentHeight: getLineHeight(itemFontSize),
      };
    }

    setPdfCandaraFont(doc, "bold");
    doc.setFontSize(itemFontSize);
    const itemLines = doc.splitTextToSize(line.stock_item || "", maxWidth);

    let descLines = [];
    if (line.description?.trim()) {
      setPdfCandaraFont(doc, "normal");
      doc.setFontSize(descFontSize);
      descLines = doc.splitTextToSize(line.description.trim(), maxWidth);
    }

    const itemHeight = itemLines.length * getLineHeight(itemFontSize);
    const descHeight = descLines.length * getLineHeight(descFontSize);
    const gapHeight = descLines.length ? 0.4 : 0;

    setPdfCandaraFont(doc, "normal");
    doc.setFontSize(TABLE_FONT_SIZE);

    return {
      itemLines,
      descLines,
      contentHeight: itemHeight + gapHeight + descHeight,
    };
  };

  autoTable(doc, {
    startY: y,
    tableWidth: contentWidth,
    head: [["#", "Description of Goods", "HSN", "Qty", "Unit", "Rate", "Disc %", "GST %", "Amount"]],
    body: lines.map((line, index) => {
      const { amount } = calcLine(line);
      return [
        index + 1,
        "",
        line.hsn_code || "",
        formatQty(line.qty),
        line.unit || "",
        formatAmount(line.unit_price),
        line.discount_pct ? `${line.discount_pct}%` : "",
        line.gst ? `${line.gst}%` : "",
        formatAmount(amount),
      ];
    }),
    styles: {
      font: PDF_CANDARA_FAMILY,
      fontSize: TABLE_FONT_SIZE,
      cellPadding: 1.5,
      valign: "middle",
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      font: PDF_CANDARA_FAMILY,
      fontStyle: "bold",
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      halign: "center",
      valign: "middle",
      lineWidth: 0.25,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: colWidths.index, halign: "center" },
      1: { cellWidth: itemColWidth, valign: "top", halign: "left" },
      2: { cellWidth: colWidths.hsn, halign: "center" },
      3: { cellWidth: colWidths.qty, halign: "right" },
      4: { cellWidth: colWidths.unit, halign: "center" },
      5: { cellWidth: colWidths.rate, halign: "right" },
      6: { cellWidth: colWidths.disc, halign: "right" },
      7: { cellWidth: colWidths.gst, halign: "right" },
      8: { cellWidth: colWidths.amount, halign: "right" },
    },
    margin: { left: margin, right: margin },
    theme: "grid",
    didParseCell: (data) => {
      if (data.section !== "body" || data.column.index !== 1) return;

      const line = lines[data.row.index];
      if (!line) return;

      const { left, right, top, bottom } = getCellPadding(data.cell);
      const maxWidth = getItemColWidth(data.cell, data.column) - left - right;
      const { contentHeight } = measureItemContent(line, maxWidth);

      data.cell.text = [""];
      data.cell.styles.minCellHeight = top + contentHeight + bottom;
    },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== 1) return;

      const line = lines[data.row.index];
      if (!line) return;

      const { left, right, top } = getCellPadding(data.cell);
      const maxWidth = getItemColWidth(data.cell, data.column) - left - right;
      const x = data.cell.x + left;
      const { itemLines, descLines } = measureItemContent(line, maxWidth);

      let textY = data.cell.y + top + getLineHeight(itemFontSize) * 0.85;

      setPdfCandaraFont(doc, "bold");
      doc.setFontSize(itemFontSize);
      itemLines.forEach((text) => {
        doc.text(text, x, textY);
        textY += getLineHeight(itemFontSize);
      });

      if (descLines.length) {
        textY += 0.4;
        setPdfCandaraFont(doc, "normal");
        doc.setFontSize(descFontSize);
        descLines.forEach((text) => {
          doc.text(text, x, textY);
          textY += getLineHeight(descFontSize);
        });
      }

      setPdfCandaraFont(doc, "normal");
      doc.setFontSize(TABLE_FONT_SIZE);
    },
  });

  y = doc.lastAutoTable.finalY + 1;

  // Totals box aligned to the right (Tally-style)
  const totalsBoxWidth = 70;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;
  const totalsRows = [
    { label: "Taxable Amount", value: formatAmount(totals.amount) },
    { label: "GST Amount", value: formatAmount(totals.gstValue) },
    { label: "Grand Total", value: formatAmount(totals.total), bold: true },
  ];
  const rowH = 6;
  const totalsBoxH = totalsRows.length * rowH;

  y = ensureSpace(doc, y, totalsBoxH + 28, margin);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(totalsBoxX, y, totalsBoxWidth, totalsBoxH);

  totalsRows.forEach((row, index) => {
    const rowY = y + index * rowH;
    if (index > 0) {
      doc.line(totalsBoxX, rowY, totalsBoxX + totalsBoxWidth, rowY);
    }
    setPdfCandaraFont(doc, row.bold ? "bold" : "normal");
    doc.setFontSize(BODY_FONT_SIZE);
    doc.text(row.label, totalsBoxX + 2, rowY + 4.2);
    doc.text(row.value, totalsBoxX + totalsBoxWidth - 2, rowY + 4.2, {
      align: "right",
    });
  });

  // Qty total hint on the left of totals
  setPdfCandaraFont(doc, "normal");
  doc.setFontSize(BODY_FONT_SIZE);
  doc.text(`Total Qty: ${formatQty(totals.qty)}`, margin, y + 4.2);

  y += totalsBoxH + 6;

  const terms = [
    { label: "Shipping", value: order.shipping },
    { label: "Insurance", value: order.insurance },
    { label: "Payment Terms", value: order.payment_terms },
    { label: "Delivery Terms", value: order.delivery_terms },
  ].filter((term) => term.value?.trim());

  if (terms.length) {
    y = ensureSpace(doc, y, 12 + terms.length * 8, margin);
    setPdfCandaraFont(doc, "bold");
    doc.setFontSize(LABEL_FONT_SIZE);
    doc.text("Terms & Conditions", margin, y);
    y += 5;

    terms.forEach((term) => {
      y = ensureSpace(doc, y, 10, margin);
      setPdfCandaraFont(doc, "bold");
      doc.setFontSize(BODY_FONT_SIZE);
      doc.text(`${term.label}:`, margin, y);
      y += 4;
      y = drawWrappedText(doc, term.value, margin, y, contentWidth, 4) + 2;
    });
  }

  const signWidth = 55;
  const signX = pageWidth - margin - signWidth;
  const signCenterX = signX + signWidth / 2;
  const sealSize = PDF_COMPANY_ROUND_SEAL_SIZE_MM;
  const signatureBlockHeight = (companySeal ? sealSize + 4 : 0) + 14;

  y = ensureSpace(doc, y, signatureBlockHeight, margin);
  y += 6;

  if (companySeal) {
    y = drawPdfCompanyRoundSeal(doc, companySeal, signCenterX, y, sealSize);
    y += 2;
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(signX, y, signX + signWidth, y);
  setPdfCandaraFont(doc, "bold");
  doc.setFontSize(BODY_FONT_SIZE);
  doc.text("Authorised Signatory", signCenterX, y + 5, {
    align: "center",
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    const footerY = doc.internal.pageSize.getHeight() - 8;
    setPdfCandaraFont(doc, "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth / 2, footerY, {
      align: "center",
    });
    doc.setTextColor(0, 0, 0);
  }

  return {
    doc,
    fileName: getPoPdfFileName(poNoLabel),
  };
}

export async function createPurchaseOrderPdfBlob(params) {
  const { doc, fileName } = await buildPurchaseOrderPdf(params);
  return {
    blob: doc.output("blob"),
    fileName,
  };
}

export async function generatePurchaseOrderPdf(params) {
  const { doc, fileName } = await buildPurchaseOrderPdf(params);
  doc.save(fileName);
}
