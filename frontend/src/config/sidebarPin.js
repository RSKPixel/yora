export const SIDEBAR_PIN_STORAGE_KEY = "yora_sidebar_pinned";

export function readSidebarPinned() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_PIN_STORAGE_KEY) === "true";
}

export function writeSidebarPinned(pinned) {
  window.localStorage.setItem(SIDEBAR_PIN_STORAGE_KEY, pinned ? "true" : "false");
}
