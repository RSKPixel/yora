import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../../templates/AuthContext";
import moment from "moment";
import Loader from "../../components/Loader";

const Sales = () => {
  const { api } = useContext(AuthContext);
  const [salesList, setSalesList] = useState([]);
  const [showPackingList, setShowPackingList] = useState(false);
  const [showDeliveryChallan, setShowDeliveryChallan] = useState(false);
  const [salesInvoice, setSalesInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    fetch(`${api}/sales/sales-list`, {
      method: "POST",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          setSalesList(data.data);
        }
      });
  }, [refresh]);

  const loadTallyData = () => {
    setLoading(true);
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
        {loading && <Loader message="Loading Tally data..." />}
        {/* {salesInvoice && <PackingList salesInvoice={salesInvoice} setSalesInvoice={setSalesInvoice} />} */}
        {showPackingList && <PackingList salesInvoice={salesInvoice} setShowPackingList={setShowPackingList} />}
        {showDeliveryChallan && <DeliveryChallan salesInvoice={salesInvoice} setShowDeliveryChallan={setShowDeliveryChallan} />}
        <div className="flex flex-row w-full justify-between items-center px-2 text-sm text-white/50 font-bold z-10 border border-sky-900 py-1 rounded-t-sm bg-sky-950">
          <span>Sales</span>
          <i
            className="bi bi-arrow-clockwise cursor-pointer text-lg hover:text-yellow-500"
            onClick={() => loadTallyData()}
          ></i>
        </div>
        <div className="form-basic">
          <div>Sales Data</div>
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

const PackingList = ({ salesInvoice, setShowPackingList }) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs z-50">
      <div className="flex flex-col w-3/4 items-center shadow-xl">
        <div className="flex flex-row w-full justify-between items-center px-2 text-sm text-white/50 font-bold z-10 border border-sky-900 py-1 rounded-t-sm bg-sky-950">
          <span>Packing List</span>
          <span>{salesInvoice.invoice_no} | {moment(salesInvoice.invoice_date).format("DD-MM-YYYY")} | {salesInvoice.buyer}</span>
          <span className="text-red-500 cursor-pointer hover:text-red-700"><i className="bi bi-x-lg" onClick={() => setShowPackingList(false)}></i></span>
        </div>
        <div className="form-basic">
          <table className="w-full rounded-2xl text-sm border border-gray-600">
            <thead>
              <tr className="border-0 border-gray-600 bg-gray-700/50">
                <th className="text-left px-2 py-1 border border-gray-600">Stock Item</th>
                <th className="text-left px-2 py-1 border border-gray-600">Carton</th>
                <th className="text-left px-2 py-1 border border-gray-600">Qty / Carton</th>
                <th className="text-left px-2 py-1 border border-gray-600">Total Qty</th>
                <th className="text-end px-2 py-1 border border-gray-600">Quantity</th>
                <th className="text-end px-2 py-1 border border-gray-600">Difference</th>
              </tr>
            </thead>
            <tbody>
              {salesInvoice?.details?.map((details, index) => (
                <tr key={salesInvoice.invoice_no + details.stock_item + details.item_no} className="border border-gray-600 px-2 py-2">
                  <td className="text-left px-2 py-1 border border-gray-600">{details.stock_item}</td>
                  <td className="text-end px-2 py-1 border border-gray-600"></td>
                  <td className="text-end px-2 py-1 border border-gray-600"></td>
                  <td className="text-end px-2 py-1 border border-gray-600"></td>
                  <td className="text-end px-2 py-1 border border-gray-600">{details.qty}</td>
                  <td className="text-end px-2 py-1 border border-gray-600"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const DeliveryChallan = ({ salesInvoice, setShowDeliveryChallan }) => {

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
      });

  };
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs z-50">
      <div className="flex flex-col w-2/4 items-center shadow-xl">
        <div className="flex flex-row w-full justify-between items-center px-2 text-sm text-white/50 font-bold z-10 border border-sky-900 py-1 rounded-t-sm bg-sky-950">
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