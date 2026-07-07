import moment from "moment";

const DISPLAY_FORMAT = "DD-MM-YYYY";

export function formatDisplayDate(value) {
  if (!value) return "—";

  const parsed = moment(value, ["YYYY-MM-DD", moment.ISO_8601], true);
  if (parsed.isValid()) {
    return parsed.format(DISPLAY_FORMAT);
  }

  const fallback = moment(value);
  return fallback.isValid() ? fallback.format(DISPLAY_FORMAT) : String(value);
}

export function formatDisplayDateRange(from, to, { separator = " to " } = {}) {
  if (from && to) {
    return `${formatDisplayDate(from)}${separator}${formatDisplayDate(to)}`;
  }
  if (from) return `from ${formatDisplayDate(from)}`;
  if (to) return `up to ${formatDisplayDate(to)}`;
  return "";
}
