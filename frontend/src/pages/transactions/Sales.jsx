import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../../templates/AuthContext";
import moment from "moment";
import Loader from "../../components/Loader";
import DatePeriods from "../../utils/DatePeriods";
import getChecksum from "../../utils/Encrypt";
import PackingList from "./PackingList";

const Sales = () => {
  const { api } = useContext(AuthContext);
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

    fetch(`${api}/sales/sales-list`, {
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
    fetch(`${api}/sales/tally-sales-list`, {
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
    <div className="flex flex-col items-center justify-center w-full">
      <div className="flex flex-col w-full items-center shadow-xl">
        {loading && <Loader message={loadingMessage} />}
        {showPackingList && <PackingList salesInvoice={salesInvoice} setShowPackingList={setShowPackingList} />}
        {showDeliveryChallan && <DeliveryChallan salesInvoice={salesInvoice} setShowDeliveryChallan={setShowDeliveryChallan} setRefresh={setRefresh} refresh={refresh} />}
        <div className="flex flex-row w-full justify-between items-center px-2 text-sm text-white/50 font-bold z-10 border border-sky-900 py-1 rounded-t-sm bg-sky-950">
          <span className="flex flex-row gap-2 items-center">
            <span>Sales</span>
            <i
              className="bi bi-arrow-clockwise cursor-pointer text-lg hover:text-yellow-500"
              onClick={() => loadTallyData()}
            ></i>
          </span>
          <span>
            {moment(periodValue[period].date_from).format("DD-MM-YYYY")} to {moment(periodValue[period].date_to).format("DD-MM-YYYY")}
          </span>
        </div>
        <div className="form-basic">
          <div className="flex flex-row w-full justify-between items-center px-2 text-sm text-white/50 font-bold z-10 border-0 border-sky-900 py-1 rounded-sm">
            <span className="w-fit">Filters</span>
            <span className="flex flex-row gap-2 items-center">
              <select className="w-fit" value={period} onChange={(e) => setPeriod(e.target.value)}>
                {periodOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select className="w-fit" value={filter} onChange={(e) => setFilter(e.target.value)}>
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </span>
          </div>
          <div className="flex flex-col w-full items-center">
            <table className="w-full rounded-2xl text-sm border border-gray-600">
              <thead>
                <tr className="border-0 border-gray-600 bg-gray-700/50">
                  <th className="text-left px-2 py-1">Invoice Date</th>
                  <th className="text-left px-2 py-1">Invoice No</th>
                  <th className="text-left px-2 py-1">Customer</th>
                  <th className="text-end px-2 py-1">No of Items</th>
                  <th className="text-end px-2 py-1">Total Quantity</th>
                  <th className="text-center px-2 py-1">Action</th>
                </tr>
              </thead>
              <tbody>
                {salesList?.map((invoice) => (
                  <tr
                    key={invoice.invoice_no}
                    className="border border-gray-600 px-2 py-2"
                  >
                    <td className="text-left px-2 py-1">
                      {moment(invoice.invoice_date).format("DD-MM-YYYY")}
                    </td>
                    <td className="text-left px-2 py-1">
                      {invoice.invoice_no}
                    </td>
                    <td className="text-left px-2 py-1">{invoice.buyer}</td>
                    <td className="text-end px-2 py-1">{invoice.no_of_items}</td>
                    <td className="text-end px-2 py-1">{invoice.qty}</td>
                    <td className="text-center px-2 py-1 flex flex-row text-lg gap-4 justify-center">
                      <span className="text-blue-500 cursor-pointer hover:text-blue-700"><i onClick={() => { setSalesInvoice(invoice); setShowPackingList(true) }} className="btn btn-secondary bi bi-card-checklist"></i></span>
                      <span className="text-blue-500 cursor-pointer hover:text-blue-700"><i onClick={() => { setSalesInvoice(invoice); setShowDeliveryChallan(true) }} className="btn btn-info bi bi-truck"></i></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div >
  );
};

export default Sales;



const DeliveryChallan = ({ salesInvoice, setShowDeliveryChallan, setRefresh, refresh }) => {

  const { api } = useContext(AuthContext);
  const [formMessage, setFormMessage] = useState(null);
  const [deliveryChallan, setDeliveryChallan] = useState({
    delivery_no: "new",
    invoice_no: salesInvoice.invoice_no,
    invoice_date: salesInvoice.invoice_date,
    buyer: salesInvoice.buyer,
    delivery_date: moment().format("YYYY-MM-DD"),
    delivery_location: "",
    vehicle_no: "",
    driver_name: "",
    delivered_by: "",
  });
  const [invChecksumResult, setInvChecksumResult] = useState(null);


  useEffect(() => {
    const fd = new FormData();
    fd.append("invoice_no", salesInvoice.invoice_no);
    fd.append("invoice_date", salesInvoice.invoice_date);
    fetch(`${api}/delivery/search`, {
      method: "POST",
      body: fd,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          setDeliveryChallan(data.data);
        } else if (data.status === "error") {
          setDeliveryChallan({ ...deliveryChallan, delivery_no: "new" });
        }
      });
  }, []);

  const handleDeliveryChallanChange = (e) => {
    setDeliveryChallan({ ...deliveryChallan, [e.target.name]: e.target.value });
  };

  const handleDeliveryChallanSubmit = () => {
    const fd = new FormData();
    fd.append("delivery_no", deliveryChallan.delivery_no);
    fd.append("delivery_date", deliveryChallan.delivery_date);
    fd.append("invoice_no", deliveryChallan.invoice_no);
    fd.append("invoice_date", deliveryChallan.invoice_date);
    fd.append("buyer", deliveryChallan.buyer);
    fd.append("vehicle_no", deliveryChallan.vehicle_no);
    fd.append("driver_name", deliveryChallan.driver_name);
    fd.append("delivery_location", deliveryChallan.delivery_location);
    fd.append("delivered_by", deliveryChallan.delivered_by);

    const endpoint = deliveryChallan.delivery_no === "new" ? `${api}/delivery/create` : `${api}/delivery/update`;

    fetch(endpoint, {
      method: "POST",
      body: fd,
    })
      .then((response) => response.json())
      .then((data) => {
        setFormMessage({ type: data.status, message: data.message });
        setRefresh(!refresh);
      });

  };

  const handleDelete = () => {
    const fd = new FormData();
    fd.append("delivery_no", deliveryChallan.delivery_no);
    fetch(`${api}/delivery/delete`, {
      method: "POST",
      body: fd,
    })
      .then((response) => response.json())
      .then((data) => {
        setFormMessage({ type: data.status, message: data.message });
        setRefresh(!refresh);
        setShowDeliveryChallan(false);

      });
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="flex flex-col w-2/4 items-center shadow-xl">
        <div className="flex flex-row w-full justify-between items-center px-2 text-sm text-white/50 font-bold z-10 border border-sky-900 py-1 rounded-t-sm bg-sky-900">
          <span>Delivery Challan ({deliveryChallan.delivery_no})</span>

          <span className="text-red-500 cursor-pointer hover:text-red-700"><i className="bi bi-x-lg" onClick={() => setShowDeliveryChallan(false)}></i></span>
        </div>
        <form autoComplete="off" className="form-basic">
          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 w-full">
            <label htmlFor="invoice_no">Invoice No</label>
            <label htmlFor="invoice_date">Invoice Date</label>
            <label htmlFor="buyer">Buyer</label>
            <input type="text" name="invoice_no" value={deliveryChallan.invoice_no} onChange={handleDeliveryChallanChange} disabled />
            <input type="date" name="invoice_date" value={deliveryChallan.invoice_date} onChange={handleDeliveryChallanChange} disabled />
            <input type="text" name="buyer" value={deliveryChallan.buyer} onChange={handleDeliveryChallanChange} disabled />
            <label htmlFor="">Delivery Date</label>
            <label htmlFor="">Vehicle No</label>
            <label htmlFor="">Driver Name</label>
            <input type="date" name="delivery_date" value={deliveryChallan.delivery_date} onChange={handleDeliveryChallanChange} />
            <input type="text" name="vehicle_no" value={deliveryChallan.vehicle_no} onChange={handleDeliveryChallanChange} />
            <input type="text" name="driver_name" value={deliveryChallan.driver_name} onChange={handleDeliveryChallanChange} />
            <label htmlFor="">Delivery Location</label>
            <label className="col-span-2" htmlFor="">Delivered By</label>
            <input type="text" name="delivery_location" value={deliveryChallan.delivery_location} onChange={handleDeliveryChallanChange} />
            <input type="text" name="delivered_by" value={deliveryChallan.delivered_by} onChange={handleDeliveryChallanChange} />
            <span className="flex flex-row gap-2 mt-4 justify-end col-span-3">
              <button type="button" className="btn btn-info w-24 me-auto" onClick={handleDelete} disabled={deliveryChallan.delivery_no === "new"}>Delete</button>
              <button type="button" className="btn btn-primary w-24" onClick={handleDeliveryChallanSubmit}>Submit</button>
              <button type="button" className="btn btn-danger w-24" onClick={() => setShowDeliveryChallan(false)}>Cancel</button>
            </span>
            {formMessage && <div className={`text-xs italic text-center ${formMessage.type === "success" ? "text-green-500" : "text-red-500"}`}>{formMessage.message}</div>}
          </div>
        </form>
      </div>
    </div>
  );

};