import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  flattenMenuItems,
  getSpotlightShortcutLabel,
  searchMenuItems,
} from "../config/appMenu";
import { useSpotlight } from "../templates/SpotlightContext";

const ALL_ITEMS = flattenMenuItems();

const SpotlightSearch = ({ variant = "inline", open = false, onClose }) => {
  const navigate = useNavigate();
  const { registerInlineFocus } = useSpotlight();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const shortcutLabel = useMemo(() => getSpotlightShortcutLabel(), []);
  const trimmedQuery = query.trim();
  const showResults = trimmedQuery.length > 0;
  const results = useMemo(
    () => (showResults ? searchMenuItems(ALL_ITEMS, query) : []),
    [query, showResults]
  );
  const isOverlay = variant === "overlay";

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const reset = useCallback(() => {
    setQuery("");
    setActiveIndex(0);
  }, []);

  const close = useCallback(() => {
    reset();
    onClose?.();
  }, [onClose, reset]);

  const goTo = useCallback(
    (path) => {
      navigate(path);
      close();
    },
    [close, navigate]
  );

  useEffect(() => {
    if (variant !== "inline") return undefined;
    return registerInlineFocus(focusInput);
  }, [variant, registerInlineFocus, focusInput]);

  useEffect(() => {
    if (!isOverlay || !open) return undefined;
    focusInput();
    return undefined;
  }, [isOverlay, open, focusInput]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOverlay || !open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOverlay, open, close]);

  useEffect(() => {
    const activeEl = listRef.current?.querySelector("[data-spotlight-active='true']");
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, results.length]);

  const handleKeyDown = (e) => {
    if (!showResults || results.length === 0) {
      if (e.key === "Escape" && isOverlay) {
        e.preventDefault();
        close();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((index) => (index + 1) % Math.max(results.length, 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((index) => (index - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1));
      return;
    }

    if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      goTo(results[activeIndex].path);
      return;
    }

    if (e.key === "Escape" && isOverlay) {
      e.preventDefault();
      close();
    }
  };

  if (isOverlay && !open) return null;

  const panel = (
    <div
      className={`spotlight-panel${isOverlay ? " spotlight-panel-overlay" : " spotlight-panel-inline"}${showResults ? "" : " spotlight-panel-compact"}`}
      role="dialog"
      aria-label="Search modules"
      aria-modal={isOverlay ? "true" : undefined}
    >
      <div className="spotlight-input-wrap">
        <i className="bi bi-search spotlight-input-icon" aria-hidden="true"></i>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search modules…"
          className="spotlight-input"
          autoComplete="off"
          spellCheck={false}
          aria-controls={showResults ? "spotlight-results" : undefined}
          aria-activedescendant={
            showResults && results[activeIndex] ? `spotlight-result-${activeIndex}` : undefined
          }
        />
        {!showResults && (
          <kbd className="spotlight-kbd" aria-hidden="true">
            {shortcutLabel}
          </kbd>
        )}
      </div>

      {showResults && (
        <>
          <div id="spotlight-results" className="spotlight-results" ref={listRef}>
            {results.length === 0 ? (
              <p className="spotlight-empty">No modules match your search.</p>
            ) : (
              <ul className="spotlight-result-list">
                {results.map((item, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <li key={item.path}>
                      <button
                        type="button"
                        id={`spotlight-result-${index}`}
                        data-spotlight-active={isActive}
                        className={`spotlight-result${isActive ? " spotlight-result-active" : ""}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => goTo(item.path)}
                      >
                        <span className="spotlight-result-icon" aria-hidden="true">
                          <i className={`bi ${item.icon}`}></i>
                        </span>
                        <span className="spotlight-result-text">
                          <span className="spotlight-result-label">{item.label}</span>
                          <span className="spotlight-result-meta">{item.section}</span>
                        </span>
                        <i className="bi bi-arrow-return-left spotlight-result-enter" aria-hidden="true"></i>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="spotlight-footer">
            <span>
              <kbd className="spotlight-kbd-sm">↑</kbd>
              <kbd className="spotlight-kbd-sm">↓</kbd>
              navigate
            </span>
            <span>
              <kbd className="spotlight-kbd-sm">↵</kbd>
              open
            </span>
            {isOverlay && (
              <span>
                <kbd className="spotlight-kbd-sm">esc</kbd>
                close
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );

  if (isOverlay) {
    return (
      <div className="spotlight-overlay" onMouseDown={close}>
        <div className="spotlight-overlay-center" onMouseDown={(e) => e.stopPropagation()}>
          {panel}
        </div>
      </div>
    );
  }

  return panel;
};

export default SpotlightSearch;
