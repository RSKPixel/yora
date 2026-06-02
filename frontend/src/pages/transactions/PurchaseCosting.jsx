import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../../templates/AuthContext";
import moment from "moment";

const PurchaseCosting = () => {
  const { api } = useContext(AuthContext);
  const [pendingCostingBills, setPendingCostingBills] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [getKey, setGetKey] = useState([]);

  useEffect(() => {
    fetch(`${api}/purchases/pending-costing-bills`, {
      method: "POST",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          const getKey = (bill) => `${bill.vno}-${bill.vdt}`;
          setGetKey(() => getKey);

          setPendingCostingBills(data.data);
        }
      });
  }, []);
  const handleSelect = (bill) => {
    const key = getKey(bill);
    setSelectedKey((prev) => (prev === key ? null : key));
    // call your original handler with the selected bill
    handlePCChange(selectedKey === key ? null : bill);
  };
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
          <div className="bill-list">
            {pendingCostingBills.map((bill) => {
              const key = getKey(bill);
              const isSelected = selectedKey === key;
              return (
                <div
                  key={key}
                  className={`bill-item ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelect(bill)}
                >
                  <span className="vno">{bill.vno}</span>
                  <span className="vendor">{bill.vendor}</span>
                  <span className="vdt">
                    {moment(bill.vdt).format("DD-MM-YYYY")}
                  </span>
                  {isSelected && <CheckIcon />}
                </div>
              );
            })}
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseCosting;
