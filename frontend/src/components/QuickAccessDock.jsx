import React, { useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuickAccess } from "../hooks/useQuickAccess";

const DOCK_BASE_SIZE = 52;
const DOCK_MAX_SCALE = 1.45;
const DOCK_INFLUENCE = 90;

function getDockScale(distance) {
  if (distance >= DOCK_INFLUENCE) return 1;
  const ratio = 1 - distance / DOCK_INFLUENCE;
  return 1 + ratio * (DOCK_MAX_SCALE - 1);
}

const QuickAccessDock = () => {
  const { items, loading, error } = useQuickAccess();
  const dockRef = useRef(null);
  const itemRefs = useRef([]);

  const resetScales = useCallback(() => {
    itemRefs.current.forEach((node) => {
      if (node) node.style.transform = "translateY(0) scale(1)";
    });
  }, []);

  const handleMouseMove = useCallback(
    (event) => {
      const dock = dockRef.current;
      if (!dock) return;

      const mouseX = event.clientX;

      itemRefs.current.forEach((node) => {
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const distance = Math.abs(mouseX - centerX);
        const scale = getDockScale(distance);
        const lift = (scale - 1) * DOCK_BASE_SIZE * 0.35;

        node.style.transform = `translateY(${-lift}px) scale(${scale})`;
      });
    },
    []
  );

  if (loading) {
    return (
      <section className="dashboard-dock-section" aria-label="Quick access">
        <p className="dashboard-dock-hint">Loading quick access…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dashboard-dock-section" aria-label="Quick access">
        <p className="dashboard-dock-error">{error}</p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="dashboard-dock-section" aria-label="Quick access">
        <div className="dashboard-dock-empty">
          <p className="dashboard-dock-empty-text">No quick access items yet.</p>
          <Link to="/clientprofile?tab=quick-access" className="dashboard-dock-empty-link">
            Add items in Settings
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-dock-section" aria-label="Quick access">
      <div
        ref={dockRef}
        className="dashboard-dock"
        onMouseMove={handleMouseMove}
        onMouseLeave={resetScales}
      >
        <div className="dashboard-dock-glass">
          <div className="dashboard-dock-glass-bg" aria-hidden="true">
            <div className="dashboard-dock-shine" />
            <div className="dashboard-dock-reflection" />
          </div>
          <div className="dashboard-dock-items">
            {items.map((item, index) => (
              <Link
                key={item.path}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                to={item.path}
                className="dashboard-dock-item"
                title={item.label}
              >
                <span className="dashboard-dock-icon" aria-hidden="true">
                  <i className={`bi ${item.icon}`} />
                </span>
                <span className="dashboard-dock-label">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default QuickAccessDock;
