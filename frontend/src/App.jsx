import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import "./Buttons.css";
import BasetemplateAi from "./templates/Basetemplate-ai";
import Inventory from "./pages/masters/inventory/Inventory";
import { AuthProvider } from "./templates/AuthContext";
import ProtectedRoute from "./templates/ProtectedRoute";
import Ledger from "./pages/masters/ledger/Ledger";
import Purchase from "./pages/transactions/purchase/Purchase";
import PurchaseOrder from "./pages/transactions/purchase-order/PurchaseOrder";
import PurchaseOrderReport from "./pages/reports/purchase-order/PurchaseOrderReport";
import StockReport from "./pages/reports/stock-report/StockReport";
import Sales from "./pages/transactions/sales/Sales";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  document.title = "YORA ERP";

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <BasetemplateAi>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/masters">
                      <Route
                        path="inventory"
                        element={<Inventory action="NEW" inventoryId={null} />}
                      />
                      <Route path="ledger" element={<Ledger action="NEW" />} />
                    </Route>
                    <Route path="/transactions">
                      <Route path="purchase-order" element={<PurchaseOrder />} />
                      <Route path="purchase" element={<Purchase />} />
                      <Route path="sales" element={<Sales />} />
                    </Route>
                    <Route path="/reports">
                      <Route path="stockposition" element={<StockReport />} />
                      <Route path="purchaseorder" element={<PurchaseOrderReport />} />
                    </Route>
                  </Routes>
                </BasetemplateAi>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
