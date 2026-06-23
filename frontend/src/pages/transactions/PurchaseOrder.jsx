import React, { useCallback, useContext, useEffect, useState } from "react";
import AuthContext from "../../templates/AuthContext";
import ConfirmModal from "../../components/ConfirmModal";
import PurchaseOrderList from "./PurchaseOrderList";
import PurchaseOrderForm from "./PurchaseOrderForm";
import {
  buildPurchaseOrderFormData,
  DEFAULT_PO_STATUS,
  emptyLine,
  emptyOrder,
  getDisplayPoNo,
  isOrderDirty,
  normalizeOrderSnapshot,
  validateOrder,
} from "./purchaseOrderUtils";

const prepareOrderForForm = (order) => ({
  ...order,
  details: (order.details?.length ? order.details : [emptyLine()]).map((line) => ({
    ...line,
    show_description: !!line.description?.trim(),
  })),
  status: order.status ?? DEFAULT_PO_STATUS,
  vendor_quotation_no: order.vendor_quotation_no ?? "",
  shipping: order.shipping ?? "",
  insurance: order.insurance ?? "",
  payment_terms: order.payment_terms ?? "",
  delivery_terms: order.delivery_terms ?? "",
});

const PurchaseOrder = () => {
  const { api, authFetch } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [order, setOrder] = useState(emptyOrder());
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [formMessage, setFormMessage] = useState(null);
  const [listMessage, setListMessage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch(`${api}/purchase-orders/list`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.status === "success") {
        setOrders(data.data || []);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [api, authFetch]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleNew = () => {
    setListMessage(null);
    setOrder(emptyOrder());
    setSavedSnapshot(null);
    setIsEditing(false);
    setFormMessage(null);
    setShowForm(true);
  };

  const handleEdit = async (existing) => {
    setFormMessage(null);
    setShowForm(true);
    setIsEditing(true);

    try {
      const fd = new FormData();
      fd.append("po_no", existing.po_no);
      const response = await authFetch(`${api}/purchase-orders/fetch`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();

      if (data.status !== "success" || !data.data) {
        setFormMessage({
          type: "error",
          message: data.message || "Unable to load purchase order.",
        });
        setShowForm(false);
        setIsEditing(false);
        return;
      }

      const loaded = prepareOrderForForm(data.data);
      setOrder(loaded);
      setSavedSnapshot(normalizeOrderSnapshot(loaded));
    } catch {
      setFormMessage({
        type: "error",
        message: "Unable to load purchase order. Please try again.",
      });
      setShowForm(false);
      setIsEditing(false);
    }
  };

  const handleBack = () => {
    setShowForm(false);
    setOrder(emptyOrder());
    setSavedSnapshot(null);
    setFormMessage(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const errors = validateOrder(order);
    if (errors.length > 0) {
      setFormMessage({ type: "error", message: errors });
      return;
    }

    setSaving(true);
    setFormMessage(null);

    try {
      const fd = buildPurchaseOrderFormData(order, {
        includePoNo: isEditing && !!order.po_no,
      });
      const response = await authFetch(`${api}/purchase-orders/save`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();

      if (!response.ok || data.status !== "success" || !data.data) {
        setFormMessage({
          type: "error",
          message:
            data.message ||
            data.detail ||
            "Unable to save purchase order.",
        });
        return;
      }

      const saved = prepareOrderForForm(data.data);
      setOrder(saved);
      setSavedSnapshot(normalizeOrderSnapshot(saved));
      setIsEditing(true);
      setFormMessage({
        type: "success",
        message: data.message || `Purchase order ${saved.po_no} saved.`,
      });
      await loadOrders();
    } catch {
      setFormMessage({
        type: "error",
        message: "Unable to save purchase order. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (poNo) => {
    const targetPoNo = poNo?.trim();
    if (!targetPoNo || deleting) return;
    setDeleteTarget(targetPoNo);
  };

  const cancelDelete = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const confirmDelete = useCallback(async () => {
    const targetPoNo = deleteTarget?.trim();
    if (!targetPoNo) return;

    setDeleting(true);
    setFormMessage(null);
    setListMessage(null);

    try {
      const fd = new FormData();
      fd.append("po_no", targetPoNo);
      const response = await authFetch(`${api}/purchase-orders/delete`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        const errorMessage =
          data.message || data.detail || "Unable to delete purchase order.";
        setDeleteTarget(null);
        if (showForm) {
          setFormMessage({ type: "error", message: errorMessage });
        } else {
          setListMessage({ type: "error", message: errorMessage });
        }
        return;
      }

      setDeleteTarget(null);

      if (showForm && order.po_no === targetPoNo) {
        handleBack();
      } else {
        setListMessage({
          type: "success",
          message: data.message || `Purchase order ${targetPoNo} deleted.`,
        });
      }

      await loadOrders();
    } catch {
      setDeleteTarget(null);
      const errorMessage = "Unable to delete purchase order. Please try again.";
      if (showForm) {
        setFormMessage({ type: "error", message: errorMessage });
      } else {
        setListMessage({ type: "error", message: errorMessage });
      }
    } finally {
      setDeleting(false);
    }
  }, [
    api,
    authFetch,
    deleteTarget,
    loadOrders,
    order.po_no,
    showForm,
  ]);

  const isDirty = isEditing && savedSnapshot && isOrderDirty(order, savedSnapshot);
  const displayPoNo = getDisplayPoNo({
    isSaved: isEditing,
    poNo: order.po_no,
    isDirty,
  });

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
            <PurchaseOrderList
              orders={orders}
              loading={loading}
              deleting={deleting}
              listMessage={listMessage}
              onNew={handleNew}
              onEdit={handleEdit}
              onDelete={requestDelete}
            />
          ) : (
            <PurchaseOrderForm
              order={order}
              displayPoNo={displayPoNo}
              onOrderChange={setOrder}
              formMessage={formMessage}
              onBack={handleBack}
              onSave={handleSave}
              onDelete={
                isEditing && order.po_no ? () => requestDelete(order.po_no) : null
              }
              isEditing={isEditing}
              saving={saving}
              deleting={deleting}
            />
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete purchase order?"
        message="This will permanently remove the purchase order and all line items."
        detail={deleteTarget ? deleteTarget : ""}
        confirmLabel="Delete"
        cancelLabel="Keep purchase order"
        loading={deleting}
        variant="danger"
        onConfirm={confirmDelete}
        onClose={cancelDelete}
      />
    </div>
  );
};

export default PurchaseOrder;
