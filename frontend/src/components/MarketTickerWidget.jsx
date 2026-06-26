import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../templates/AuthContext";

function formatRate(rate) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(rate);
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatUsdPrice(price) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function formatUpdatedAt(isoStr) {
  if (!isoStr) return null;
  const date = new Date(isoStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

const MarketTickerWidget = () => {
  const { api, authFetch } = useContext(AuthContext);
  const [usdInr, setUsdInr] = useState(null);
  const [brentOil, setBrentOil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      authFetch(`${api}/dashboard/usd-inr`, { method: "POST" }).then((res) => res.json()),
      authFetch(`${api}/dashboard/brent-oil`, { method: "POST" }).then((res) => res.json()),
    ])
      .then(([usdInrData, brentData]) => {
        if (cancelled) return;

        const nextErrors = {};

        if (usdInrData.status === "success") {
          setUsdInr(usdInrData.data);
        } else {
          nextErrors.usdInr = usdInrData.message || "Unavailable";
        }

        if (brentData.status === "success") {
          setBrentOil(brentData.data);
        } else {
          nextErrors.brentOil = brentData.message || "Unavailable";
        }

        setErrors(nextErrors);
      })
      .catch(() => {
        if (!cancelled) {
          setErrors({ usdInr: "Unavailable", brentOil: "Unavailable" });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, authFetch]);

  return (
    <aside className="dashboard-panel dashboard-market-ticker" aria-label="Market rates">
      <p className="dashboard-market-ticker-title">Market Rates</p>
      <div className="dashboard-market-ticker-rows">
        <div className="dashboard-market-ticker-row">
          <div className="dashboard-market-ticker-label">
            <i className="bi bi-currency-exchange" aria-hidden="true"></i>
            <span>USD / INR</span>
          </div>
          {loading ? (
            <span className="dashboard-market-ticker-value dashboard-market-ticker-value-loading">—</span>
          ) : errors.usdInr ? (
            <span className="dashboard-market-ticker-error">{errors.usdInr}</span>
          ) : (
            <div className="dashboard-market-ticker-value-wrap">
              <span className="dashboard-market-ticker-value">₹{formatRate(usdInr.rate)}</span>
              {usdInr.date && (
                <span className="dashboard-market-ticker-meta">{formatDate(usdInr.date)}</span>
              )}
            </div>
          )}
        </div>

        <div className="dashboard-market-ticker-row">
          <div className="dashboard-market-ticker-label">
            <i className="bi bi-droplet-fill" aria-hidden="true"></i>
            <span>Brent Crude</span>
          </div>
          {loading ? (
            <span className="dashboard-market-ticker-value dashboard-market-ticker-value-loading">—</span>
          ) : errors.brentOil ? (
            <span className="dashboard-market-ticker-error">{errors.brentOil}</span>
          ) : (
            <div className="dashboard-market-ticker-value-wrap">
              <span className="dashboard-market-ticker-value">${formatUsdPrice(brentOil.price)}</span>
              <span className="dashboard-market-ticker-meta">
                {brentOil.currency}/{brentOil.unit}
                {brentOil.updated_at && ` · ${formatUpdatedAt(brentOil.updated_at)}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default MarketTickerWidget;
