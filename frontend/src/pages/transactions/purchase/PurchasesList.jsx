import React, { useContext, useEffect, useState } from "react";
import moment from "moment";
import numeral from "numeral";
import AuthContext from "../../../templates/AuthContext";

const PurchasesList = ({
  setShowPendingBills,
  setPurchase,
  setPurchaseDetails,
  setShowForm,
}) => {
  const { api, authFetch } = useContext(AuthContext);
  const [purchasesList, setPurchasesList] = useState([]);
  const [period, setPeriod] = useState({
    date_from: moment().startOf("year").add(3, "months").format("YYYY-MM-DD"),
    date_to: moment().endOf("year").add(3, "months").format("YYYY-MM-DD"),
    details: false,
  });
  const [refresh, setRefresh] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDateChange = (e) => {
    setPeriod({ ...period, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    setLoading(true);
    const fd = new FormData();
    fd.append("date_from", period.date_from);
    fd.append("date_to", period.date_to);
    fd.append("details", period.details);

    authFetch(`${api}/purchases/list`, { method: "POST", body: fd })
      .then((response) => response.json())
      .then((data) => {
        setPurchasesList(data.data || []);
        setLoading(false);
      });
  }, [refresh, api]);

  const handleSearch = () => setRefresh(!refresh);

  const handleModifyPurchase = (p) => {
    const fd = new FormData();
    fd.append("purchase_id", p.purchase_id);
    fd.append("purchase_date", p.purchase_date);
    authFetch(`${api}/purchases/fetch`, { method: "POST", body: fd })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          setPurchase(data.data);
          setPurchaseDetails(data.data.details);
          setShowForm(true);
        }
      });
  };

  return (
    <>
      <div className="page-toolbar">
        <span className="page-toolbar-label">Period</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="page-icon-btn page-icon-btn-cyan"
            title="Import from Tally"
            onClick={() => setShowPendingBills(true)}
          >
            <i className="bi bi-cloud-download"></i>
          </button>
          <input
            className="page-select w-auto"
            type="date"
            name="date_from"
            value={period.date_from}
            onChange={handleDateChange}
          />
          <span className="text-slate-500 text-xs normal-case tracking-normal">to</span>
          <input
            className="page-select w-auto"
            type="date"
            name="date_to"
            value={period.date_to}
            onChange={handleDateChange}
          />
          <button
            type="button"
            className="page-icon-btn page-icon-btn-sky"
            title="Search"
            onClick={handleSearch}
          >
            <i className="bi bi-search"></i>
          </button>
        </div>
      </div>

      <div className="page-table-wrap">
        <table className="page-table">
          <thead>
            <tr>
              <th>Purchase Date</th>
              <th>Purchase ID</th>
              <th>Vendor</th>
              <th className="text-end">Expenses</th>
              <th className="text-end">Qty</th>
              <th className="text-end">Carton</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="page-table-empty">
                  Loading purchases…
                </td>
              </tr>
            ) : purchasesList.length > 0 ? (
              purchasesList.map((purchase) => (
                <tr key={`${purchase.purchase_id}-${purchase.purchase_date}`}>
                  <td>{moment(purchase.purchase_date).format("DD-MM-YYYY")}</td>
                  <td className="text-sky-300/90">{purchase.purchase_id}</td>
                  <td>{purchase.vendor}</td>
                  <td className="text-end">{numeral(purchase.expenses).format("0,0.00")}</td>
                  <td className="text-end">{numeral(purchase.qty).format("0,0")}</td>
                  <td className="text-end">{numeral(purchase.carton).format("0,0")}</td>
                  <td>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        className="page-icon-btn page-icon-btn-sky"
                        title="Edit purchase"
                        onClick={() => handleModifyPurchase(purchase)}
                      >
                        <i className="bi bi-pencil-square"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="page-table-empty">
                  No purchases found for the selected period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default PurchasesList;
