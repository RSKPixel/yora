import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../../templates/AuthContext";
import moment from "moment";
import numeral from "numeral";

const PurchaseCosting = () => {
  const { api } = useContext(AuthContext);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showPendingBills, setShowPendingBills] = useState(false);
  const [costingDetails, setCostingDetails] = useState(null);
  const [costing, setCosting] = useState({
    COSTING_ID: "NEW",
    VNO: "",
    VDT: "",
    VENDOR: "",
    EXPENSES: 0,
    DETAILS: {},
  });

  useEffect(() => {
    if (selectedPurchase) {
      const fd = new FormData();
      fd.append("vno", selectedPurchase.VNO);
      fd.append("vdt", selectedPurchase.VDT);
      fetch(`${api}/purchases/details`, {
        method: "POST",
        body: fd,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.status === "success") {
            setCostingDetails(data.data);
          }
        });
    }
  }, [selectedPurchase]);

  const handleUpdateExpenses = (e) => {
    const transportCost = parseFloat(e.target.value) || 0;

    if (costingDetails) {
      const totalCarton = costingDetails.reduce(
        (sum, item) => sum + item.CARTON,
        0,
      );
      const costPerCarton = totalCarton > 0 ? transportCost / totalCarton : 0;

      const updatedDetails = costingDetails.map((item) => {
        const additionalExpense = (costPerCarton / item.QTY) * item.CARTON;
        return {
          ...item,
          EXPENSES: additionalExpense,
          LANDING_COST: item.COST_PRICE + additionalExpense,
          COST_WITH_GST: item.LANDING_COST * (1 + item.GST / 100),
        };
      });

      setCostingDetails(updatedDetails);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {showPendingBills && (
        <PendingBills
          setSelectedPurchase={setSelectedPurchase}
          setShowPendingBills={setShowPendingBills}
        />
      )}
      <div className="flex flex-col w-full items-center shadow-xl">
        <div className="w-full px-2 text-sm text-white/50 font-bold z-10 border border-sky-900 py-1 rounded-t-sm bg-sky-950">
          Purchase Costing
        </div>

        <div autoComplete="off" className="form-basic ">
          {!selectedPurchase && (
            <>
              <input
                type="button"
                value="Select From Purchase"
                onClick={() => {
                  setShowPendingBills(true);
                }}
              />
              <input type="button" value="Select From Costing" />
            </>
          )}
          {selectedPurchase && costingDetails && (
            <>
              <input
                type="button"
                value="Back to Pending Bills"
                onClick={() => setSelectedPurchase(null)}
                className="mb-2"
              />
              <div className="w-full rounded-md grid grid-cols-2 gap-2 items-center justify-between text-sm border border-gray-600 px-2 py-2 bg-gray-700/50">
                <span className="text-start font-bold">
                  Purchase Costing No
                </span>
                <span className="text-end font-bold">
                  {selectedPurchase && "NEW"}
                </span>
                <span className="text-start font-bold">Voucher Date</span>
                <span className="font-bold text-end">
                  {moment(selectedPurchase.VDT).format("DD-MM-YYYY")}
                </span>
                <span className="text-start font-bold">Voucher No</span>
                <span className="font-bold text-end">
                  {selectedPurchase.VNO}
                </span>
                <span className="text-start font-bold">Vendor</span>
                <span className="font-bold text-end">
                  {selectedPurchase.VENDOR}
                </span>
              </div>
              <div className="w-full rounded-md grid grid-cols-[3fr_1fr] gap-2 items-center justify-baseline text-sm border border-gray-600 px-2 py-1 bg-gray-700/50">
                <label htmlFor="transport">
                  Add: Transport & Handling Expenses
                </label>
                <input
                  type="number"
                  id="transport"
                  onChange={handleUpdateExpenses}
                />
              </div>
              <div className="col-span-2 flex justify-end px-2 py-1">
                <button className="btn btn-success">Update</button>
              </div>
              <div>
                <table className="w-full rounded-2xl text-sm border border-gray-600">
                  <thead>
                    <tr className="border-0 border-gray-600 bg-gray-700/50">
                      <th className="text-left px-2 py-1">Item Name</th>
                      <th className="text-end px-2 py-1">Quantity</th>
                      <th className="text-end px-2 py-1">Carton</th>
                      <th className="text-end px-2 py-1">List Price</th>
                      <th className="text-end px-2 py-1">Cost Price</th>
                      <th className="text-end px-2 py-1">Expenses</th>
                      <th className="text-end px-2 py-1">Landing Cost</th>
                      <th className="text-end px-2 py-1">Cost with GST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costingDetails.map((item, index) => {
                      return (
                        <tr
                          key={item.id}
                          className="border border-gray-600 px-2 py-2"
                        >
                          <td className="text-left px-2 py-1">
                            {item.STOCK_ITEM}
                          </td>
                          <td className="text-end px-2 py-1">
                            {numeral(item.QTY).format("0,0")}
                          </td>
                          <td className="text-end px-2 py-1">
                            {numeral(item.CARTON).format("0,0")}
                          </td>
                          <td className="text-end px-2 py-1">
                            {numeral(item.RATE).format("0,0.00")}
                          </td>
                          <td className="text-end px-2 py-1">
                            {numeral(item.COST_PRICE).format("0,0.00")}
                          </td>
                          <td className="text-end px-2 py-1">
                            {numeral(item.EXPENSES).format("0,0.00")}
                          </td>
                          <td className="text-end px-2 py-1">
                            {numeral(item.LANDING_COST).format("0,0.00")}
                          </td>
                          <td className="text-end px-2 py-1">
                            {numeral(item.COST_WITH_GST).format("0,0.00")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseCosting;

const PendingBills = ({ setSelectedPurchase, setShowPendingBills }) => {
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

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 animate-fade-in">
      <div className="bg-gray-800 border text-sm border-gray-600 rounded shadow-lg w-2/4 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center text-sm border-b py-1 px-1 font-bold bg-amber-800 sticky top-0">
          <span>Pending Costing Bills</span>
          <span
            className="cursor-pointer hover:text-red-600"
            onClick={() => setShowPendingBills(false)}
          >
            ✕
          </span>
        </div>
        <table className="w-full">
          <thead className="bg-gray-700 starting:sticky top-8">
            <tr>
              <th className="text-left px-2 py-1">Voucher Date</th>
              <th className="text-left px-2 py-1">Voucher No</th>
              <th className="text-left px-2 py-1">Vendor</th>
            </tr>
          </thead>
          <tbody>
            {pendingCostingBills.map((bill, index) => {
              const key = `${bill.VNO}-${bill.VDT}`;
              return (
                <tr
                  className="cursor-pointer hover:bg-gray-700/50"
                  key={key}
                  onClick={() => {
                    setSelectedPurchase(bill);
                    setShowPendingBills(false);
                  }}
                >
                  <td className="px-2 py-1">
                    {moment(bill.VDT).format("DD-MM-YYYY")}
                  </td>
                  <td className="px-2 py-1">{bill.VNO}</td>
                  <td className="px-2 py-1">{bill.VENDOR}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
