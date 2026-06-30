import React from "react";
import DashboardBackLink from "../../../components/DashboardBackLink";

const Blowing = () => {
  return (
    <div className="page-card">
      <div className="page-card-header">
        <div className="page-card-title">
          <span className="page-card-title-icon">
            <i className="bi bi-wind" aria-hidden="true"></i>
          </span>
          Blowing
        </div>
        <DashboardBackLink />
      </div>
      <div className="page-card-body">
        <p className="text-xs text-slate-400 normal-case tracking-normal">No blowing entries yet.</p>
      </div>
    </div>
  );
};

export default Blowing;
