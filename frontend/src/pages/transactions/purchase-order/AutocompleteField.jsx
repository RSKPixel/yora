import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const AutocompleteField = ({
  value,
  items,
  onSelect,
  getLabel,
  getKey,
  getMeta,
  placeholder,
  className = "w-full min-w-40",
  disabled = false,
}) => {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const updatePosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 2,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;

    updatePosition();

    const onReposition = () => updatePosition();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);

    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, query]);

  const filtered = items
    .filter((item) =>
      getLabel(item).toLowerCase().includes(query.trim().toLowerCase())
    )
    .slice(0, 50);

  const commitSelection = (item) => {
    onSelect(getLabel(item), item);
    setQuery(getLabel(item));
    setOpen(false);
  };

  const handleBlur = () => {
    window.setTimeout(() => {
      setOpen(false);
      const exact = items.find(
        (item) => getLabel(item).toLowerCase() === query.trim().toLowerCase()
      );
      if (exact) {
        commitSelection(exact);
      } else {
        setQuery(value || "");
      }
    }, 150);
  };

  const dropdown =
    open && filtered.length > 0 && position
      ? createPortal(
          <ul
            className="page-autocomplete-list"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
          >
            {filtered.map((item) => (
              <li key={getKey(item)}>
                <button
                  type="button"
                  className="page-autocomplete-option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commitSelection(item)}
                >
                  <span className="truncate">{getLabel(item)}</span>
                  {getMeta?.(item) && (
                    <span className="page-autocomplete-meta shrink-0">{getMeta(item)}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

  return (
    <div className={`page-autocomplete ${className}`}>
      <input
        ref={inputRef}
        type="text"
        className="page-field-input w-full"
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          if (!next.trim()) onSelect("", null);
        }}
        onFocus={() => {
          updatePosition();
          setOpen(true);
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
      />
      {dropdown}
    </div>
  );
};

export default AutocompleteField;
