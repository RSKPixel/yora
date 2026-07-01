import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function applyAutocompleteOff(root = document) {
  root.querySelectorAll("form").forEach((form) => {
    form.setAttribute("autocomplete", "off");
  });

  root.querySelectorAll("input, textarea, select").forEach((field) => {
    field.setAttribute("autocomplete", "off");
  });
}

const FormAutoCompleteGuard = () => {
  const location = useLocation();

  useEffect(() => {
    applyAutocompleteOff();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            applyAutocompleteOff(node);
          }
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [location.pathname]);

  return null;
};

export default FormAutoCompleteGuard;
