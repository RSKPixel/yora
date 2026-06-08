import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../../templates/AuthContext";
import moment from "moment";
import numeral from "numeral";

const PurchaseCosting = () => {
  const { api } = useContext(AuthContext);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showPendingBills, setShowPendingBills] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState(null);
  const [purchase, setPurchase] = useState({
    action: "NEW",
    purchase_id: "",
    purchase_date: "",
    vendor: "",
    expenses: 0,
    details: null,
  });

  useEffect(() => {
    if (selectedPurchase) {
      const fd = new FormData();
      fd.append("purchase_id", selectedPurchase.purchase_id);
      fd.append("purchase_date", selectedPurchase.purchase_date);
      fetch(`${api}/purchases/details`, {
        method: "POST",
        body: fd,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.status === "success") {
            setPurchase({
              ...purchase,
              purchase_id: selectedPurchase.purchase_id,
              purchase_date: selectedPurchase.purchase_date,
              vendor: selectedPurchase.vendor,
            });
            setPurchaseDetails(data.data);
          }
        });
    }
  }, [selectedPurchase]);

  const handleUpdateExpenses = (e) => {
    const transportCost = parseFloat(e.target.value) || 0;

    if (purchaseDetails) {
      const totalCarton = purchaseDetails.reduce(
        (sum, item) => sum + item.carton,
        0,
      );
      const costPerCarton = totalCarton > 0 ? transportCost / totalCarton : 0;

      const updatedDetails = purchaseDetails.map((item) => {
        const additionalExpense = (costPerCarton / item.qty) * item.carton;
        return {
          ...item,
          expenses: additionalExpense,
          landing_cost: item.cost_price + additionalExpense,
          cost_with_gst:
            (item.cost_price + additionalExpense) * (1 + item.gst / 100),
        };
      });

      setPurchase({
        ...purchase,
        expenses: transportCost,
        details: updatedDetails,
      });

      setPurchaseDetails(updatedDetails);
    }
  };

  const handleUpdatePurchase = () => {
    const fd = new FormData();
    fd.append("purchase_id", purchase.purchase_id);
    fd.append("purchase_date", purchase.purchase_date);
    fd.append("vendor", purchase.vendor);
    fd.append("expenses", purchase.expenses);
    fd.append("details", JSON.stringify(purchaseDetails));

    console.log(purchaseDetails);
    fetch(`${api}/purchases/update`, {
      method: "POST",
      body: fd,
    })
      .then((response) => response.json())
      .then((data) => {
        // if (data.status === "success") {
        //   setSelectedPurchase(null);
        // }
      });
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
                value="Import From Tally Data"
                onClick={() => {
                  setShowPendingBills(true);
                }}
              />
              <input type="button" value="Select From Costing" />
            </>
          )}
          {selectedPurchase && purchaseDetails && (
            <>
              <input
                type="button"
                value="Back to Pending Bills"
                onClick={() => setSelectedPurchase(null)}
                className="mb-2"
              />
              <div className="w-full rounded-md grid grid-cols-2 gap-2 items-center justify-between text-sm border border-gray-600 px-2 py-2 bg-gray-700/50">
                <span className="text-start font-bold">Purchase ID</span>
                <span className="font-bold text-end">
                  {selectedPurchase.purchase_id}
                </span>
                <span className="text-start font-bold">Purchase Date</span>
                <span className="font-bold text-end">
                  {moment(selectedPurchase.purchase_date).format("DD-MM-YYYY")}
                </span>
                <span className="text-start font-bold">Vendor</span>
                <span className="font-bold text-end">
                  {selectedPurchase.vendor}
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
                <button
                  onClick={handleUpdatePurchase}
                  className="btn btn-success"
                >
                  Update
                </button>
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
                    {purchaseDetails.map((item, index) => {
                      return (
                        <tr
                          key={item.id}
                          className="border border-gray-600 px-2 py-2"
                        >
                          <td className="text-left px-2 py-1">
                            {item.stock_item}
                          </td>
                          <td className="text-end px-2 py-1">
                            {numeral(item.qty).format("0,0")}
                          </td>
                          <td className="text-end px-2 py-1">
                            {numeral(item.carton).format("0,0")}
                          </td>
                          <td className="text-end px-2 py-1">
                            {numeral(item.rate).format("0,0.00")}
                          </td>
                          <td className="text-end px-2 py-1">
                            {numeral(item.cost_price).format("0,0.00")}
                          </td>
                          <td className="text-end px-2 py-1">
                            {numeral(item.expenses).format("0,0.00")}
                          </td>
                          <td className="text-end px-2 py-1">
                            {numeral(item.landing_cost).format("0,0.00")}
                          </td>
                          <td className="text-end px-2 py-1">
                            {numeral(item.cost_with_gst).format("0,0.00")}
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
    fetch(`${api}/purchases/pending-purchase-bills`, {
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
              <th className="text-left px-2 py-1">Purchase Date</th>
              <th className="text-left px-2 py-1">Purchase ID</th>
              <th className="text-left px-2 py-1">Vendor</th>
            </tr>
          </thead>
          <tbody>
            {pendingCostingBills.map((bill, index) => {
              const key = `${bill.purchase_id}-${bill.purchase_date}`;
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
                    {moment(bill.purchase_date).format("DD-MM-YYYY")}
                  </td>
                  <td className="px-2 py-1">{bill.purchase_id}</td>
                  <td className="px-2 py-1">{bill.vendor}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
