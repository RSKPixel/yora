import React, { useContext } from "react";
import { Link } from "react-router-dom";
import AuthContext from "../templates/AuthContext";

const quickLinks = [
  { label: "Inventory", path: "/masters/inventory", icon: "bi-box", section: "Masters" },
  { label: "Ledger", path: "/masters/ledger", icon: "bi-journal-text", section: "Masters" },
  {
    label: "Purchase Order",
    path: "/transactions/purchase-order",
    icon: "bi-clipboard-check",
    section: "Transactions",
  },
  { label: "Purchase", path: "/transactions/purchase", icon: "bi-cart-plus", section: "Transactions" },
  { label: "Sales", path: "/transactions/sales", icon: "bi-receipt", section: "Transactions" },
  {
    label: "Purchase Order Report",
    path: "/reports/purchaseorder",
    icon: "bi-file-earmark-bar-graph",
    section: "Reports",
  },
];

const Dashboard = () => {
  const { user, company } = useContext(AuthContext);

  const companyLocation = [company?.city, company?.state].filter(Boolean).join(", ");

  return (
    <div className="w-full space-y-4">
      <div className="page-card">
        <div className="page-card-header">
          <div>
            <div className="page-card-title">
              <span className="page-card-title-icon">
                <i className="bi bi-speedometer2"></i>
              </span>
              Dashboard
            </div>
            <p className="page-card-subtitle mt-0.5 ps-10">
              Welcome back, {user?.name || "User"}
            </p>
          </div>
        </div>

        <div className="page-card-body">
          <div className="dashboard-welcome">
            <div className="dashboard-welcome-main">
              <span className="dashboard-welcome-icon" aria-hidden="true">
                <i className="bi bi-building"></i>
              </span>
              <div>
                <p className="dashboard-welcome-label">Company</p>
                <p className="dashboard-welcome-value">
                  {company?.company_name || "Your business"}
                </p>
                {companyLocation && (
                  <p className="dashboard-welcome-meta">{companyLocation}</p>
                )}
              </div>
            </div>
            {(company?.email || company?.phone) && (
              <div className="dashboard-welcome-contact">
                {company?.email && (
                  <span className="dashboard-welcome-contact-item">
                    <i className="bi bi-envelope"></i>
                    {company.email}
                  </span>
                )}
                {company?.phone && (
                  <span className="dashboard-welcome-contact-item">
                    <i className="bi bi-telephone"></i>
                    {company.phone}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-card">
        <div className="page-card-header">
          <div>
            <div className="page-card-title">
              <span className="page-card-title-icon">
                <i className="bi bi-grid"></i>
              </span>
              Quick Access
            </div>
            <p className="page-card-subtitle mt-0.5 ps-10">
              Jump to frequently used modules
            </p>
          </div>
        </div>

        <div className="page-card-body">
          <div className="dashboard-quick-links">
            {quickLinks.map((link) => (
              <Link key={link.path} to={link.path} className="dashboard-quick-link">
                <span className="dashboard-quick-link-icon" aria-hidden="true">
                  <i className={`bi ${link.icon}`}></i>
                </span>
                <span className="min-w-0">
                  <span className="dashboard-quick-link-section">{link.section}</span>
                  <span className="dashboard-quick-link-label">{link.label}</span>
                </span>
                <i className="bi bi-chevron-right dashboard-quick-link-arrow" aria-hidden="true"></i>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
