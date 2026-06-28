import React from "react";
import { Link } from "react-router-dom";

const DashboardBackLink = () => (
  <Link to="/dashboard" className="page-card-back-link">
    <i className="bi bi-arrow-left" aria-hidden="true" />
    Dashboard
  </Link>
);

export default DashboardBackLink;
