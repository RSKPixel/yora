import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../../templates/AuthContext";
import moment from "moment";
import Loader from "../../components/Loader";

const Sales = () => {
  const { api } = useContext(AuthContext);
  const [salesList, setSalesList] = useState([]);
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
          console.log(data.data);
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
        {salesInvoice && <PackingList salesInvoice={salesInvoice} setSalesInvoice={setSalesInvoice} />}
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
                      <span className="text-blue-500 cursor-pointer hover:text-blue-700"><i onClick={() => setSalesInvoice(invoice)} className="btn btn-secondary bi bi-card-checklist"></i></span>
                      <span className="text-blue-500 cursor-pointer hover:text-blue-700"><i className="btn btn-info bi bi-truck"></i></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};


const PackingList = ({ salesInvoice, setSalesInvoice }) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs z-50">
      <div className="flex flex-col w-3/4 items-center shadow-xl">
        <div className="flex flex-row w-full justify-between items-center px-2 text-sm text-white/50 font-bold z-10 border border-sky-900 py-1 rounded-t-sm bg-sky-950">
          <span>Packing List</span>
          <span>{salesInvoice.invoice_no} | {moment(salesInvoice.invoice_date).format("DD-MM-YYYY")} | {salesInvoice.buyer}</span>
          <span className="text-red-500 cursor-pointer hover:text-red-700"><i className="bi bi-x-lg" onClick={() => setSalesInvoice(null)}></i></span>
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
              {salesInvoice?.details?.map((detail) => (
                <tr key={detail.id} className="border border-gray-600 px-2 py-2">
                  <td className="text-left px-2 py-1 border border-gray-600">{detail.stock_item}</td>
                  <td className="text-end px-2 py-1 border border-gray-600"></td>
                  <td className="text-end px-2 py-1 border border-gray-600"></td>
                  <td className="text-end px-2 py-1 border border-gray-600"></td>
                  <td className="text-end px-2 py-1 border border-gray-600">{detail.qty}</td>
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

export default Sales;
