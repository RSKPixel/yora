import { useState } from "react";
import "./App.css";
import "./Buttons.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Basetemplate2 from "./templates/Basetemplete2";
import Inventory from "./pages/masters/inventory/Inventory";
import AuthContext from "./templates/AuthContext";
import InventorySearch from "./pages/masters/inventory/InventorySearch";

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
              <Route path="inventory/search" element={<InventorySearch />} />
            </Route>
          </Routes>
        </Basetemplate2>
      </AuthContext.Provider>
    </Router>
  );
}

export default App;
