import React, { useMemo } from "react";
import SpotlightSearch from "../components/SpotlightSearch";
import MarketTickerWidget from "../components/MarketTickerWidget";
import SalesGroupWidget from "../components/SalesGroupWidget";
import PlaceholderWidget from "../components/PlaceholderWidget";
import { getSpotlightShortcutLabel } from "../config/appMenu";

const Dashboard = () => {
  const shortcutLabel = useMemo(() => getSpotlightShortcutLabel(), []);

  return (
    <div className="dashboard">
      <section className="dashboard-main" aria-label="Module search">
        <p className="dashboard-search-hint">Search for a module or press {shortcutLabel}</p>
        <div className="dashboard-spotlight">
          <SpotlightSearch variant="inline" />
        </div>
      </section>

      <section className="dashboard-widgets" aria-label="Dashboard widgets">
        <SalesGroupWidget />
        <MarketTickerWidget />
        <PlaceholderWidget />
      </section>
    </div>
  );
};

export default Dashboard;
