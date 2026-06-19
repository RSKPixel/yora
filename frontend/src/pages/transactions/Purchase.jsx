import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../../templates/AuthContext";
import PurchasesList from "./PurchasesList";
import TallyPendingBills from "./TallyPendingBills";
import PurchaseForm from "./PurchaseForm";

const Purchase = () => {
  const { api, authFetch } = useContext(AuthContext);
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
    if (!selectedPurchase) return;

    const fd = new FormData();
    fd.append("purchase_id", selectedPurchase.purchase_id);
    fd.append("purchase_date", selectedPurchase.purchase_date);
    authFetch(`${api}/purchases/tally-details`, {
      method: "POST",
      body: fd,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          setPurchase({
            purchase_id: selectedPurchase.purchase_id,
            purchase_date: selectedPurchase.purchase_date,
            vendor: selectedPurchase.vendor,
          });
          setPurchaseDetails(data.data);
          setShowForm(true);
        }
      });
  }, [selectedPurchase, api]);

  const handleUpdateExpenses = (e) => {
    const transportCost = parseFloat(e.target.value) || 0;
    setFormMessage(null);

    if (!purchaseDetails) return;

    const totalCarton = purchaseDetails.reduce((sum, item) => sum + item.carton, 0);
    const costPerCarton = totalCarton > 0 ? transportCost / totalCarton : 0;

    const updatedDetails = purchaseDetails.map((item) => {
      const additionalExpense = (costPerCarton / item.qty) * item.carton;
      return {
        ...item,
        expenses: additionalExpense,
        landing_cost: item.cost_price + additionalExpense,
        cost_with_gst: (item.cost_price + additionalExpense) * (1 + item.gst / 100),
      };
    });

    setPurchase((prev) => ({
      ...prev,
      expenses: transportCost,
      details: updatedDetails,
    }));
    setPurchaseDetails(updatedDetails);
  };

  const handleUpdatePurchase = () => {
    setFormMessage(null);
    const fd = new FormData();
    fd.append("purchase_id", purchase.purchase_id);
    fd.append("purchase_date", purchase.purchase_date);
    fd.append("vendor", purchase.vendor);
    fd.append("expenses", purchase.expenses);
    fd.append("details", JSON.stringify(purchaseDetails));

    authFetch(`${api}/purchases/update`, { method: "POST", body: fd })
      .then((response) => response.json())
      .then((data) => {
        setFormMessage({ message: data.message, type: data.status });
      });
  };

  const handleBackToList = () => {
    setSelectedPurchase(null);
    setShowForm(false);
    setPurchase({});
    setPurchaseDetails(null);
  };

  return (
    <div className="w-full">
      {showPendingBills && (
        <TallyPendingBills
          setSelectedPurchase={setSelectedPurchase}
          setShowPendingBills={setShowPendingBills}
          setShowForm={setShowForm}
        />
      )}

      <div className="page-card">
        <div className="page-card-header">
          <div>
            <div className="page-card-title">
              <span className="page-card-title-icon">
                <i className="bi bi-cart-plus"></i>
              </span>
              Purchase
            </div>
            <p className="page-card-subtitle mt-0.5 ps-10">
              {showForm ? "Update costing & expenses" : "Manage purchase bills"}
            </p>
          </div>
        </div>

        <div className="page-card-body">
          {!showForm ? (
            <PurchasesList
              setShowPendingBills={setShowPendingBills}
              setPurchase={setPurchase}
              setPurchaseDetails={setPurchaseDetails}
              setShowForm={setShowForm}
            />
          ) : (
            <PurchaseForm
              purchase={purchase}
              purchaseDetails={purchaseDetails}
              formMessage={formMessage}
              onBack={handleBackToList}
              onUpdateExpenses={handleUpdateExpenses}
              onUpdatePurchase={handleUpdatePurchase}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Purchase;
