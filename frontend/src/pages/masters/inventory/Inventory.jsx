import React, { useContext, useEffect, useRef, useState } from "react";
import AuthContext from "../../../templates/AuthContext";
import DashboardBackLink from "../../../components/DashboardBackLink";
import InventorySearch from "./InventorySearch";

const Inventory = ({ action, inventoryId }) => {
  const blankFormData = {
    action: action.toLowerCase(),
    inventory_name: "",
    inventory_category: "",
    neck_size: 0,
    weight: 0,
    quantity_per_pack: 0,
    remarks: "",
    shape: "",
    capacity: 0,
  };
  const [formData, setFormData] = useState(blankFormData);
  const [formMessage, setFormMessage] = useState({});
  const [showSearch, setShowSearch] = useState(false);
  const [formAction, setFormAction] = useState(action.toLowerCase());
  const inventoryNameRef = useRef(null);
  const { api, authFetch } = useContext(AuthContext);

  useEffect(() => {
    if (formAction === "modify") {
      const fd = new FormData();
      fd.append("id", inventoryId);

      authFetch(`${api}/inventory/retrive`, {
        method: "POST",
        body: fd,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            setFormData({
              ...data.data,
              action: "modify",
            });
          }
        });
    } else if (formAction === "new") {
      setFormData(blankFormData);
      inventoryNameRef.current.focus();
    }
  }, [formAction, inventoryId, action]);
  const validateForm = () => {
    const error = [];

    if (!formData.inventory_name.trim())
      error.push("Inventory Name is required.");
    if (!formData.inventory_category.trim())
      error.push("Inventory Category is required.");
    if (!formData.quantity_per_pack || formData.quantity_per_pack <= 0)
      error.push("Quantity per Pack is required.");
    if (!formData.capacity || formData.capacity <= 0)
      error.push("Capacity is required.");

    return error;
  };

  const handleOnChange = (e) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormMessage({});
    const errors = validateForm();
    if (errors.length > 0) {
      setFormMessage(errors);
      return;
    }

    const fd = new FormData();
    for (const key in formData) {
      fd.append(key, formData[key]);
    }

    const url =
      formData.action === "new"
        ? `${api}/inventory/save`
        : `${api}/inventory/update`;

    authFetch(`${api}/inventory/save`, {
      method: "POST",
      body: fd,
    })
      .then((res) => res.json())
      .then((data) => {
        setFormMessage([data.message]);
      });
  };

  const handleCancel = () => {
    setFormAction("new");
    setFormData(blankFormData);
    setFormMessage({});
    inventoryNameRef.current.focus();
  };

  if (showSearch) {
    return <InventorySearch />;
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="mb-2 flex w-4/5 justify-end">
        <DashboardBackLink />
      </div>
      <div className="flex flex-col w-4/5 items-center shadow-xl">
        <div className="w-full px-2 text-sm text-white/50 font-bold z-10 border border-sky-900 py-1 rounded-t-sm bg-sky-950">
          Inventory Master (
          {formAction === "new" ? "New Inventory" : "Modify Inventory"})
        </div>
        <form autoComplete="off" className="form-basic ">
          <input type="hidden" name="action" value={formAction} />
          <label>Inventory Name *</label>
          <input
            ref={inventoryNameRef}
            readOnly={formAction === "modify"}
            type="text"
            name="inventory_name"
            value={formData.inventory_name}
            onChange={handleOnChange}
          ></input>

          <label>Inventory Category *</label>
          <select
            name="inventory_category"
            value={formData.inventory_category}
            onChange={handleOnChange}
          >
            <option value="">Select Category *</option>
            <option value="FRIDGE BOTTLES">Fridge Bottles</option>
            <option value="PET JARS">PET Jars</option>
            <option value="PREFORMS">Preforms</option>
          </select>

          <div className="grid grid-cols-3 gap-x-4 gap-y-2">
            <label>Neck Size (mm)</label>
            <label>Weight (g)</label>
            <label>Quantity per Pack *</label>

            <input
              type="number"
              name="neck_size"
              value={formData.neck_size}
              onChange={handleOnChange}
            ></input>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleOnChange}
            ></input>
            <input
              type="number"
              name="quantity_per_pack"
              value={formData.quantity_per_pack}
              onChange={handleOnChange}
            ></input>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <label>Shape</label>
            <label>Capacity (ml) *</label>
            <input
              type="text"
              name="shape"
              value={formData.shape}
              onChange={handleOnChange}
              maxLength={50}
            ></input>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleOnChange}
            ></input>
          </div>

          <label>Remarks</label>
          <textarea
            name="remarks"
            rows="2"
            style={{ resize: "none" }}
            value={formData.remarks}
            onChange={handleOnChange}
          ></textarea>

          {formMessage.length > 0 && (
            <div className="text-red-500 text-xs italic text-center">
              {formMessage.map((error, index) => (
                <p key={index}>{error}</p>
              ))}
            </div>
          )}

          <div className="flex flex-row items-stretch gap-2 pt-2">
            <button
              onClick={handleSubmit}
              type="button"
              className="btn btn-success"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              type="button"
              className="btn btn-danger"
            >
              Cancel
            </button>
            <span className="ms-auto"></span>
            <button
              className="btn btn-info"
              type="button"
              onClick={() => setShowSearch(true)}
            >
              Search
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
