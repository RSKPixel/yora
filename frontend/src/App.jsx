import { useState } from "react";
import "./App.css";
import "./Buttons.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Basetemplate2 from "./templates/Basetemplete2";
import Inventory from "./pages/masters/inventory/Inventory";
import AuthContext from "./templates/AuthContext";
import InventorySearch from "./pages/masters/inventory/InventorySearch";
import Ledger from "./pages/masters/ledger/Ledger";
import PurchaseCosting from "./pages/transactions/PurchaseCosting";
function App() {
  const api = import.meta.env.VITE_API;
  document.title = "YORA (ERP)";

  const provider = {
    api,
  };

  return (
    <Router>
      <AuthContext.Provider value={provider}>
        <Basetemplate2>
          <Routes>
            <Route path="/" element={<div>Hello World</div>} />
            <Route path="/masters">
              <Route
                path="inventory"
                element={<Inventory action="NEW" inventoryId={null} />}
              />
              <Route path="ledger" element={<Ledger action="NEW" />} />
            </Route>
            <Route path="/transactions">
              <Route path="purchasecosting" element={<PurchaseCosting />} />
            </Route>
          </Routes>
        </Basetemplate2>
      </AuthContext.Provider>
    </Router>
  );
}

export default App;
