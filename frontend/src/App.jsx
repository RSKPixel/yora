import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import "./Buttons.css";
import FormAutoCompleteGuard from "./components/FormAutoCompleteGuard";
import BasetemplateAi from "./templates/Basetemplate-ai";
import { AuthProvider } from "./templates/AuthContext";
import ProtectedRoute from "./templates/ProtectedRoute";
import Purchase from "./pages/transactions/purchase/Purchase";
import PurchaseOrder from "./pages/transactions/purchase-order/PurchaseOrder";
import PurchaseOrderReport from "./pages/reports/purchase-order/PurchaseOrderReport";
import PurchaseReport from "./pages/reports/purchase/PurchaseReport";
import StockReport from "./pages/reports/stock-report/StockReport";
import StockSummary from "./pages/reports/stock-report/StockSummary";
import Sales from "./pages/transactions/sales/Sales";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { SettingsRouteRedirect } from "./pages/Settings";
import CostCenter from "./pages/masters/cost-center/CostCenter";
import MouldMaster from "./pages/masters/mould-master/MouldMaster";
import MachineryMaster from "./pages/masters/machinery-master/MachineryMaster";
import MachineryServiceRecorder from "./pages/transactions/machinery-service-recorder/MachineryServiceRecorder";
import StockJournal from "./pages/stock-movement/stock-journal/StockJournal";
import Blowing from "./pages/stock-movement/blowing/Blowing";

function App() {
  document.title = "yora pet";

  return (
    <Router>
      <AuthProvider>
        <FormAutoCompleteGuard />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <BasetemplateAi>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/clientprofile" element={<SettingsRouteRedirect />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/masters">
                      <Route path="cost-center" element={<CostCenter />} />
                      <Route path="mould-master" element={<MouldMaster />} />
                      <Route path="machinery-master" element={<MachineryMaster />} />
                    </Route>
                    <Route path="/transactions">
                      <Route path="purchase-order" element={<PurchaseOrder />} />
                      <Route path="purchase" element={<Purchase />} />
                      <Route path="sales" element={<Sales />} />
                      <Route path="service-record" element={<MachineryServiceRecorder />} />
                    </Route>
                    <Route path="/stock-movement">
                      <Route path="stock-journal" element={<StockJournal />} />
                      <Route path="blowing" element={<Blowing />} />
                    </Route>
                    <Route path="/reports">
                      <Route path="stockposition" element={<StockReport />} />
                      <Route path="stocksummary" element={<StockSummary />} />
                      <Route path="purchaseorder" element={<PurchaseOrderReport />} />
                      <Route path="purchase" element={<PurchaseReport />} />
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
