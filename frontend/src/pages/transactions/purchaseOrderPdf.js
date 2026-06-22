import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment";
import numeral from "numeral";
import { calcLine, calcOrderTotals } from "./purchaseOrderUtils";

const joinParts = (parts, separator = ", ") =>
  parts.filter((part) => part?.trim()).join(separator);

const addCenteredLine = (doc, pageWidth, text, y, { fontSize = 9, fontStyle = "normal", lineHeight = 5 } = {}) => {
  if (!text?.trim()) return y;
  doc.setFont("helvetica", fontStyle);
  doc.setFontSize(fontSize);
  doc.text(text, pageWidth / 2, y, { align: "center" });
  return y + lineHeight;
};

const addLeftLines = (doc, lines, x, startY, lineHeight = 5) => {
  let y = startY;
  lines.filter(Boolean).forEach((line) => {
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
};

export const generatePurchaseOrderPdf = ({ order, company, vendorAddress, vendorDetails }) => {
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

  y = addCenteredLine(doc, pageWidth, "PURCHASE ORDER", y, {
    fontSize: 16,
    fontStyle: "bold",
    lineHeight: 10,
  });
  y = addCenteredLine(doc, pageWidth, `No: ${order.po_no || "—"}`, y, { fontSize: 10 });
  y = addCenteredLine(doc, pageWidth, `Date: ${order.po_date ? moment(order.po_date).format("DD-MM-YYYY") : "—"}`, y, {
    fontSize: 10,
    lineHeight: 8,
  });

  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Vendor", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(order.vendor || "—", margin, y);
  y += 5;

  const vendorLines = [
    vendorAddress,
    vendorDetails?.gstin ? `GSTIN: ${vendorDetails.gstin}` : "",
    vendorDetails?.pan ? `PAN: ${vendorDetails.pan}` : "",
    vendorDetails?.representative ? `Representative: ${vendorDetails.representative}` : "",
  ];
  y = addLeftLines(doc, vendorLines, margin, y, 4.5);

  y += 4;

  const lines = order.details.filter((line) => line.stock_item?.trim());
  const totals = calcOrderTotals(lines);
  const fontSize = 8;
  const itemFontSize = fontSize + 1;
  const descFontSize = fontSize - 1;
  const itemColWidth = 52;
  const ptToMm = 0.352778;
  const lineHeightFactor = 1.15;

  const getLineHeight = (size) => ptToMm * size * lineHeightFactor;

  const getCellPadding = (cell) => {
    const pad = cell.styles.cellPadding;
    if (typeof pad === "number") {
      return { top: pad, right: pad, bottom: pad, left: pad };
    }
    return {
      top: pad?.top ?? 2,
      right: pad?.right ?? 2,
      bottom: pad?.bottom ?? 2,
      left: pad?.left ?? 2,
    };
  };

  const getItemColWidth = (cell, column) =>
    cell.width || column?.width || itemColWidth;

  const measureItemContent = (line, maxWidth) => {
    if (!line || maxWidth <= 0) {
      return { itemLines: [], descLines: [], contentHeight: getLineHeight(itemFontSize) };
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(itemFontSize);
    const itemLines = doc.splitTextToSize(line.stock_item || "", maxWidth);

    let descLines = [];
    if (line.description?.trim()) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(descFontSize);
      descLines = doc.splitTextToSize(line.description.trim(), maxWidth);
    }

    const itemHeight = itemLines.length * getLineHeight(itemFontSize);
    const descHeight = descLines.length * getLineHeight(descFontSize);
    const gap = descLines.length ? 0.4 : 0;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);

    return { itemLines, descLines, contentHeight: itemHeight + gap + descHeight };
  };

  autoTable(doc, {
    startY: y,
    head: [["#", "Item", "Qty", "Unit", "Unit Price", "GST %", "GST Value", "Total"]],
    body: lines.map((line, index) => {
      const { gstValue, total } = calcLine(line);
      return [
        index + 1,
        "",
        numeral(line.qty).format("0,0.##"),
        line.unit || "",
        numeral(line.unit_price).format("0,0.00"),
        line.gst ? `${line.gst}%` : "",
        numeral(gstValue).format("0,0.00"),
        numeral(total).format("0,0.00"),
      ];
    }),
    foot: [
      [
        "",
        "Total",
        numeral(totals.qty).format("0,0.##"),
        "",
        numeral(totals.amount).format("0,0.00"),
        "",
        numeral(totals.gstValue).format("0,0.00"),
        numeral(totals.total).format("0,0.00"),
      ],
    ],
    styles: { fontSize, cellPadding: 2, valign: "middle" },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 52, valign: "top" },
      2: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
    margin: { left: margin, right: margin },
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

      doc.setFont("helvetica", "bold");
      doc.setFontSize(itemFontSize);
      itemLines.forEach((text) => {
        doc.text(text, x, textY);
        textY += getLineHeight(itemFontSize);
      });

      if (descLines.length) {
        textY += 0.4;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(descFontSize);
        descLines.forEach((text) => {
          doc.text(text, x, textY);
          textY += getLineHeight(descFontSize);
        });
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  const terms = [
    order.shipping ? `Shipping: ${order.shipping}` : "",
    order.insurance ? `Insurance: ${order.insurance}` : "",
  ].filter(Boolean);

  if (terms.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    terms.forEach((term) => {
      doc.text(term, margin, y);
      y += 5;
    });
  }

  const fileName = `${order.po_no || "purchase-order"}.pdf`;
  doc.save(fileName);
};
