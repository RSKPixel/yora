import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment";
import numeral from "numeral";
import { formatDisplayDateRange } from "../../../utils/formatDisplayDate";
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

const BODY_FONT_SIZE = 9;
const REPORT_TABLE_FONT_SIZE = 10;

const formatQty = (value) => numeral(value || 0).format("0,0.##");
const formatPrice = (value) =>
  value == null || value === "" ? "—" : numeral(value).format("0,0.00");

const addFilterLine = (doc, label, value, x, y, maxWidth, lineHeight = 4.5) => {
  const text = value?.trim();
  if (!text) return y;

  setPdfCandaraFont(doc, "bold");
  doc.setFontSize(BODY_FONT_SIZE);
  doc.text(`${label}:`, x, y);

  setPdfCandaraFont(doc, "normal");
  const lines = doc.splitTextToSize(text, maxWidth - 28);
  doc.text(lines, x + 28, y);
  return y + Math.max(lineHeight, lines.length * lineHeight);
};

const numericColumnIndexes = new Set([1, 2, 3]);

export const getPurchaseReportPdfFileName = (vendor) => {
  const slug = (vendor || "report").replace(/[^\w.-]+/g, "_").slice(0, 40);
  return `purchase-report-${slug}-${moment().format("YYYYMMDD-HHmm")}.pdf`;
};

export async function buildPurchaseReportPdf({
  company,
  filters,
  report,
  rows,
}) {
  const fonts = await loadPdfCandaraFonts();
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  registerPdfCandaraFonts(doc, fonts);

  const { y: letterheadY, pageWidth, margin } = drawCompanyLetterhead(doc, company);
  let y = addPdfReportTitle(doc, pageWidth, "Purchase Report", letterheadY);

  y += 4;
  const filterWidth = pageWidth - margin * 2;
  y = addFilterLine(
    doc,
    "Vendor",
    report?.vendor || filters?.vendor || "—",
    margin,
    y,
    filterWidth
  );
  y = addFilterLine(
    doc,
    "Period",
    formatDisplayDateRange(filters?.date_from, filters?.date_to) || "—",
    margin,
    y,
    filterWidth
  );
  y = addFilterLine(
    doc,
    "Group",
    filters?.group?.trim() || "All groups",
    margin,
    y,
    filterWidth
  );

  if (report?.summary) {
    y = addFilterLine(
      doc,
      "Summary",
      `Items: ${formatQty(report.summary.row_count)}`,
      margin,
      y,
      filterWidth
    );
  }

  y += 2;
  const totals = report?.totals;

  autoTable(doc, {
    startY: y,
    head: [["Stock Item", "Carton", "Qty", "List Price"]],
    body: rows.map((row) => [
      row.stock_item || "",
      formatQty(row.carton),
      formatQty(row.qty),
      formatPrice(row.list_price),
    ]),
    foot: totals
      ? [["Totals", formatQty(totals.carton), formatQty(totals.qty), "—"]]
      : undefined,
    styles: {
      font: PDF_CANDARA_FAMILY,
      fontSize: REPORT_TABLE_FONT_SIZE,
      cellPadding: 2.5,
      valign: "middle",
    },
    headStyles: {
      font: PDF_CANDARA_FAMILY,
      fontStyle: "bold",
      fillColor: [30, 41, 59],
      textColor: 255,
    },
    footStyles: {
      font: PDF_CANDARA_FAMILY,
      fontStyle: "bold",
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
    didParseCell: (data) => {
      if (numericColumnIndexes.has(data.column.index)) {
        data.cell.styles.halign = "right";
      }
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const footerY = doc.internal.pageSize.getHeight() - 8;
      setPdfCandaraFont(doc, "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        footerY,
        { align: "center" }
      );
      doc.setTextColor(0, 0, 0);
    },
  });

  return {
    doc,
    fileName: getPurchaseReportPdfFileName(report?.vendor || filters?.vendor),
  };
}

export async function createPurchaseReportPdfBlob(params) {
  const { doc, fileName } = await buildPurchaseReportPdf(params);
  return {
    blob: doc.output("blob"),
    fileName,
  };
}

export async function generatePurchaseReportPdf(params) {
  const { doc, fileName } = await buildPurchaseReportPdf(params);
  doc.save(fileName);
}
