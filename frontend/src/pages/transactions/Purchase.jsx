import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../../templates/AuthContext";
import moment from "moment";
import numeral from "numeral";

const Purchase = () => {
  const { api } = useContext(AuthContext);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showPendingBills, setShowPendingBills] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formMessage, setFormMessage] = useState(null);
  const [purchase, setPurchase] = useState({});

  useEffect(() => {
    if (showForm) {
      setFormMessage(null);
    }
  }, [showForm]);

  useEffect(() => {
    setFormMessage(null);
    setShowForm(false);
    if (selectedPurchase) {
      const fd = new FormData();
      fd.append("purchase_id", selectedPurchase.purchase_id);
      fd.append("purchase_date", selectedPurchase.purchase_date);
      fetch(`${api}/purchases/tally-details`, {
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
            setShowForm(true);
          }
        });
    }
  }, [selectedPurchase]);

  const handleUpdateExpenses = (e) => {
    const transportCost = parseFloat(e.target.value) || 0;
    setFormMessage(null);

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

      setPurchase((prev) => ({
        ...prev,
        expenses: transportCost,
        details: updatedDetails,
      }));

      setPurchaseDetails(updatedDetails);
    }
  };

  const handleUpdatePurchase = () => {
    const fd = new FormData();
    setFormMessage(null);
    fd.append("purchase_id", purchase.purchase_id);
    fd.append("purchase_date", purchase.purchase_date);
    fd.append("vendor", purchase.vendor);
    fd.append("expenses", purchase.expenses);
    fd.append("details", JSON.stringify(purchaseDetails));

    fetch(`${api}/purchases/update`, {
      method: "POST",
      body: fd,
    })
      .then((response) => response.json())
      .then((data) => {
        setFormMessage({ message: data.message, type: data.status });
      });
  };
  return (
    <div className="flex flex-col items-center justify-center w-full">
      {showPendingBills && (
        <TallyPendingBills
          setSelectedPurchase={setSelectedPurchase}
          setShowPendingBills={setShowPendingBills}
          setShowForm={setShowForm}
        />
      )}
      <div className="flex flex-col w-full items-center shadow-xl">
        <div className="w-full px-2 text-sm text-white/50 font-bold z-10 border border-sky-900 py-1 rounded-t-sm bg-sky-950">
          Purchase
        </div>

        <div autoComplete="off" className="form-basic ">
          {!selectedPurchase && !showForm && (
            <PurchasesList
              setShowPendingBills={setShowPendingBills}
              setPurchase={setPurchase}
              setPurchaseDetails={setPurchaseDetails}
              setShowForm={setShowForm}
            />
          )}
          {showForm && purchase && (
            <>
              <input
                type="button"
                value="Back to Pending Bills"
                onClick={() => {
                  setSelectedPurchase(null);
                  setShowForm(false);
                  setPurchase(null);
                  setPurchaseDetails(null);
                }}
                className="mb-2"
              />
              <div className="w-full rounded-md grid grid-cols-2 gap-2 items-center justify-between text-sm border border-gray-600 px-2 py-2 bg-gray-700/50">
                <span className="text-start font-bold">Purchase ID</span>
                <span className="font-bold text-end">
                  {purchase.purchase_id}
                </span>
                <span className="text-start font-bold">Purchase Date</span>
                <span className="font-bold text-end">
                  {moment(purchase.purchase_date).format("DD-MM-YYYY")}
                </span>
                <span className="text-start font-bold">Vendor</span>
                <span className="font-bold text-end">{purchase.vendor}</span>
                <span>Total Cartons</span>
                <span className="font-bold text-end">
                  {numeral(purchase.carton).format("0,0")}
                </span>
                <span>Total Quantity</span>
                <span className="font-bold text-end">
                  {numeral(purchase.qty).format("0,0")}
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
                  value={purchase.expenses || 0}
                />
              </div>
              <div className="col-span-2 flex flex-row items-center justify-end px-2 py-1 gap-2">
                <button
                  onClick={handleUpdatePurchase}
                  className="btn btn-success"
                >
                  Update
                </button>
              </div>
              <div className="col-span-2 flex flex-row items-center justify-end px-2">
                {formMessage && (
                  <div
                    className={`${formMessage.type === "success" ? "text-green-500" : "text-red-500"} text-xs italic text-center`}
                  >
                    {formMessage.message}
                  </div>
                )}
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
                    {purchase &&
                      purchaseDetails &&
                      purchaseDetails.map((item, index) => {
                        return (
                          <tr
                            key={index}
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
                              {numeral(item.list_price).format("0,0.00")}
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

export default Purchase;

const TallyPendingBills = ({
  setSelectedPurchase,
  setShowPendingBills,
  setShowForm,
}) => {
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
          <span>Tally Data Pending Import</span>
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
                    setShowForm(true);
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

const PurchasesList = ({
  setShowPendingBills,
  setPurchase,
  setPurchaseDetails,
  setShowForm,
}) => {
  const { api } = useContext(AuthContext);
  const [purchasesList, setPurchasesList] = useState([]);
  const [period, setPeriod] = useState({
    date_from: moment().startOf("year").add(3, "months").format("YYYY-MM-DD"),
    date_to: moment().endOf("year").add(3, "months").format("YYYY-MM-DD"),
    details: false,
  });
  const [refresh, setRefresh] = useState(false);

  const handleDateChange = (e) => {
    setPeriod({ ...period, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const fd = new FormData();
    fd.append("date_from", period.date_from);
    fd.append("date_to", period.date_to);
    fd.append("details", period.details);

    fetch(`${api}/purchases/list`, {
      method: "POST",
      body: fd,
    })
      .then((response) => response.json())
      .then((data) => {
        setPurchasesList(data.data);
      });
  }, [refresh]);

  const handleModifyPurchase = (p) => {
    const fd = new FormData();
    fd.append("purchase_id", p.purchase_id);
    fd.append("purchase_date", p.purchase_date);
    fetch(`${api}/purchases/fetch`, {
      method: "POST",
      body: fd,
    })
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
      {purchasesList.length > 0 && (
        <div className="flex flex-col w-full gap-2">
          <div className="flex flex-row w-full justify-end gap-2 border border-gray-600 rounded-md px-2 py-2 bg-gray-700/50">
            <i
              className="bi bi-box-arrow-in-down cursor-pointer text-lg"
              onClick={() => {
                setShowPendingBills(true);
              }}
            ></i>
            <span className="ms-auto"></span>
            <input
              className="w-fit"
              type="date"
              name="date_from"
              value={period.date_from}
              onChange={handleDateChange}
            />
            <input
              className="w-fit"
              type="date"
              name="date_to"
              value={period.date_to}
              onChange={handleDateChange}
            />
            <i
              className="bi bi-search text-blue-500 text-lg cursor-pointer hover:text-blue-800"
              onClick={() => setRefresh(!refresh)}
            ></i>
          </div>

          <table className="w-full rounded-2xl text-sm border border-gray-600">
            <thead>
              <tr className="border-0 border-gray-600 bg-gray-700/50">
                <th className="text-left px-2 py-1">Purchase Date</th>
                <th className="text-left px-2 py-1">Purchase ID</th>
                <th className="text-left px-2 py-1">Vendor</th>
                <th className="text-end px-2 py-1">Expenses</th>
                <th className="text-end px-2 py-1">Qty</th>
                <th className="text-end px-2 py-1">Carton</th>
                <th className="text-end px-2 py-1">Action</th>
              </tr>
            </thead>
            <tbody>
              {purchasesList.map((purchase, index) => {
                return (
                  <tr
                    key={index}
                    className="border border-gray-600 px-2 py-2 hover:bg-gray-700/70 cursor-pointer"
                  >
                    <td className="text-left px-2 py-1">
                      {moment(purchase.purchase_date).format("DD-MM-YYYY")}
                    </td>
                    <td className="text-left px-2 py-1">
                      {purchase.purchase_id}
                    </td>
                    <td className="text-left px-2 py-1">{purchase.vendor}</td>
                    <td className="text-end px-2 py-1">
                      {numeral(purchase.expenses).format("0,0.00")}
                    </td>
                    <td className="text-end px-2 py-1">
                      {numeral(purchase.qty).format("0,0")}
                    </td>
                    <td className="text-end px-2 py-1">
                      {numeral(purchase.carton).format("0,0")}
                    </td>
                    <td className="text-end px-2 py-1 flex flex-row gap-2 justify-end">
                      <i
                        className="bi bi-pencil-square text-xl text-blue-500 cursor-pointer hover:text-blue-700"
                        onClick={() => handleModifyPurchase(purchase)}
                      ></i>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};
