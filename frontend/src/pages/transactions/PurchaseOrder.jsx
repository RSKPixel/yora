import React, { useState } from "react";
import PurchaseOrderList from "./PurchaseOrderList";
import PurchaseOrderForm from "./PurchaseOrderForm";
import { emptyOrder, validateOrder } from "./purchaseOrderUtils";

const STORAGE_KEY = "yora_purchase_orders";

const loadOrders = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveOrders = (orders) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
};

const nextPoNo = (orders) => {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `PO-${year}-`;
  const maxSeq = orders.reduce((max, order) => {
    if (!order.po_no?.startsWith(prefix)) return max;
    const seq = parseInt(order.po_no.slice(prefix.length), 10);
    return Number.isFinite(seq) ? Math.max(max, seq) : max;
  }, 0);
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
};

const PurchaseOrder = () => {
  const [orders, setOrders] = useState(loadOrders);
  const [showForm, setShowForm] = useState(false);
  const [order, setOrder] = useState(emptyOrder());
  const [formMessage, setFormMessage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const persistOrders = (nextOrders) => {
    setOrders(nextOrders);
    saveOrders(nextOrders);
  };

  const handleNew = () => {
    setOrder({
      ...emptyOrder(),
      po_no: nextPoNo(orders),
    });
    setIsEditing(false);
    setFormMessage(null);
    setShowForm(true);
  };

  const handleEdit = (existing) => {
    setOrder({
      ...existing,
      details: existing.details.map((line) => ({
        ...line,
        show_description: !!line.description?.trim(),
      })),
      shipping: existing.shipping ?? existing.packaging_forwarding ?? "",
    });
    setIsEditing(true);
    setFormMessage(null);
    setShowForm(true);
  };

  const handleBack = () => {
    setShowForm(false);
    setOrder(emptyOrder());
    setFormMessage(null);
    setIsEditing(false);
  };

  const handleSave = () => {
    const errors = validateOrder(order);
    if (errors.length > 0) {
      setFormMessage({ type: "error", message: errors });
      return;
    }

    const activeLines = order.details
      .filter((line) => line.stock_item?.trim())
      .map(({ show_description, ...line }) => line);

    if (isEditing) {
      const updated = orders.map((item) =>
        item.po_no === order.po_no
          ? { ...order, details: activeLines, updated_at: new Date().toISOString() }
          : item
      );
      persistOrders(updated);
      setFormMessage({ type: "success", message: "Purchase order updated." });
    } else {
      const poNo = order.po_no || nextPoNo(orders);
      const created = {
        ...order,
        po_no: poNo,
        details: activeLines,
        created_at: new Date().toISOString(),
      };
      persistOrders([created, ...orders]);
      setOrder(created);
      setIsEditing(true);
      setFormMessage({ type: "success", message: `Purchase order ${poNo} saved.` });
    }
  };

  return (
    <div className="w-full">
      <div className="page-card">
        <div className="page-card-header">
          <div>
            <div className="page-card-title">
              <span className="page-card-title-icon">
                <i className="bi bi-clipboard-check"></i>
              </span>
              Purchase Order
            </div>
            <p className="page-card-subtitle mt-0.5 ps-10">
              {showForm
                ? isEditing
                  ? "Update purchase order details"
                  : "Create a new purchase order"
                : "Manage purchase orders"}
            </p>
          </div>
        </div>

        <div className="page-card-body">
          {!showForm ? (
            <PurchaseOrderList orders={orders} onNew={handleNew} onEdit={handleEdit} />
          ) : (
            <PurchaseOrderForm
              order={order}
              onOrderChange={setOrder}
              formMessage={formMessage}
              onBack={handleBack}
              onSave={handleSave}
              isEditing={isEditing}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrder;
