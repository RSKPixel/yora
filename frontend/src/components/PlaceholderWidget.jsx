const PlaceholderWidget = () => (
  <aside className="dashboard-panel dashboard-placeholder-widget" aria-label="Placeholder widget">
    <div className="dashboard-placeholder-widget-header">
      <p className="dashboard-panel-title">Coming Soon</p>
      <p className="dashboard-panel-subtitle">Reserved for a future metric</p>
    </div>

    <div className="dashboard-placeholder-widget-body">
      <span className="dashboard-placeholder-widget-icon" aria-hidden="true">
        <i className="bi bi-grid-1x2"></i>
      </span>
      <p className="dashboard-placeholder-widget-text">Widget slot 3</p>
    </div>
  </aside>
);

export default PlaceholderWidget;
