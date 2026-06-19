import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../../templates/AuthContext";
import moment from "moment";
import Loader from "../../components/Loader";
import DatePeriods from "../../utils/DatePeriods";
import PackingList from "./PackingList";
import DeliveryChallan from "./DeliveryChallan";

const Sales = () => {
  const { api, authFetch } = useContext(AuthContext);
  const [salesList, setSalesList] = useState([]);
  const [showPackingList, setShowPackingList] = useState(false);
  const [showDeliveryChallan, setShowDeliveryChallan] = useState(false);
  const [salesInvoice, setSalesInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [refresh, setRefresh] = useState(false);
  const [filter, setFilter] = useState("all");
  const filterOptions = [
    { label: "All", value: "all" },
    { label: "Delivered", value: "delivered" },
    { label: "Pending Delivery", value: "pending_delivery" },
  ];

  const periodValue = DatePeriods();
  const periodOptions = Object.keys(periodValue);
  const [period, setPeriod] = useState("This Week");

  useEffect(() => {
    setLoading(true);
    setLoadingMessage("Fetching sales data...");
    const fd = new FormData();
    fd.append("filter", filter);
    fd.append("date_from", periodValue[period].date_from);
    fd.append("date_to", periodValue[period].date_to);

    authFetch(`${api}/sales/sales-list`, {
      method: "POST",
      body: fd,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          setSalesList(data.data);
          setLoading(false);
        }
      });
  }, [refresh, filter, period]);

  const loadTallyData = () => {
    setLoading(true);
    setLoadingMessage("Fetching tally data...");
    authFetch(`${api}/sales/tally-sales-list`, {
      method: "POST",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          setLoading(false);
          setRefresh(!refresh);
        }
      });
  };

  return (
    <div className="w-full">
      {loading && <Loader message={loadingMessage} />}
      {showPackingList && (
        <PackingList salesInvoice={salesInvoice} setShowPackingList={setShowPackingList} />
      )}
      {showDeliveryChallan && (
        <DeliveryChallan
          salesInvoice={salesInvoice}
          setShowDeliveryChallan={setShowDeliveryChallan}
          setRefresh={setRefresh}
          refresh={refresh}
        />
      )}

      <div className="page-card">
        <div className="page-card-header">
          <div>
            <div className="page-card-title">
              <span className="page-card-title-icon">
                <i className="bi bi-receipt"></i>
              </span>
              Sales
            </div>
            <p className="page-card-subtitle mt-0.5 ps-10">
              {moment(periodValue[period].date_from).format("DD-MM-YYYY")} to{" "}
              {moment(periodValue[period].date_to).format("DD-MM-YYYY")}
            </p>
          </div>
          <button
            type="button"
            className="page-icon-btn page-icon-btn-sky"
            title="Sync from Tally"
            onClick={loadTallyData}
          >
            <i className="bi bi-arrow-clockwise text-base"></i>
          </button>
        </div>

        <div className="page-card-body">
          <div className="page-toolbar">
            <span className="page-toolbar-label">Filters</span>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="page-select"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {periodOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                className="page-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="page-table-wrap">
            <table className="page-table">
              <thead>
                <tr>
                  <th>Invoice Date</th>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th className="text-end">Items</th>
                  <th className="text-end">Qty</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {salesList?.length > 0 ? (
                  salesList.map((invoice) => (
                    <tr key={invoice.invoice_no}>
                      <td>{moment(invoice.invoice_date).format("DD-MM-YYYY")}</td>
                      <td className="text-sky-300/90">{invoice.invoice_no}</td>
                      <td>{invoice.buyer}</td>
                      <td className="text-end">{invoice.no_of_items}</td>
                      <td className="text-end">{invoice.qty}</td>
                      <td>
                        <div className="flex flex-row gap-2 justify-center">
                          <button
                            type="button"
                            className="page-icon-btn page-icon-btn-sky"
                            title="Packing List"
                            onClick={() => {
                              setSalesInvoice(invoice);
                              setShowPackingList(true);
                            }}
                          >
                            <i className="bi bi-card-checklist"></i>
                          </button>
                          <button
                            type="button"
                            className="page-icon-btn page-icon-btn-cyan"
                            title="Delivery Challan"
                            onClick={() => {
                              setSalesInvoice(invoice);
                              setShowDeliveryChallan(true);
                            }}
                          >
                            <i className="bi bi-truck"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="page-table-empty">
                      No sales invoices found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;
