export const ROOT_FONT_SIZE_MIN = 15;
export const ROOT_FONT_SIZE_MAX = 18;
export const ROOT_FONT_SIZE_DEFAULT = 17;
export const ROOT_FONT_SIZE_STEP = 0.5;
export const ROOT_FONT_SIZE_STORAGE_KEY = "yora_root_font_size";

export function normalizeRootFontSize(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return ROOT_FONT_SIZE_DEFAULT;
  }

  const stepped = Math.round(parsed / ROOT_FONT_SIZE_STEP) * ROOT_FONT_SIZE_STEP;
  return Math.min(ROOT_FONT_SIZE_MAX, Math.max(ROOT_FONT_SIZE_MIN, stepped));
}

export function readStoredRootFontSize() {
  if (typeof window === "undefined") {
    return ROOT_FONT_SIZE_DEFAULT;
  }

  return normalizeRootFontSize(
    window.localStorage.getItem(ROOT_FONT_SIZE_STORAGE_KEY) ?? ROOT_FONT_SIZE_DEFAULT
  );
}

export function applyRootFontSize(size) {
  if (typeof document === "undefined") {
    return normalizeRootFontSize(size);
  }

  const normalized = normalizeRootFontSize(size);
  document.documentElement.style.fontSize = `${normalized}px`;
  return normalized;
}

export function writeStoredRootFontSize(size) {
  const normalized = normalizeRootFontSize(size);
  window.localStorage.setItem(ROOT_FONT_SIZE_STORAGE_KEY, String(normalized));
  applyRootFontSize(normalized);
  return normalized;
}
