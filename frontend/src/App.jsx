import { useState } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Basetemplate from "./templates/Basetemplate";
import Basetemplate2 from "./templates/Basetemplete2";
import Inventory from "./pages/masters/inventory/Inventory";

function App() {
  document.title = "YORA (ERP)";
  return (
    <Router>
      <Basetemplate2>
        <Routes>
          <Route path="/" element={<div>Hello World</div>} />
          <Route path="/masters">
            <Route path="inventory" element={<Inventory />} />
          </Route>
        </Routes>
      </Basetemplate2>
    </Router>
  );
}

export default App;
