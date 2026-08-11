const decimalPlaces = (value) => {
  const text = String(value);
  return text.includes(".") ? text.split(".")[1].length : 0;
};

export function normalizeRangeValue(
  value,
  { min, max, step = 1, fallback },
) {
  if (typeof value === "string" && value.trim() === "") return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;

  const minimum = Number(min);
  const maximum = Number(max);
  const increment = Number(step);
  const clamped = Math.min(maximum, Math.max(minimum, numeric));
  if (!Number.isFinite(increment) || increment <= 0) return clamped;

  const precision = Math.max(
    decimalPlaces(minimum),
    decimalPlaces(maximum),
    decimalPlaces(increment),
  );
  const snapped = minimum + Math.round((clamped - minimum) / increment) * increment;
  return Math.min(maximum, Math.max(minimum, Number(snapped.toFixed(precision))));
}
