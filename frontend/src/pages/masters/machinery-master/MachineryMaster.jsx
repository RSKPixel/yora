import React, { useCallback, useContext, useEffect, useState } from "react";
import AuthContext from "../../../templates/AuthContext";
import DashboardBackLink from "../../../components/DashboardBackLink";
import MachineryMasterForm from "./MachineryMasterForm";
import MachineryMasterList from "./MachineryMasterList";
import { emptyMachine, mapMachineFromApi, MACHINE_TYPES } from "./machineryMasterUtils";

const emptyLookups = () => ({
  machine_types: MACHINE_TYPES,
});

const MachineryMaster = () => {
  const { api, authFetch } = useContext(AuthContext);
  const [machines, setMachines] = useState([]);
  const [lookups, setLookups] = useState(emptyLookups);
  const [loading, setLoading] = useState(true);
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [machine, setMachine] = useState(emptyMachine());
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formMessage, setFormMessage] = useState(null);
  const [listMessage, setListMessage] = useState(null);

  const loadMachines = useCallback(async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("search", searchQuery.trim());
      const response = await authFetch(`${api}/machinery-master/search`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();
      setMachines(data.status === "success" ? data.data || [] : []);
    } catch {
      setMachines([]);
    } finally {
      setLoading(false);
    }
  }, [api, authFetch, searchQuery]);

  const loadLookups = useCallback(async () => {
    setLookupsLoading(true);
    try {
      const response = await authFetch(`${api}/machinery-master/lookups`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.status === "success" && data.data) {
        setLookups({
          machine_types: data.data.machine_types || MACHINE_TYPES,
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
      loadMachines();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadMachines]);

  const handleNew = async () => {
    setListMessage(null);
    setMachine(emptyMachine());
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
      const response = await authFetch(`${api}/machinery-master/retrieve`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();

      if (data.status !== "success" || !data.data) {
        setFormMessage({
          type: "error",
          message: data.message || "Unable to load machine.",
        });
        setShowForm(false);
        setIsEditing(false);
        return;
      }

      setMachine(mapMachineFromApi(data.data));
    } catch {
      setFormMessage({
        type: "error",
        message: "Unable to load machine. Please try again.",
      });
      setShowForm(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setIsEditing(false);
    setMachine(emptyMachine());
    setFormMessage(null);
  };

  const handleSave = async (nextMachine, validationErrors = null) => {
    if (validationErrors) {
      setFormMessage({ type: "error", message: validationErrors });
      return;
    }

    setSaving(true);
    setFormMessage(null);

    try {
      const fd = new FormData();
      fd.append("action", isEditing ? "modify" : "new");
      fd.append("machine_name", nextMachine.machine_name);
      fd.append("machine_type", nextMachine.machine_type);
      fd.append("machine_description", nextMachine.machine_description ?? "");
      fd.append("purchase_date", nextMachine.purchase_date);
      fd.append("supplier_name", nextMachine.supplier_name ?? "");
      fd.append("amc_warranty_validity", nextMachine.amc_warranty_validity ?? "");
      if (isEditing && nextMachine.id) {
        fd.append("id", nextMachine.id);
      }

      const response = await authFetch(`${api}/machinery-master/save`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();

      if (!response.ok || data.status !== "success" || !data.data) {
        setFormMessage({
          type: "error",
          message: data.message || data.detail || "Unable to save machine.",
        });
        return;
      }

      setMachine(mapMachineFromApi(data.data));
      setIsEditing(true);
      setFormMessage({
        type: "success",
        message: data.message || "Machine saved.",
      });
      await loadMachines();
    } catch {
      setFormMessage({
        type: "error",
        message: "Unable to save machine. Please try again.",
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
              <i className="bi bi-gear-wide-connected" aria-hidden="true"></i>
            </span>
            Machinery Master
          </div>
          {showForm && (
            <p className="page-card-subtitle mt-0.5 ps-10">
              {isEditing ? "Update machinery master record" : "Create a new machinery master record"}
            </p>
          )}
        </div>
        <DashboardBackLink />
      </div>

      <div className="page-card-body">
        {showForm ? (
          <MachineryMasterForm
            machine={machine}
            isEditing={isEditing}
            saving={saving}
            formMessage={formMessage}
            lookups={lookups}
            lookupsLoading={lookupsLoading}
            onMachineChange={setMachine}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
          <MachineryMasterList
            machines={machines}
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

export default MachineryMaster;
