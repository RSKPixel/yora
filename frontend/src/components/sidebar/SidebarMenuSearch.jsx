import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { flattenSubMenuItems, searchMenuItems } from "../../config/appMenu";

const SidebarMenuSearch = forwardRef(function SidebarMenuSearch(
  { menu, onNavigate, onSelectPath },
  ref
) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus() {
      inputRef.current?.focus();
    },
  }));

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const subMenuItems = useMemo(() => flattenSubMenuItems(menu), [menu]);
  const trimmedQuery = query.trim();
  const results = useMemo(
    () => (trimmedQuery ? searchMenuItems(subMenuItems, query) : []),
    [subMenuItems, query, trimmedQuery]
  );
  const showResults = open && trimmedQuery.length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const clearSearch = useCallback(() => {
    setQuery("");
    setActiveIndex(0);
    setOpen(false);
  }, []);

  const selectItem = useCallback(
    (path) => {
      onSelectPath?.(path);
      navigate(path);
      clearSearch();
      onNavigate?.();
    },
    [navigate, clearSearch, onNavigate, onSelectPath]
  );

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      clearSearch();
      inputRef.current?.blur();
      return;
    }

    if (!showResults || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = results[activeIndex];
      if (item) {
        selectItem(item.path);
      }
    }
  };

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className="app-shell-sidebar-search-wrap" ref={wrapRef}>
      <span className="app-shell-sidebar-search-icon" aria-hidden="true">
        <i className="bi bi-search"></i>
      </span>
      <input
        ref={inputRef}
        type="search"
        className="app-shell-sidebar-search-input"
        value={query}
        placeholder="Find module…"
        aria-label="Search modules"
        aria-expanded={showResults}
        aria-controls="app-shell-sidebar-search-results"
        aria-autocomplete="list"
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {query && (
        <button
          type="button"
          className="app-shell-sidebar-search-clear"
          onClick={clearSearch}
          aria-label="Clear search"
        >
          <i className="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      )}

      {showResults && (
        <ul
          id="app-shell-sidebar-search-results"
          className="app-shell-sidebar-search-results"
          role="listbox"
        >
          {results.length === 0 ? (
            <li className="app-shell-sidebar-search-empty">No modules match.</li>
          ) : (
            results.map((item, index) => {
              const isActive = index === activeIndex;

              return (
                <li key={item.path} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    className={`app-shell-sidebar-search-result${
                      isActive ? " app-shell-sidebar-search-result-active" : ""
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectItem(item.path)}
                  >
                    <span className="app-shell-sidebar-search-result-icon" aria-hidden="true">
                      <i className={`bi ${item.icon}`}></i>
                    </span>
                    <span className="app-shell-sidebar-search-result-copy">
                      <span className="app-shell-sidebar-search-result-label">{item.label}</span>
                      <span className="app-shell-sidebar-search-result-section">{item.section}</span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
});

export default SidebarMenuSearch;
