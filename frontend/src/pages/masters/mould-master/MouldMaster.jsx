import React, { useCallback, useContext, useEffect, useState } from "react";
import AuthContext from "../../../templates/AuthContext";
import DashboardBackLink from "../../../components/DashboardBackLink";
import MouldMasterForm from "./MouldMasterForm";
import MouldMasterList from "./MouldMasterList";
import {
  emptyMould,
  formatOptionalId,
  MOULD_TYPES,
  TOOL_QUALITY_STATUSES,
} from "./mouldMasterUtils";

const emptyLookups = () => ({
  mould_types: MOULD_TYPES,
  tool_quality_statuses: TOOL_QUALITY_STATUSES,
  machines: [],
  locations: [],
});

const MouldMaster = () => {
  const { api, authFetch } = useContext(AuthContext);
  const [moulds, setMoulds] = useState([]);
  const [lookups, setLookups] = useState(emptyLookups);
  const [loading, setLoading] = useState(true);
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [mould, setMould] = useState(emptyMould());
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formMessage, setFormMessage] = useState(null);
  const [listMessage, setListMessage] = useState(null);

  const loadMoulds = useCallback(async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("mould_name", searchQuery.trim());
      const response = await authFetch(`${api}/mould-inventory/search`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();
      setMoulds(data.status === "success" ? data.data || [] : []);
    } catch {
      setMoulds([]);
    } finally {
      setLoading(false);
    }
  }, [api, authFetch, searchQuery]);

  const loadLookups = useCallback(async () => {
    setLookupsLoading(true);
    try {
      const response = await authFetch(`${api}/mould-inventory/lookups`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.status === "success" && data.data) {
        setLookups({
          mould_types: data.data.mould_types || MOULD_TYPES,
          tool_quality_statuses: data.data.tool_quality_statuses || TOOL_QUALITY_STATUSES,
          machines: data.data.machines || [],
          locations: data.data.locations || [],
        });
      } else {
        setLookups(emptyLookups());
      }
    } catch {
      setLookups(emptyLookups());
    } finally {
      setLookupsLoading(false);
    }
  }, [api, authFetch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMoulds();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadMoulds]);

  const handleNew = async () => {
    setListMessage(null);
    setMould(emptyMould());
    setIsEditing(false);
    setFormMessage(null);
    setShowForm(true);
    await loadLookups();
  };

  const handleEdit = async (existing) => {
    setFormMessage(null);
    setShowForm(true);
    setIsEditing(true);

    try {
      await loadLookups();

      const fd = new FormData();
      fd.append("id", String(existing.id));
      const response = await authFetch(`${api}/mould-inventory/retrieve`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();

      if (data.status !== "success" || !data.data) {
        setFormMessage({
          type: "error",
          message: data.message || "Unable to load mould.",
        });
        setShowForm(false);
        setIsEditing(false);
        return;
      }

      setMould({
        id: String(data.data.id),
        tool_id: data.data.tool_id || "",
        mould_name: data.data.mould_name,
        mould_type: data.data.mould_type,
        purchase_date: data.data.purchase_date || "",
        manufactured_by: data.data.manufactured_by || "",
        tool_quality_status: data.data.tool_quality_status || TOOL_QUALITY_STATUSES[0],
        neck_size_mm:
          data.data.neck_size_mm === null || data.data.neck_size_mm === undefined
            ? ""
            : String(data.data.neck_size_mm),
        capacity_ml:
          data.data.capacity_ml === null || data.data.capacity_ml === undefined
            ? ""
            : String(data.data.capacity_ml),
        compatible_machine_id: formatOptionalId(data.data.compatible_machine_id),
        inventory_location_id: formatOptionalId(data.data.inventory_location_id),
      });
    } catch {
      setFormMessage({
        type: "error",
        message: "Unable to load mould. Please try again.",
      });
      setShowForm(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setIsEditing(false);
    setMould(emptyMould());
    setFormMessage(null);
  };

  const handleSave = async (nextMould, validationErrors = null) => {
    if (validationErrors) {
      setFormMessage({ type: "error", message: validationErrors });
      return;
    }

    setSaving(true);
    setFormMessage(null);

    try {
      const fd = new FormData();
      fd.append("action", isEditing ? "modify" : "new");
      fd.append("mould_name", nextMould.mould_name);
      fd.append("mould_type", nextMould.mould_type);
      fd.append("purchase_date", nextMould.purchase_date);
      fd.append("manufactured_by", nextMould.manufactured_by ?? "");
      fd.append("tool_quality_status", nextMould.tool_quality_status);
      fd.append("neck_size_mm", nextMould.neck_size_mm ?? "");
      fd.append("capacity_ml", nextMould.capacity_ml ?? "");
      fd.append("compatible_machine_id", nextMould.compatible_machine_id ?? "");
      fd.append("inventory_location_id", nextMould.inventory_location_id ?? "");
      if (isEditing && nextMould.id) {
        fd.append("id", nextMould.id);
      }

      const response = await authFetch(`${api}/mould-inventory/save`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();

      if (!response.ok || data.status !== "success" || !data.data) {
        setFormMessage({
          type: "error",
          message: data.message || data.detail || "Unable to save mould.",
        });
        return;
      }

      setListMessage({
        type: "success",
        message: data.message || "Mould saved.",
      });
      setShowForm(false);
      setIsEditing(false);
      setMould(emptyMould());
      await loadMoulds();
    } catch {
      setFormMessage({
        type: "error",
        message: "Unable to save mould. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`page-card${showForm ? " page-card-fit" : ""}`}>
      <div className="page-card-header">
        <div>
          <div className="page-card-title">
            <span className="page-card-title-icon">
              <i className="bi bi-box-seam" aria-hidden="true"></i>
            </span>
            Mould Master
          </div>
          {showForm && (
            <p className="page-card-subtitle mt-0.5 ps-10">
              {isEditing ? "Update mould master record" : "Create a new mould master record"}
            </p>
          )}
        </div>
        <DashboardBackLink />
      </div>

      <div className="page-card-body">
        {showForm ? (
          <MouldMasterForm
            mould={mould}
            isEditing={isEditing}
            saving={saving}
            formMessage={formMessage}
            lookups={lookups}
            lookupsLoading={lookupsLoading}
            onMouldChange={setMould}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
          <MouldMasterList
            moulds={moulds}
            loading={loading}
            searchQuery={searchQuery}
            listMessage={listMessage}
            onSearchChange={setSearchQuery}
            onNew={handleNew}
            onEdit={handleEdit}
          />
        )}
      </div>
    </div>
  );
};

export default MouldMaster;
