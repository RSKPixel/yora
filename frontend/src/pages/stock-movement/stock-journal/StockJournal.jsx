import React from "react";
import DashboardBackLink from "../../../components/DashboardBackLink";

const StockJournal = () => {
  return (
    <div className="page-card">
      <div className="page-card-header">
        <div className="page-card-title">
          <span className="page-card-title-icon">
            <i className="bi bi-journal-text" aria-hidden="true"></i>
          </span>
          Stock Journal
        </div>
        <DashboardBackLink />
      </div>
      <div className="page-card-body">
        <p className="text-xs text-slate-400 normal-case tracking-normal">No stock journal entries yet.</p>
      </div>
    </div>
  );
};

export default StockJournal;
