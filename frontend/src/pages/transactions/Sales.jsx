import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../../templates/AuthContext";
import moment from "moment";

const Sales = () => {
  return <TallySalesImport />;
};

const TallySalesImport = () => {
  const { api } = useContext(AuthContext);
  const [tallySalesList, setTallySalesList] = useState([]);

  useEffect(() => {
    fetch(`${api}/sales/tally-sales-list`, {
      method: "POST",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          setTallySalesList(data.data);
          console.log(data.data);
        }
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="flex flex-col w-full items-center shadow-xl">
        <div className="w-full px-2 text-sm text-white/50 font-bold z-10 border border-sky-900 py-1 rounded-t-sm bg-sky-950">
          Sales
        </div>
        <div className="form-basic">
          <div>Tally Sales Import</div>
          <div className="flex flex-col w-full items-center">
            <table className="w-full rounded-2xl text-sm border border-gray-600">
              <thead>
                <tr className="border-0 border-gray-600 bg-gray-700/50">
                  <th className="text-left px-2 py-1">Invoice Date</th>
                  <th className="text-left px-2 py-1">Invoice No</th>
                  <th className="text-left px-2 py-1">Customer</th>
                  <th className="text-end px-2 py-1">Total Quantity</th>
                </tr>
              </thead>
              <tbody>
                {tallySalesList?.map((invoice) => (
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
                    <td className="text-left px-2 py-1">{invoice.customer}</td>
                    <td className="text-end px-2 py-1">{invoice.qty}</td>
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

export default Sales;
