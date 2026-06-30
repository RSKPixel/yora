import React, { useCallback, useContext, useEffect, useState } from "react";
import AuthContext from "../../../templates/AuthContext";
import ConfirmModal from "../../../components/ConfirmModal";
import DashboardBackLink from "../../../components/DashboardBackLink";
import MachineryServiceRecorderForm from "./MachineryServiceRecorderForm";
import MachineryServiceRecorderList from "./MachineryServiceRecorderList";
import { emptyServiceRecord, formatDate, mapServiceRecordFromApi } from "./machineryServiceRecorderUtils";

const MachineryServiceRecorder = () => {
  const { api, authFetch } = useContext(AuthContext);
  const [records, setRecords] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [record, setRecord] = useState(emptyServiceRecord());
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formMessage, setFormMessage] = useState(null);
  const [listMessage, setListMessage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("search", searchQuery.trim());
      const response = await authFetch(`${api}/machinery-service-records/search`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();
      setRecords(data.status === "success" ? data.data || [] : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [api, authFetch, searchQuery]);

  const loadMachines = useCallback(async () => {
    setMachinesLoading(true);
    try {
      const response = await authFetch(`${api}/machinery-service-records/lookups`, {
        method: "POST",
      });
      const data = await response.json();
      setMachines(data.status === "success" ? data.data?.machines || [] : []);
    } catch {
      setMachines([]);
    } finally {
      setMachinesLoading(false);
    }
  }, [api, authFetch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRecords();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadRecords]);

  const handleNew = async () => {
    setListMessage(null);
    setRecord(emptyServiceRecord());
    setIsEditing(false);
    setFormMessage(null);
    setShowForm(true);
    await loadMachines();
  };

  const handleEdit = async (existing) => {
    setListMessage(null);
    setFormMessage(null);
    setShowForm(true);
    setIsEditing(true);

    try {
      await loadMachines();

      const fd = new FormData();
      fd.append("id", String(existing.id));
      const response = await authFetch(`${api}/machinery-service-records/retrieve`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();

      if (data.status !== "success" || !data.data) {
        setFormMessage({
          type: "error",
          message: data.message || "Unable to load service record.",
        });
        setShowForm(false);
        setIsEditing(false);
        return;
      }

      setRecord(mapServiceRecordFromApi(data.data));
    } catch {
      setFormMessage({
        type: "error",
        message: "Unable to load service record. Please try again.",
      });
      setShowForm(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setIsEditing(false);
    setRecord(emptyServiceRecord());
    setFormMessage(null);
  };

  const handleSave = async (nextRecord, validationErrors = null) => {
    if (validationErrors) {
      setFormMessage({ type: "error", message: validationErrors });
      return;
    }

    setSaving(true);
    setFormMessage(null);

    try {
      const fd = new FormData();
      fd.append("action", isEditing ? "modify" : "new");
      fd.append("machinery_id", nextRecord.machinery_id);
      fd.append("service_date", nextRecord.service_date);
      fd.append("complaint_description", nextRecord.complaint_description ?? "");
      fd.append("service_description", nextRecord.service_description);
      if (isEditing && nextRecord.id) {
        fd.append("id", nextRecord.id);
      }

      const response = await authFetch(`${api}/machinery-service-records/save`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();

      if (!response.ok || data.status !== "success" || !data.data) {
        setFormMessage({
          type: "error",
          message: data.message || data.detail || "Unable to save service record.",
        });
        return;
      }

      setRecord(mapServiceRecordFromApi(data.data));
      setIsEditing(true);
      setFormMessage({
        type: "success",
        message: data.message || "Service record saved.",
      });
      await loadRecords();
    } catch {
      setFormMessage({
        type: "error",
        message: "Unable to save service record. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (target) => {
    if (!target?.id || deleting) return;
    setDeleteTarget(target);
  };

  const cancelDelete = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const confirmDelete = useCallback(async () => {
    const targetId = deleteTarget?.id;
    if (!targetId) return;

    setDeleting(true);
    setFormMessage(null);
    setListMessage(null);

    try {
      const fd = new FormData();
      fd.append("id", String(targetId));
      const response = await authFetch(`${api}/machinery-service-records/delete`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        const errorMessage = data.message || data.detail || "Unable to delete service record.";
        setDeleteTarget(null);
        if (showForm && String(record.id) === String(targetId)) {
          setFormMessage({ type: "error", message: errorMessage });
        } else {
          setListMessage({ type: "error", message: errorMessage });
        }
        return;
      }

      setDeleteTarget(null);

      if (showForm && String(record.id) === String(targetId)) {
        setShowForm(false);
        setIsEditing(false);
        setRecord(emptyServiceRecord());
        setFormMessage(null);
        setListMessage({
          type: "success",
          message: data.message || "Service record deleted.",
        });
      } else {
        setListMessage({
          type: "success",
          message: data.message || "Service record deleted.",
        });
      }

      await loadRecords();
    } catch {
      setDeleteTarget(null);
      const errorMessage = "Unable to delete service record. Please try again.";
      if (showForm && String(record.id) === String(targetId)) {
        setFormMessage({ type: "error", message: errorMessage });
      } else {
        setListMessage({ type: "error", message: errorMessage });
      }
    } finally {
      setDeleting(false);
    }
  }, [api, authFetch, deleteTarget, loadRecords, record.id, showForm]);

  const deleteDetail = deleteTarget
    ? `${deleteTarget.machine_id} · ${formatDate(deleteTarget.service_date)}`
    : "";

  return (
    <div className={`page-card${showForm ? " page-card-fit" : ""}`}>
      <div className="page-card-header">
        <div>
          <div className="page-card-title">
            <span className="page-card-title-icon">
              <i className="bi bi-wrench-adjustable" aria-hidden="true"></i>
            </span>
            Service Record
          </div>
          {showForm && (
            <p className="page-card-subtitle mt-0.5 ps-10">
              {isEditing ? "Update service record" : "Record a new service entry"}
            </p>
          )}
        </div>
        <DashboardBackLink />
      </div>

      <div className="page-card-body">
        {showForm ? (
          <MachineryServiceRecorderForm
            record={record}
            isEditing={isEditing}
            saving={saving}
            formMessage={formMessage}
            machines={machines}
            machinesLoading={machinesLoading}
            onRecordChange={setRecord}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
          <MachineryServiceRecorderList
            records={records}
            loading={loading}
            deleting={deleting}
            searchQuery={searchQuery}
            listMessage={listMessage}
            onSearchChange={setSearchQuery}
            onNew={handleNew}
            onEdit={handleEdit}
            onDelete={requestDelete}
          />
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete service record?"
        message="This will permanently remove the service record."
        detail={deleteDetail}
        confirmLabel="Delete"
        cancelLabel="Keep record"
        loading={deleting}
        variant="danger"
        onConfirm={confirmDelete}
        onClose={cancelDelete}
      />
    </div>
  );
};

export default MachineryServiceRecorder;
