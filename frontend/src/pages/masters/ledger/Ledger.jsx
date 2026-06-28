import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../../../templates/AuthContext";
import DashboardBackLink from "../../../components/DashboardBackLink";

const Ledger = ({ action }) => {
  const { api, authFetch } = useContext(AuthContext);
  const [formAction, setFormAction] = useState(action);
  const [ledgerGroups, setLedgerGroups] = useState([]);
  const [formMessage, setFormMessage] = useState([]);

  const blankFormData = {
    action: formAction.toLowerCase(),
    ledger_name: "",
    group_name: "",
  };
  const [formData, setFormData] = useState(blankFormData);
  const validateForm = () => {
    const error = [];

    console.log(formData);

    if (!formData.ledger_name.trim()) error.push("Ledger Name is required.");
    if (!formData.group_name.trim()) error.push("Ledger Group is required.");

    const fd = new FormData();
    fd.append("ledger_name", formData.ledger_name);
    authFetch(`${api}/ledger/check-ledger-name`, {
      method: "POST",

      body: fd,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "error") {
          error.push(data.message);
        }
      });
    return error;
  };

  useEffect(() => {
    authFetch(`${api}/ledger/groups`, {
      method: "POST",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setLedgerGroups(data.data);
        }
      });
  }, [formAction]);

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleClickSave = () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setFormMessage(errors);
      return;
    }
    setFormMessage([]);

    const fd = new FormData();
    for (const key in formData) {
      fd.append(key, formData[key]);
    }

    authFetch(`${api}/ledger/save`, {
      method: "POST",
      body: fd,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setFormMessage([data.message]);
          //   setFormData(blankFormData);
        } else {
          setFormMessage([data.message || "An error occurred while saving."]);
        }
      });
  };
  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="mb-2 flex w-4/5 justify-end">
        <DashboardBackLink />
      </div>
      <div className="flex flex-col w-4/5 items-center shadow-xl">
        <div className="w-full px-2 text-sm text-white/50 font-bold z-10 border border-sky-900 py-1 rounded-t-sm bg-sky-950">
          Ledger Master ({formAction === "NEW" ? "New Ledger" : "Modify Ledger"}
          )
        </div>
        <form autoComplete="off" className="form-basic ">
          <input type="hidden" name="action" value={formAction} />
          <label>Ledger Name</label>
          <input
            type="text"
            name="ledger_name"
            value={formData.ledger_name}
            onChange={handleOnChange}
          />
          <label>Ledger Group</label>
          <select
            name="group_name"
            value={formData.group_name}
            onChange={handleOnChange}
          >
            <option value="">Select Ledger Group</option>
            {ledgerGroups.map((group) => (
              <option key={group.id} value={group.group_name}>
                {group.group_name}
              </option>
            ))}
          </select>

          {formMessage.length > 0 && (
            <div className="text-red-500 text-xs italic text-center">
              {formMessage.map((error, index) => (
                <p key={index}>{error}</p>
              ))}
            </div>
          )}

          <div className="flex flex-row items-stretch gap-2 pt-2">
            <button
              type="button"
              className="btn btn-success"
              onClick={handleClickSave}
            >
              Save
            </button>
            <button type="button" className="btn btn-danger">
              Cancel
            </button>
            <span className="ms-auto"></span>
            <button className="btn btn-info" type="button">
              Search
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Ledger;
