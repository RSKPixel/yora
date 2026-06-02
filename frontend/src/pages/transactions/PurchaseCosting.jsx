import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../../templates/AuthContext";
import moment from "moment";

const PurchaseCosting = () => {
  const { api } = useContext(AuthContext);
  const [pendingCostingBills, setPendingCostingBills] = useState([]);

  useEffect(() => {
    fetch(`${api}/purchases/pending-costing-bills`, {
      method: "POST",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          setPendingCostingBills(data.data);
        }
      });
  }, []);

  const handlePCChange = (e) => {
    const selectedVno = e.target.value;
    // Handle the change event, e.g., fetch costing details for the selected bill
    console.log("Selected Bill VNO:", selectedVno);
  };
  return (
    <div className="flex flex-col  items-center justify-center w-full">
      <div className="flex flex-col w-full items-center shadow-xl">
        <div className="w-full px-2 text-sm text-white/50 font-bold z-10 border border-sky-900 py-1 rounded-t-sm bg-sky-950">
          Purchase Costing
        </div>

        <form autoComplete="off" className="form-basic ">
          Pending Costing
          <select className="w-full" onChange={handlePCChange}>
            <option value="">Select Bill</option>
            {pendingCostingBills.map((bill) => (
              <option key={`${bill.vno}-${bill.vdt}`} value={bill.vno}>
                {bill.vno} - {moment(bill.vdt).format("DD-MM-YYYY")} -{" "}
                {bill.vendor}
              </option>
            ))}
          </select>
        </form>
      </div>
    </div>
  );
};

export default PurchaseCosting;
