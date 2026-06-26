import React, { useContext, useMemo } from "react";
import AuthContext from "../templates/AuthContext";
import SpotlightSearch from "../components/SpotlightSearch";
import { getSpotlightShortcutLabel } from "../config/appMenu";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const Dashboard = () => {
  const { user, company } = useContext(AuthContext);

  const greeting = useMemo(() => getGreeting(), []);
  const shortcutLabel = useMemo(() => getSpotlightShortcutLabel(), []);

  const companyAddress = [company?.address, company?.area, company?.city, company?.state, company?.pincode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="dashboard">
      <header className="dashboard-hero">
        <div className="dashboard-hero-main">
          <p className="dashboard-hero-eyebrow">{greeting}</p>
          <h1 className="dashboard-hero-title">{user?.name || "User"}</h1>
          <p className="dashboard-hero-subtitle">
            Start typing to find a module, or press {shortcutLabel}.
          </p>
        </div>

        <aside className="dashboard-company" aria-label="Company information">
          <div className="dashboard-company-icon" aria-hidden="true">
            <i className="bi bi-building"></i>
          </div>
          <div className="dashboard-company-body">
            <p className="dashboard-company-label">Company</p>
            <p className="dashboard-company-name">{company?.company_name || "Your business"}</p>
            {companyAddress && <p className="dashboard-company-address">{companyAddress}</p>}
            {(company?.email || company?.phone) && (
              <div className="dashboard-company-chips">
                {company?.email && (
                  <span className="dashboard-company-chip">
                    <i className="bi bi-envelope" aria-hidden="true"></i>
                    {company.email}
                  </span>
                )}
                {company?.phone && (
                  <span className="dashboard-company-chip">
                    <i className="bi bi-telephone" aria-hidden="true"></i>
                    {company.phone}
                  </span>
                )}
              </div>
            )}
          </div>
        </aside>
      </header>

      <section className="dashboard-spotlight" aria-label="Module search">
        <SpotlightSearch variant="inline" />
      </section>
    </div>
  );
};

export default Dashboard;
