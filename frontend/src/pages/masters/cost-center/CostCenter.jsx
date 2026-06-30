import React, { useCallback, useContext, useEffect, useState } from "react";
import AuthContext from "../../../templates/AuthContext";
import DashboardBackLink from "../../../components/DashboardBackLink";
import CostCenterForm from "./CostCenterForm";
import CostCenterList from "./CostCenterList";
import { emptyCostCenter, formatUnderId } from "./costCenterUtils";

const CostCenter = () => {
  const { api, authFetch } = useContext(AuthContext);
  const [costCenters, setCostCenters] = useState([]);
  const [underOptions, setUnderOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [underOptionsLoading, setUnderOptionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [costCenter, setCostCenter] = useState(emptyCostCenter());
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formMessage, setFormMessage] = useState(null);
  const [listMessage, setListMessage] = useState(null);

  const loadCostCenters = useCallback(async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("cost_center_name", searchQuery.trim());
      const response = await authFetch(`${api}/cost-centers/search`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();
      setCostCenters(data.status === "success" ? data.data || [] : []);
    } catch {
      setCostCenters([]);
    } finally {
      setLoading(false);
    }
  }, [api, authFetch, searchQuery]);

  const loadUnderOptions = useCallback(
    async (excludeId = "") => {
      setUnderOptionsLoading(true);
      try {
        const fd = new FormData();
        if (excludeId) {
          fd.append("exclude_id", excludeId);
        }
        const response = await authFetch(`${api}/cost-centers/under-options`, {
          method: "POST",
          body: fd,
        });
        const data = await response.json();
        setUnderOptions(data.status === "success" ? data.data || [] : []);
      } catch {
        setUnderOptions([]);
      } finally {
        setUnderOptionsLoading(false);
      }
    },
    [api, authFetch]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCostCenters();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadCostCenters]);

  const handleNew = async () => {
    setListMessage(null);
    setCostCenter(emptyCostCenter());
    setIsEditing(false);
    setFormMessage(null);
    setShowForm(true);
    await loadUnderOptions();
  };

  const handleEdit = async (existing) => {
    setFormMessage(null);
    setShowForm(true);
    setIsEditing(true);

    try {
      await loadUnderOptions(String(existing.id));

      const fd = new FormData();
      fd.append("id", String(existing.id));
      const response = await authFetch(`${api}/cost-centers/retrieve`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();

      if (data.status !== "success" || !data.data) {
        setFormMessage({
          type: "error",
          message: data.message || "Unable to load cost center.",
        });
        setShowForm(false);
        setIsEditing(false);
        return;
      }

      setCostCenter({
        id: String(data.data.id),
        cost_center_name: data.data.cost_center_name,
        under_id: formatUnderId(data.data.under_id),
      });
    } catch {
      setFormMessage({
        type: "error",
        message: "Unable to load cost center. Please try again.",
      });
      setShowForm(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setIsEditing(false);
    setCostCenter(emptyCostCenter());
    setFormMessage(null);
  };

  const handleSave = async (nextCostCenter, validationErrors = null) => {
    if (validationErrors) {
      setFormMessage({ type: "error", message: validationErrors });
      return;
    }

    setSaving(true);
    setFormMessage(null);

    try {
      const fd = new FormData();
      fd.append("action", isEditing ? "modify" : "new");
      fd.append("cost_center_name", nextCostCenter.cost_center_name);
      fd.append("under_id", nextCostCenter.under_id ?? "");
      if (isEditing && nextCostCenter.id) {
        fd.append("id", nextCostCenter.id);
      }

      const response = await authFetch(`${api}/cost-centers/save`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();

      if (!response.ok || data.status !== "success" || !data.data) {
        setFormMessage({
          type: "error",
          message: data.message || data.detail || "Unable to save cost center.",
        });
        return;
      }

      setListMessage({
        type: "success",
        message: data.message || "Cost center saved.",
      });
      setShowForm(false);
      setIsEditing(false);
      setCostCenter(emptyCostCenter());
      await loadCostCenters();
    } catch {
      setFormMessage({
        type: "error",
        message: "Unable to save cost center. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-card">
      <div className="page-card-header">
        <div>
          <div className="page-card-title">
            <span className="page-card-title-icon">
              <i className="bi bi-building" aria-hidden="true"></i>
            </span>
            Cost Center
          </div>
          {showForm && (
            <p className="page-card-subtitle mt-0.5 ps-10">
              {isEditing
                ? "Update cost center master record"
                : "Create a new cost center master record"}
            </p>
          )}
        </div>
        <DashboardBackLink />
      </div>

      <div className="page-card-body">
        {showForm ? (
          <CostCenterForm
            costCenter={costCenter}
            isEditing={isEditing}
            saving={saving}
            formMessage={formMessage}
            underOptions={underOptions}
            underOptionsLoading={underOptionsLoading}
            onCostCenterChange={setCostCenter}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
          <CostCenterList
            costCenters={costCenters}
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

export default CostCenter;
